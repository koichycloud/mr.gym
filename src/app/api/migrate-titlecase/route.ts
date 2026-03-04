import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

function toTitleCase(str: string | null | undefined): string | null {
    if (!str) return null
    return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export async function POST() {
    try {
        const session = await requireAuth()
        // Only allow SUPERADMIN or ADMIN
        if (session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const socios = await prisma.socio.findMany({
            select: { id: true, nombres: true, apellidos: true }
        })

        let updated = 0
        for (const socio of socios) {
            const newNombres = toTitleCase(socio.nombres)
            const newApellidos = toTitleCase(socio.apellidos)

            // Only update if changed
            if (newNombres !== socio.nombres || newApellidos !== socio.apellidos) {
                await prisma.socio.update({
                    where: { id: socio.id },
                    data: {
                        nombres: newNombres,
                        apellidos: newApellidos
                    }
                })
                updated++
            }
        }

        return NextResponse.json({
            success: true,
            total: socios.length,
            updated,
            message: `${updated} socios actualizados de ${socios.length} total`
        })
    } catch (error: any) {
        console.error('Migration error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
