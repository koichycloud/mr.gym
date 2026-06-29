'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { getLimaStartOfDay, getLimaStartOfMonth } from '@/lib/date-utils'

export async function getAsistenciasPorSocio(socioId: string, limit?: number) {
    try {
        await requireAuth()

        const queryOptions: any = {
            where: {
                socioId
            },
            orderBy: {
                fecha: 'desc'
            }
        }

        if (limit !== undefined && limit > 0) {
            queryOptions.take = limit
        } else if (limit === undefined) {
            queryOptions.take = 50
        } // If limit <= 0, we retrieve all records without any database limit

        const asistencias = await prisma.asistencia.findMany(queryOptions)

        // Calculate stats
        const total = await prisma.asistencia.count({
            where: { socioId }
        })

        // Last 30 days
        const hace30Dias = getLimaStartOfDay()
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
        const inicioMes = getLimaStartOfMonth()

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
