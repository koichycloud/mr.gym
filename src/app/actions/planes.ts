'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

export async function getPlanesActivos() {
    return await prisma.plan.findMany({
        where: { activo: true },
        orderBy: { meses: 'asc' }
    })
}

export async function getTodosPlanes() {
    return await prisma.plan.findMany({
        orderBy: { meses: 'asc' }
    })
}

export async function createPlan(data: { nombre: string, descripcion?: string, meses: number, precio: number }) {
    try {
        await requireAuth()
        const plan = await prisma.plan.create({ data })
        revalidatePath('/planes')
        revalidatePath('/')
        return { success: true, plan }
    } catch (err) {
        console.error("Error creating plan:", err)
        return { success: false, error: 'Error al crear el plan' }
    }
}

export async function updatePlan(id: string, data: { nombre?: string, descripcion?: string, meses?: number, precio?: number, activo?: boolean }) {
    try {
        await requireAuth()
        await prisma.plan.update({ where: { id }, data })
        revalidatePath('/planes')
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        console.error("Error updating plan:", err)
        return { success: false, error: 'Error al actualizar el plan' }
    }
}

export async function deletePlan(id: string) {
    try {
        await requireAuth()
        await prisma.plan.delete({ where: { id } })
        revalidatePath('/planes')
        revalidatePath('/')
        return { success: true }
    } catch (err) {
        console.error("Error deleting plan:", err)
        return { success: false, error: 'No se puede eliminar porque hay suscripciones asociadas.' }
    }
}
