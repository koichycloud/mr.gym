import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export async function logAction(accion: string, detalles: string) {
    try {
        const session = await requireAuth().catch(() => null)
        const usuario = session?.user?.name || 'SISTEMA'

        const fechaPeru = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }))

        await prisma.auditLog.create({
            data: {
                usuario,
                accion,
                detalles,
                fecha: fechaPeru
            }
        })
    } catch (error) {
        console.error("Error writing audit log:", error)
        // Silent fail to not break the main transaction if logging fails
    }
}
