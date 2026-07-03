'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { medidaSchema } from '@/lib/validations'
import { z } from 'zod'
import { logAction } from '@/lib/audit'

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

export async function updateMedida(id: string, data: z.infer<typeof medidaSchema>) {
    try {
        await requireAuth() // 🔒 Protected

        const validation = medidaSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const validData = validation.data

        const original = await prisma.medidaFisica.findUnique({
            where: { id },
            include: { socio: true }
        })

        if (!original) {
            return { success: false, error: 'Registro de medidas no encontrado.' }
        }

        const medida = await prisma.medidaFisica.update({
            where: { id },
            data: {
                ...validData
            }
        })

        const socioName = original.socio ? `${original.socio.codigo} - ${original.socio.nombres} ${original.socio.apellidos}` : 'Desconocido'
        const fmtDate = (d: Date) => d.toLocaleDateString('es-PE')
        await logAction('EDITAR_MEDIDA', `Socio ${socioName}: Editó medidas físicas del ${fmtDate(original.fecha)}. Peso: ${original.peso} → ${validData.peso} kg | Talla: ${original.altura} → ${validData.altura} cm`)

        revalidatePath(`/socios/${data.socioId}`)
        return { success: true, medida }
    } catch (error: any) {
        console.error('Error updating measure:', error)
        return { success: false, error: `Error: ${error.message || 'Error desconocido'}` }
    }
}
