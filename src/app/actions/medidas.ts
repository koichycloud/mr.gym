'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { medidaSchema } from '@/lib/validations'
import { z } from 'zod'

export async function createMedida(data: z.infer<typeof medidaSchema>) {
    try {
        await requireAuth() // 🔒 Protected

        const validation = medidaSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const validData = validation.data

        const medida = await prisma.medidaFisica.create({
            data: {
                ...validData
            }
        })

        revalidatePath(`/socios/${data.socioId}`)
        return { success: true, medida }
    } catch (error: any) {
        console.error('Error creating measure:', error)
        return { success: false, error: `Error: ${error.message || 'Error desconocido'}` }
    }
}

export async function getMedidasBySocio(socioId: string) {
    try {
        const medidas = await prisma.medidaFisica.findMany({
            where: { socioId },
            orderBy: { fecha: 'asc' } // Ascending for charts
        })
        return { success: true, medidas }
    } catch (error) {
        console.error('Error fetching measures:', error)
        return { success: false, error: 'Error al obtener medidas.' }
    }
}

export async function deleteMedida(id: string, socioId: string) {
    try {
        await requireAuth() // 🔒 Protected
        await prisma.medidaFisica.delete({
            where: { id }
        })
        revalidatePath(`/socios/${socioId}`)
        return { success: true }
    } catch (error) {
        console.error('Error deleting measure:', error)
        return { success: false, error: 'Error al eliminar medida.' }
    }
}
