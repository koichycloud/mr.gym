'use server'

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-utils"
import { userSchema } from "@/lib/validations"
import { z } from "zod"

export async function getUsers() {
    try {
        await requireAuth() // 🔒 Protected
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
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

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'RECEPCION'
            }
        })

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

export async function deleteUser(userId: string) {
    try {
        await requireAuth() // 🔒 Protected
        // Prevenir borrado del admin principal si es necesario, o comprobar usuario actual
        // Por simplicidad, permitimos borrar cualquiera por ahora salvo validaciones extra

        await prisma.user.delete({
            where: { id: userId }
        })

        revalidatePath('/users')
        return { success: true, message: "Usuario eliminado correctamente." }

    } catch (error: any) {
        console.error("Error al eliminar usuario:", error)
        return { success: false, error: "No se pudo eliminar el usuario." }
    }
}
