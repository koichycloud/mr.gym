'use server'

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { requireAuth, requireAdmin } from "@/lib/auth-utils"
import { userSchema } from "@/lib/validations"
import { z } from "zod"
import { logAction } from "@/lib/audit"

export async function getUsers() {
    try {
        await requireAuth() // 🔒 Protected
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                permissions: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        return { success: true, data: users }
    } catch (error: any) {
        console.error("Error al obtener usuarios:", error)
        return { success: false, error: "Error al cargar la lista de usuarios." }
    }
}

export async function createUser(data: z.infer<typeof userSchema>) {
    try {
        await requireAuth() // 🔒 Protected

        const validation = userSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const { username, password, role } = validation.data

        // Verificar si existe
        const existingUser = await prisma.user.findUnique({
            where: { username }
        })

        if (existingUser) {
            return { success: false, error: "El nombre de usuario ya existe." }
        }

        if (!password) {
            return { success: false, error: "La contraseña es requerida para nuevos usuarios." }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'RECEPCION',
                permissions: data.permissions || []
            }
        })

        await logAction('CREAR_USUARIO', `Creó al usuario ${username} con rol ${role || 'RECEPCION'}`)
        
        revalidatePath('/users')
        return { success: true, data: { id: newUser.id, username: newUser.username } }

    } catch (error: any) {
        console.error("Error al crear usuario:", error)
        return { success: false, error: "No se pudo crear el usuario." }
    }
}

export async function updateUserPassword(userId: string, newPassword: string) {
    try {
        await requireAuth() // 🔒 Protected

        if (!newPassword || newPassword.length < 6) {
            return { success: false, error: "La contraseña debe tener al menos 6 caracteres." }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })

        revalidatePath('/users')
        return { success: true, message: "Contraseña actualizada correctamente." }

    } catch (error: any) {
        console.error("Error al actualizar contraseña:", error)
        return { success: false, error: "No se pudo actualizar la contraseña." }
    }
}

export async function updateUser(userId: string, data: z.infer<typeof userSchema>) {
    try {
        await requireAdmin() // 🔒 Admin Only

        const validation = userSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const updateData: any = {
            username: validation.data.username,
            role: validation.data.role,
            permissions: validation.data.permissions || []
        }

        if (validation.data.password && validation.data.password.length >= 6) {
            updateData.password = await bcrypt.hash(validation.data.password, 10)
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        })

        await logAction('EDITAR_USUARIO', `Editó al usuario ${validation.data.username}. Permisos: ${(validation.data.permissions || []).join(', ')}`)

        revalidatePath('/users')
        return { success: true, message: "Usuario actualizado correctamente." }

    } catch (error: any) {
        console.error("Error al actualizar usuario:", error)
        return { success: false, error: "No se pudo actualizar el usuario." }
    }
}

export async function deleteUser(userId: string) {
    try {
        await requireAdmin() // 🔒 Admin Only
        
        await prisma.user.delete({
            where: { id: userId }
        })

        await logAction('ELIMINAR_USUARIO', `Eliminó al usuario con ID ${userId}`)

        revalidatePath('/users')
        return { success: true, message: "Usuario eliminado correctamente." }

    } catch (error: any) {
        console.error("Error al eliminar usuario:", error)
        return { success: false, error: "No se pudo eliminar el usuario." }
    }
}
