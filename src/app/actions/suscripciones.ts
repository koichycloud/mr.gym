'use server'

import prisma from '@/lib/prisma'
import { addDays, addMonths } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { suscripcionSchema } from '@/lib/validations'
import { z } from 'zod'
import { logAction } from '@/lib/audit'
import { getLimaStartOfDay } from '@/lib/date-utils'

export async function getExpiringSubscriptions() {
    const today = getLimaStartOfDay()
    const limitDate = addDays(today, 10)

    const socios = await prisma.socio.findMany({
        where: {
            suscripciones: {
                some: {
                    estado: 'ACTIVA',
                    fechaFin: {
                        lte: limitDate,
                        gte: today
                    }
                },
                none: {
                    fechaFin: {
                        gt: limitDate
                    }
                }
            }
        },
        include: {
            suscripciones: {
                orderBy: { fechaFin: 'desc' },
                take: 1
            }
        }
    })

    const subscriptions = socios.map(socio => {
        const latestSub = socio.suscripciones[0]!
        const { suscripciones, ...socioData } = socio
        return {
            ...latestSub,
            socio: socioData
        }
    })

    subscriptions.sort((a: any, b: any) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime())

    return subscriptions
}

export async function getExpiredSubscriptions() {
    const today = getLimaStartOfDay()

    const socios = await prisma.socio.findMany({
        where: {
            suscripciones: {
                some: {},
                every: {
                    fechaFin: { lt: today }
                }
            }
        },
        include: {
            suscripciones: {
                orderBy: { fechaFin: 'desc' },
                take: 1
            }
        }
    })

    const subscriptions = socios.map(socio => {
        const latestSub = socio.suscripciones[0]!
        const { suscripciones, ...socioData } = socio
        return {
            ...latestSub,
            socio: socioData
        }
    })

    subscriptions.sort((a: any, b: any) => new Date(b.fechaFin).getTime() - new Date(a.fechaFin).getTime())

    return subscriptions
}

export async function createSubscription(
    data: z.infer<typeof suscripcionSchema>,
    pagoInfo?: { 
        monto: number; 
        metodoPago: string; 
        nombrePlan?: string;
        montoEfectivo?: number;
        montoTransferencia?: number;
        montoYape?: number;
        montoPlin?: number;
    }
) {
    try {
        await requireAuth() // 🔒 Protected

        const validation = suscripcionSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const validData = validation.data
        const currentSocio = await prisma.socio.findUnique({
            where: { id: validData.socioId },
            include: {
                suscripciones: { orderBy: { fechaInicio: 'desc' }, take: 1 }
            }
        })

        const previousCode = currentSocio?.codigo
        const newCode = validData.nuevoCodigo || previousCode

        // If the code is actually changing during this renewal, save history and update main Socio
        if (previousCode && newCode && previousCode !== newCode) {
            await prisma.codigoHistorial.create({
                data: {
                    socioId: validData.socioId,
                    codigo: previousCode,
                    fechaCambio: validData.fechaInicio
                }
            })

            await prisma.socio.update({
                where: { id: validData.socioId },
                data: { codigo: newCode }
            })
        }

        const subscription = await prisma.suscripcion.create({
            data: {
                socioId: validData.socioId,
                planId: validData.planId,
                meses: validData.meses,
                fechaInicio: validData.fechaInicio,
                fechaFin: validData.fechaFin,
                estado: 'ACTIVA',
                // Use new code if provided, otherwise use the socio's current code
                codigo: validData.nuevoCodigo || currentSocio?.codigo
            }
        })

        // Auto-register payment if payment info provided
        if (pagoInfo) {
            const { montoEfectivo, montoTransferencia, montoYape, montoPlin } = pagoInfo;
            const hasMixed = (montoEfectivo && montoEfectivo > 0) || 
                              (montoTransferencia && montoTransferencia > 0) || 
                              (montoYape && montoYape > 0) || 
                              (montoPlin && montoPlin > 0);

            if (hasMixed) {
                const mixedPayments = [
                    { metodo: 'EFECTIVO', amount: montoEfectivo },
                    { metodo: 'TRANSFERENCIA', amount: montoTransferencia },
                    { metodo: 'YAPE', amount: montoYape },
                    { metodo: 'PLIN', amount: montoPlin }
                ];
                for (const mp of mixedPayments) {
                    if (mp.amount && mp.amount > 0) {
                        try {
                            await prisma.pago.create({
                                data: {
                                    socioId: validData.socioId,
                                    suscripcionId: subscription.id,
                                    monto: mp.amount,
                                    metodoPago: mp.metodo,
                                    concepto: 'SUSCRIPCION',
                                    descripcion: pagoInfo.nombrePlan ? `Venta Mixta: ${pagoInfo.nombrePlan} (${validData.meses} mes/es)` : `Suscripción Mixta ${validData.meses} mes(es)`
                                }
                            });
                        } catch (pagoError) {
                            console.error('Error registrando pago automático mixto:', pagoError);
                        }
                    }
                }
            } else if (pagoInfo.monto > 0) {
                try {
                    await prisma.pago.create({
                        data: {
                            socioId: validData.socioId,
                            suscripcionId: subscription.id,
                            monto: pagoInfo.monto,
                            metodoPago: pagoInfo.metodoPago || 'EFECTIVO',
                            concepto: 'SUSCRIPCION',
                            descripcion: pagoInfo.nombrePlan ? `Venta: ${pagoInfo.nombrePlan} (${validData.meses} mes/es)` : `Suscripción ${validData.meses} mes(es)`
                        }
                    })
                } catch (pagoError) {
                    console.error('Error registrando pago automático:', pagoError)
                }
            }
        }

        revalidatePath('/')
        revalidatePath('/socios')
        revalidatePath('/caja')
        revalidatePath(`/socios/${validData.socioId}`)

        const fmtDate = (d: Date) => d.toLocaleDateString('es-PE')
        const planDesc = pagoInfo?.nombrePlan ? ` | Plan: ${pagoInfo.nombrePlan}` : ''
        const montoDesc = pagoInfo?.monto ? ` | Monto: S/ ${pagoInfo.monto.toFixed(2)} (${pagoInfo.metodoPago})` : ''
        const newCodeDesc = validData.nuevoCodigo && validData.nuevoCodigo !== currentSocio?.codigo ? ` | Código anterior: ${currentSocio?.codigo} → ${validData.nuevoCodigo}` : ''
        await logAction('NUEVA_SUSCRIPCION', `Socio ${currentSocio?.codigo} - ${currentSocio?.nombres} ${currentSocio?.apellidos}: ${validData.meses} mes(es) desde ${fmtDate(validData.fechaInicio)} hasta ${fmtDate(validData.fechaFin)}${planDesc}${montoDesc}${newCodeDesc}`)

        return { success: true, subscription }
    } catch (error) {
        console.error('Error creating subscription:', error)
        return { success: false, error: 'Error al crear suscripción.' }
    }
}

