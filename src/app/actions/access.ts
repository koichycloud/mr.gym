'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export type AccessResult = {
    success: boolean
    message: string
    socio?: {
        nombres: string
        apellidos: string
        foto?: string // Placeholder for future
        estado: 'ACTIVO' | 'VENCIDO' | 'INACTIVO'
        diasVencimiento?: number
        ultimoPago?: Date
    }
}

export async function validateAccess(codigo: string): Promise<AccessResult> {
    try {
        await requireAuth()

        const socio = await prisma.socio.findUnique({
            where: { codigo },
            include: {
                suscripciones: {
                    orderBy: { fechaFin: 'desc' },
                    take: 1
                }
            }
        })

        if (!socio) {
            return {
                success: false,
                message: 'Socio no encontrado'
            }
        }

        const suscripcion = socio.suscripciones[0]

        // Logic for access status
        if (!suscripcion) {
            return {
                success: false,
                message: 'Sin suscripción',
                socio: {
                    nombres: socio.nombres || '',
                    apellidos: socio.apellidos || '',
                    estado: 'INACTIVO'
                }
            }
        }

        const hoy = new Date()
        const vence = new Date(suscripcion.fechaFin)
        const diffTime = vence.getTime() - hoy.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return {
                success: false,
                message: 'Suscripción Vencida',
                socio: {
                    nombres: socio.nombres || '',
                    apellidos: socio.apellidos || '',
                    estado: 'VENCIDO',
                    diasVencimiento: Math.abs(diffDays),
                    ultimoPago: suscripcion.fechaInicio
                }
            }
        }

        // Auto-register attendance on successful access
        try {
            await prisma.asistencia.create({
                data: {
                    socioId: socio.id,
                    tipo: 'ENTRADA'
                }
            })
        } catch (err) {
            console.error('Error registrando asistencia automática:', err)
        }

        return {
            success: true,
            message: 'Acceso Permitido',
            socio: {
                nombres: socio.nombres || '',
                apellidos: socio.apellidos || '',
                estado: 'ACTIVO',
                diasVencimiento: diffDays,
                ultimoPago: suscripcion.fechaInicio
            }
        }

    } catch (error) {
        console.error("Error validando acceso:", error)
        return { success: false, message: 'Error del servidor' }
    }
}
