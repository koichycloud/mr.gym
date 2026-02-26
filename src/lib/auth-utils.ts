import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"

export async function requireAuth() {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        throw new Error("Unauthorized: You must be logged in to perform this action.")
    }

    return session
}

export async function requireAdmin() {
    const session = await requireAuth()

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN') {
        throw new Error("Forbidden: Solo administradores pueden realizar esta acción.")
    }

    return session
}
