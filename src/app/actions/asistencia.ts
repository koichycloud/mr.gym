'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { getLimaStartOfDay, getLimaEndOfDay } from '@/lib/date-utils'

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

        const hoy = getLimaStartOfDay()
        const manana = getLimaEndOfDay()

        const asistencias = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: hoy,
                    lte: manana
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

        const inicio = getLimaStartOfDay(fecha)
        const fin = getLimaEndOfDay(fecha)

        const asistencias = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: inicio,
                    lte: fin
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

        const hoy = getLimaStartOfDay()
        const manana = getLimaEndOfDay()

        // Count today
        const totalHoy = await prisma.asistencia.count({
            where: {
                fecha: {
                    gte: hoy,
                    lte: manana
                }
            }
        })

        // Last 7 days
        const hace7Dias = getLimaStartOfDay()
        hace7Dias.setDate(hace7Dias.getDate() - 7)

        const ultimaSemana = await prisma.asistencia.findMany({
            where: {
                fecha: {
                    gte: hace7Dias,
                    lte: manana
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
                    lte: manana
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

        // Weekly breakdown (Array with exact dates)
        const diasSemanaArr = [];
        for (let i = 6; i >= 0; i--) {
            const d = getLimaStartOfDay();
            d.setDate(d.getDate() - i);
            const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            diasSemanaArr.push({
                dia: d.toLocaleDateString('es-PE', { weekday: 'short' }),
                fecha: dateStr,
                asistencias: 0
            });
        }

        ultimaSemana.forEach(a => {
            const aDate = new Date(a.fecha);
            // Convert to Lima time
            const localDate = new Date(aDate.getTime() - (5 * 60 * 60 * 1000));
            const dateStr = localDate.getFullYear() + '-' + String(localDate.getMonth() + 1).padStart(2, '0') + '-' + String(localDate.getDate()).padStart(2, '0');
            const found = diasSemanaArr.find(d => d.fecha === dateStr);
            if (found) {
                found.asistencias++;
            }
        });

        return {
            totalHoy,
            horaPico,
            promedioSemanal: ultimaSemana.length > 0 ? Math.round(ultimaSemana.length / 7) : 0,
            diasSemana: diasSemanaArr
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error)
        return { totalHoy: 0, horaPico: '-', promedioSemanal: 0, diasSemana: [] }
    }
}

export async function contarAsistenciasHoy() {
    try {
        const hoy = getLimaStartOfDay()
        const manana = getLimaEndOfDay()

        const total = await prisma.asistencia.count({
            where: {
                fecha: {
                    gte: hoy,
                    lte: manana
                }
            }
        })

        return total
    } catch (error) {
        console.error('Error contando asistencias:', error)
        return 0
    }
}
