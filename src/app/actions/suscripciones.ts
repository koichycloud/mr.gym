'use server'

import prisma from '@/lib/prisma'
import { addDays } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { suscripcionSchema } from '@/lib/validations'
import { z } from 'zod'

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
            estado: 'ACTIVA',
            fechaFin: {
                lt: today
            }
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

        // Always record the PREVIOUS code to history when creating a new subscription.
        // This means the history represents the code the socio HAD before this renewal.
        const previousCode = currentSocio?.suscripciones[0]?.codigo || currentSocio?.codigo
        if (previousCode) {
            await prisma.codigoHistorial.create({
                data: {
                    socioId: validData.socioId,
                    codigo: previousCode,
                    fechaCambio: validData.fechaInicio
                }
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

        return { success: true }
    } catch (error) {
        console.error('Error updating subscription:', error)
        return { success: false, error: 'Error al actualizar la suscripción.' }
    }
}
