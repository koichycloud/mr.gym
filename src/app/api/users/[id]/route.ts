import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                fullName: true,
                fotoUrl: true,
                role: true,
                createdAt: true
            }
        })

        if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

        return NextResponse.json({ user })

    } catch (error) {
        console.error("Error fetching user:", error)
        return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
    }
}
