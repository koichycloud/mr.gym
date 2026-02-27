import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'

export async function PUT(request: Request) {
    try {
        const session = await requireAuth()
        const data = await request.json()

        const updateData: any = {}



        if (data.password && data.password.trim() !== '') {
            updateData.password = await bcrypt.hash(data.password, 10)
        }

        // Si no hay nada que actualizar, retornamos éxito inmediatamente
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: true, message: 'No hay cambios para guardar' })
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true
            }
        })

        // Registrar en bitácora
        /* await prisma.auditLog.create({
            data: {
                usuario: session.user.name || (session.user as any).username || 'System',
                accion: 'ACTUALIZAR_PERFIL',
                detalles: 'El usuario actualizó su propio perfil'
            }
        }) */

        return NextResponse.json({ success: true, user })

    } catch (error: any) {
        console.error("Error updating profile:", error)
        return NextResponse.json(
            { error: error.message || 'Error al actualizar el perfil' },
            { status: 500 }
        )
    }
}
