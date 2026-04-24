import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"

export async function requireAuth() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        throw new Error("Unauthorized: You must be logged in to perform this action.")
    }

    return session
}

import prisma from "@/lib/prisma"

export async function requirePermission(permission: string) {
    const session = await requireAuth()
    
    // Fetch fresh user data from DB to ensure immediate permission updates
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, permissions: true }
    })

    if (!user) throw new Error("User not found")

    const permissions = (user.permissions as string[]) || []

    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || permissions.includes(permission)) {
        return session
    }

    throw new Error(`Forbidden: No tienes el permiso necesario (${permission}).`)
}

export async function requireAdmin() {
    const session = await requireAuth()
    
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, permissions: true }
    })

    if (!user) throw new Error("User not found")

    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || (user.permissions as string[])?.includes('USUARIOS_GESTIONAR')) {
        return session
    }

    throw new Error("Forbidden: Solo administradores pueden realizar esta acción.")
}
