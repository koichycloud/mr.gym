'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createMedida(data: {
    socioId: string
    peso?: number
    altura?: number
    porcentajeGrasa?: number
    porcentajeMusculo?: number
    cuello?: number
    hombros?: number
    pecho?: number
    cintura?: number
    vientreBajo?: number
    cadera?: number
    gluteos?: number
    biceps?: number
    antebrazos?: number
    muslos?: number
    cuadriceps?: number
    pantorrillas?: number
    fecha: Date
}) {
    try {
        const medida = await prisma.medidaFisica.create({
            data: {
                ...data
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
