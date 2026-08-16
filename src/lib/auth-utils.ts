import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import prisma from "@/lib/prisma"

export interface TestAuthContext {
    userId: string
    name: string
    role: string
    permissions: string[]
}

let globalTestAuthContext: TestAuthContext | null = null

/**
 * Determina de forma estricta e incontrovertible si el bypass de autenticación está permitido.
 * Es ABSOLUTAMENTE IMPOSIBLE activarlo en producción.
 */
export function isTestBypassAllowed(): boolean {
    // 1. Rechazo absoluto en cualquier entorno de producción (Vercel, Node, etc.)
    if (
        process.env.NODE_ENV === "production" ||
        process.env.VERCEL_ENV === "production" ||
        process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ) {
        return false
    }

    // 2. Rechazo absoluto si la base de datos no es local de desarrollo
    const dbUrl = process.env.DATABASE_URL || ""
    if (
        !dbUrl.includes("localhost") &&
        !dbUrl.includes("127.0.0.1") &&
        !dbUrl.includes("mr_gym_dev")
    ) {
        return false
    }

    // 3. Exige la bandera explícita de test
    return process.env.AUTH_BYPASS_FOR_TEST === "true"
}

/**
 * Permite a la suite de pruebas unitarias/integración inyectar contextos de usuario
 * simulados (ADMIN, SUPERADMIN, sin permisos, no autenticado) exclusivamente en entorno local de test.
 */
export function setTestAuthContext(ctx: TestAuthContext | null) {
    if (!isTestBypassAllowed()) {
        throw new Error("Violación de Seguridad: El contexto de prueba no puede ser alterado fuera del entorno local de pruebas.")
    }
    globalTestAuthContext = ctx
}

export async function requireAuth() {
    if (isTestBypassAllowed()) {
        if (globalTestAuthContext !== null) {
            return {
                user: {
                    id: globalTestAuthContext.userId,
                    name: globalTestAuthContext.name,
                    role: globalTestAuthContext.role,
                }
            } as any
        }
        return { user: { id: "test-admin-user", name: "Admin Test", role: "ADMIN" } } as any
    }

    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        throw new Error("Unauthorized: You must be logged in to perform this action.")
    }

    return session
}

export async function requirePermission(permission: string) {
    if (isTestBypassAllowed() && globalTestAuthContext !== null) {
        const { role, permissions } = globalTestAuthContext
        if (role === 'ADMIN' || role === 'SUPERADMIN' || (permissions && permissions.includes(permission))) {
            return { user: globalTestAuthContext } as any
        }
        throw new Error(`Forbidden: No tienes el permiso necesario (${permission}).`)
    }

    if (isTestBypassAllowed() && !globalTestAuthContext) {
        return { user: { id: "test-admin-user", name: "Admin Test", role: "ADMIN" } } as any
    }

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
    if (isTestBypassAllowed() && globalTestAuthContext !== null) {
        const { role, permissions } = globalTestAuthContext
        if (role === 'ADMIN' || role === 'SUPERADMIN' || (permissions && permissions.includes('USUARIOS_GESTIONAR'))) {
            return { user: globalTestAuthContext } as any
        }
        throw new Error("Forbidden: Solo administradores pueden realizar esta acción.")
    }

    if (isTestBypassAllowed() && !globalTestAuthContext) {
        return { user: { id: "test-admin-user", name: "Admin Test", role: "ADMIN" } } as any
    }

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
