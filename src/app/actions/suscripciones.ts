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

export async function createSubscription(data: z.infer<typeof suscripcionSchema>) {
    try {
        await requireAuth() // 🔒 Protected

        const validation = suscripcionSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const validData = validation.data
        const currentSocio = await prisma.socio.findUnique({
            where: { id: validData.socioId }
        })

        if (currentSocio && currentSocio.codigo !== validData.nuevoCodigo && validData.nuevoCodigo) {
            // Code changed! verify uniqueness
            const existing = await prisma.socio.findUnique({
                where: { codigo: validData.nuevoCodigo }
            })

            if (existing) {
                return { success: false, error: `El código ${validData.nuevoCodigo} ya está en uso.` }
            }

            // Save OLD code to history
            await prisma.codigoHistorial.create({
                data: {
                    socioId: validData.socioId,
                    codigo: currentSocio.codigo
                }
            })

            // Update Socio with NEW code
            await prisma.socio.update({
                where: { id: validData.socioId },
                data: { codigo: validData.nuevoCodigo }
            })
        }

        const subscription = await prisma.suscripcion.create({
            data: {
                socioId: validData.socioId,
                meses: validData.meses,
                fechaInicio: validData.fechaInicio,
                fechaFin: validData.fechaFin,
                estado: 'ACTIVA'
            }
        })

        revalidatePath('/')
        revalidatePath('/socios')
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

        await prisma.suscripcion.update({
            where: { id },
            data: {
                fechaInicio: fechaInicio,
                meses: meses,
                fechaFin: fechaFin
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
