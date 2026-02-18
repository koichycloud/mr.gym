'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export async function getAsistenciasPorSocio(socioId: string, limit?: number) {
    try {
        await requireAuth()

        const asistencias = await prisma.asistencia.findMany({
            where: {
                socioId
            },
            orderBy: {
                fecha: 'desc'
            },
            take: limit || 50 // Default to last 50 records
        })

        // Calculate stats
        const total = await prisma.asistencia.count({
            where: { socioId }
        })

        // Last 30 days
        const hace30Dias = new Date()
        hace30Dias.setDate(hace30Dias.getDate() - 30)

        const ultimos30Dias = await prisma.asistencia.count({
            where: {
                socioId,
                fecha: {
                    gte: hace30Dias
                }
            }
        })

        // This month
        const inicioMes = new Date()
        inicioMes.setDate(1)
        inicioMes.setHours(0, 0, 0, 0)

        const esteMes = await prisma.asistencia.count({
            where: {
                socioId,
                fecha: {
                    gte: inicioMes
                }
            }
        })

        return {
            asistencias,
            stats: {
                total,
                ultimos30Dias,
                esteMes,
                promedioDiario: ultimos30Dias > 0 ? (ultimos30Dias / 30).toFixed(1) : '0'
            }
        }
    } catch (error) {
        console.error('Error obteniendo asistencias del socio:', error)
        return {
            asistencias: [],
            stats: {
                total: 0,
                ultimos30Dias: 0,
                esteMes: 0,
                promedioDiario: '0'
            }
        }
    }
}
