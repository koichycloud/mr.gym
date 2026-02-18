'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export async function registrarAsistencia(socioId: string) {
    try {
        await requireAuth()

        const asistencia = await prisma.asistencia.create({
            data: {
                socioId,
                tipo: 'ENTRADA'
            }
        })

        return { success: true, asistencia }
    } catch (error) {
        console.error('Error registrando asistencia:', error)
        return { success: false, error: 'Error al registrar asistencia' }
    }
}

export async function getAsistenciasHoy() {
    try {
        await requireAuth()

        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const manana = new Date(hoy)
        manana.setDate(manana.getDate() + 1)

        const asistencias = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: hoy,
                    lt: manana
                }
            },
            include: {
                socio: {
                    select: {
                        codigo: true,
                        nombres: true,
                        apellidos: true,
                        sexo: true
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        })

        return asistencias
    } catch (error) {
        console.error('Error obteniendo asistencias:', error)
        return []
    }
}

export async function getAsistenciasPorFecha(fecha: Date) {
    try {
        await requireAuth()

        const inicio = new Date(fecha)
        inicio.setHours(0, 0, 0, 0)

        const fin = new Date(inicio)
        fin.setDate(fin.getDate() + 1)

        const asistencias = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: inicio,
                    lt: fin
                }
            },
            include: {
                socio: {
                    select: {
                        codigo: true,
                        nombres: true,
                        apellidos: true,
                        sexo: true
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        })

        return asistencias
    } catch (error) {
        console.error('Error obteniendo asistencias:', error)
        return []
    }
}

export async function getEstadisticasAsistencia() {
    try {
        await requireAuth()

        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const manana = new Date(hoy)
        manana.setDate(manana.getDate() + 1)

        // Count today
        const totalHoy = await prisma.asistencia.count({
            where: {
                fecha: {
                    gte: hoy,
                    lt: manana
                }
            }
        })

        // Last 7 days
        const hace7Dias = new Date(hoy)
        hace7Dias.setDate(hace7Dias.getDate() - 7)

        const ultimaSemana = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: hace7Dias,
                    lt: manana
                }
            },
            select: {
                fecha: true
            }
        })

        // Calculate peak hour from today's data
        const asistenciasHoy = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: hoy,
                    lt: manana
                }
            },
            select: {
                fecha: true
            }
        })

        const horasPico: Record<number, number> = {}
        asistenciasHoy.forEach(a => {
            const hora = new Date(a.fecha).getHours()
            horasPico[hora] = (horasPico[hora] || 0) + 1
        })

        let horaPico = '-'
        let maxAsistencias = 0
        Object.entries(horasPico).forEach(([hora, count]) => {
            if (count > maxAsistencias) {
                maxAsistencias = count
                horaPico = `${hora}:00 - ${parseInt(hora) + 1}:00`
            }
        })

        // Weekly breakdown
        const diasSemana: Record<string, number> = {}
        ultimaSemana.forEach(a => {
            const dia = new Date(a.fecha).toLocaleDateString('es-PE', { weekday: 'short' })
            diasSemana[dia] = (diasSemana[dia] || 0) + 1
        })

        return {
            totalHoy,
            horaPico,
            promedioSemanal: ultimaSemana.length > 0 ? Math.round(ultimaSemana.length / 7) : 0,
            diasSemana
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error)
        return { totalHoy: 0, horaPico: '-', promedioSemanal: 0, diasSemana: {} }
    }
}

export async function contarAsistenciasHoy() {
    try {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const manana = new Date(hoy)
        manana.setDate(manana.getDate() + 1)

        const total = await prisma.asistencia.count({
            where: {
                fecha: {
                    gte: hoy,
                    lt: manana
                }
            }
        })

        return total
    } catch (error) {
        console.error('Error contando asistencias:', error)
        return 0
    }
}