export async function updateSubscription(id: string, newDate: Date, meses: number) {
    try {
        await requireAuth() // 🔒 Protected

        if (meses < 1) return { success: false, error: "Meses inválidos" }

        const subscription = await prisma.suscripcion.findUnique({
            where: { id }
        })

        if (!subscription) {
            return { success: false, error: 'Suscripción no encontrada' }
        }

        const fechaInicio = new Date(newDate)
        if (fechaInicio.getUTCHours() === 0) fechaInicio.setUTCHours(12);

        const fechaFin = addDays(addMonths(fechaInicio, meses), -1)

        const estado = fechaFin < new Date() ? 'VENCIDA' : 'ACTIVA'

        await prisma.suscripcion.update({
            where: { id },
            data: {
                fechaInicio: fechaInicio,
                meses: meses,
                fechaFin: fechaFin,
                estado: estado
            }
        })

        revalidatePath('/')
        revalidatePath('/socios')
        revalidatePath(`/socios/${subscription.socioId}`)

        const socioOwner = await prisma.socio.findUnique({ where: { id: subscription.socioId }, select: { codigo: true, nombres: true, apellidos: true } })
        const fmtD = (d: Date) => d.toLocaleDateString('es-PE')
        const oldFechaIn = fmtD(subscription.fechaInicio)
        const oldFechaFin = fmtD(subscription.fechaFin)
        const newFechaIn = fmtD(fechaInicio)
        const newFechaFin = fmtD(fechaFin)
        const mesesDesc = subscription.meses !== meses ? ` | Meses: ${subscription.meses} → ${meses}` : ''
        await logAction('EDITAR_SUSCRIPCION', `Socio ${socioOwner?.codigo} - ${socioOwner?.nombres} ${socioOwner?.apellidos}: Inicio ${oldFechaIn} → ${newFechaIn} | Fin ${oldFechaFin} → ${newFechaFin}${mesesDesc}`)

        return { success: true }
    } catch (error) {
        console.error('Error updating subscription:', error)
        return { success: false, error: 'Error al actualizar la suscripción.' }
    }
}

export async function getExpiredSubscriptionsDetailed() {
    const today = getLimaStartOfDay()

    const socios = await prisma.socio.findMany({
        where: {
            suscripciones: {
                some: {},
                every: {
                    fechaFin: { lt: today }
                }
            }
        },
        include: {
            suscripciones: {
                orderBy: { fechaFin: 'desc' },
                take: 1,
                include: { plan: true }
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
            }
        }
    })

    const subscriptions = socios.map(socio => {
        const latestSub = socio.suscripciones[0]!
        const { suscripciones, ...socioData } = socio
        return {
            ...latestSub,
            socio: {
                ...socioData,
                documento: `${socio.tipoDocumento} ${socio.numeroDocumento}`
            }
        }
    })

    subscriptions.sort((a: any, b: any) => new Date(b.fechaFin).getTime() - new Date(a.fechaFin).getTime())

    return subscriptions
}
export async function getExpiringSubscriptionsDetailed() {
    const today = getLimaStartOfDay()
    const limitDate = addDays(today, 10)

    const socios = await prisma.socio.findMany({
        where: {
            suscripciones: {
                some: {
                    estado: 'ACTIVA',
                    fechaFin: {
                        lte: limitDate,
                        gte: today
                    }
                },
                none: {
                    fechaFin: {
                        gt: limitDate
                    }
                }
            }
        },
        include: {
            suscripciones: {
                orderBy: { fechaFin: 'desc' },
                take: 1,
                include: { plan: true }
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
            }
        }
    })

    const subscriptions = socios.map(socio => {
        const latestSub = socio.suscripciones[0]!
        const { suscripciones, ...socioData } = socio
        return {
            ...latestSub,
            socio: {
                ...socioData,
                documento: `${socio.tipoDocumento} ${socio.numeroDocumento}`
            }
        }
    })

    subscriptions.sort((a: any, b: any) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime())

    return subscriptions
}
