'use server'

import prisma from '@/lib/prisma'
import { addDays } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { suscripcionSchema } from '@/lib/validations'
import { z } from 'zod'
import { logAction } from '@/lib/audit'

export async function getExpiringSubscriptions() {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    const limitDate = addDays(today, 10)

    const subscriptions = await prisma.suscripcion.findMany({
        where: {
            estado: 'ACTIVA',
            fechaFin: {
                lte: limitDate,
                gte: today
            }
        },
        include: {
            socio: true
        },
        orderBy: {
            fechaFin: 'asc'
        }
    })

    return subscriptions
}

export async function getExpiredSubscriptions() {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    const subscriptions = await prisma.suscripcion.findMany({
        where: {
            OR: [
                // Subscriptions explicitly marked as VENCIDA
                { estado: 'VENCIDA' },
                // Subscriptions still marked ACTIVA but past their end date
                {
                    estado: 'ACTIVA',
                    fechaFin: { lt: today }
                }
            ]
        },
        include: {
            socio: true
        },
        orderBy: {
            fechaFin: 'desc'
        }
    })

    return subscriptions
}

export async function createSubscription(
    data: z.infer<typeof suscripcionSchema>,
    pagoInfo?: { monto: number; metodoPago: string }
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
                meses: validData.meses,
                fechaInicio: validData.fechaInicio,
                fechaFin: validData.fechaFin,
                estado: 'ACTIVA',
                // Use new code if provided, otherwise use the socio's current code
                codigo: validData.nuevoCodigo || currentSocio?.codigo
            }
        })

        // Auto-register payment if payment info provided
        if (pagoInfo && pagoInfo.monto > 0) {
            try {
                await prisma.pago.create({
                    data: {
                        socioId: validData.socioId,
                        suscripcionId: subscription.id,
                        monto: pagoInfo.monto,
                        metodoPago: pagoInfo.metodoPago || 'EFECTIVO',
                        concepto: 'SUSCRIPCION',
                        descripcion: `Suscripción ${validData.meses} mes(es)`
                    }
                })
            } catch (pagoError) {
                console.error('Error registrando pago automático:', pagoError)
            }
        }

        revalidatePath('/')
        revalidatePath('/socios')
        revalidatePath('/caja')
        revalidatePath(`/socios/${validData.socioId}`)

        await logAction('NUEVA_SUSCRIPCION', `Registró ${validData.meses} mes(es) al socio ${currentSocio?.codigo} - ${currentSocio?.nombres} ${currentSocio?.apellidos}`)

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
        const fechaFin = new Date(fechaInicio)
        fechaFin.setMonth(fechaFin.getMonth() + meses)

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

        await logAction('EDITAR_SUSCRIPCION', `Modificó las fechas de una suscripción del socio ID: ${subscription.socioId.slice(0, 8)}`)

        return { success: true }
    } catch (error) {
        console.error('Error updating subscription:', error)
        return { success: false, error: 'Error al actualizar la suscripción.' }
    }
}

export async function getExpiredSubscriptionsDetailed() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const subscriptions = await prisma.suscripcion.findMany({
        where: {
            OR: [
                // Subscriptions explicitly marked as VENCIDA
                { estado: 'VENCIDA' },
                // Subscriptions still marked ACTIVA but past their end date
                {
                    estado: 'ACTIVA',
                    fechaFin: { lt: today }
                }
            ]
        },
        include: {
            socio: {
                include: {
                    historialCodigos: {
                        orderBy: { fechaCambio: 'desc' }
                    }
                }
            }
        },
        orderBy: {
            fechaFin: 'desc'
        }
    })

    return subscriptions
}
