'use server'

import prisma from '@/lib/prisma'
import { getLimaStartOfDay } from '@/lib/date-utils'

export type AccessResult = {
    success: boolean
    message: string
    reason?: 'NOT_FOUND' | 'EXPIRED' | 'PASSBACK'
    tipoAcceso?: 'ENTRADA' | 'SALIDA'
    socio?: {
        nombres: string
        apellidos: string
        fotoUrl?: string | null
        estado: 'ACTIVO' | 'VENCIDO' | 'INACTIVO'
        diasVencimiento?: number
        ultimoPago?: Date
    }
}

// Helper to send telegram notifications asynchronously
async function sendTelegramAlert(socioName: string, daysLeft: number) {
    const token = process.env.TELEGRAM_BOT_TOKEN || '8748160032:AAEowYSflHutcBqC5CPVZ5RIgOutcSpbXzI';
    const chatId = process.env.TELEGRAM_CHAT_ID || '1191739247';

    if (!token || !chatId) return;

    let emoji = '⚠️';
    let messageText = `El socio *${socioName}* acaba de escanear su código en el *KIOSCO*. Le quedan *${daysLeft} días* de membresía.`;

    if (daysLeft < 0) {
        emoji = '🚨';
        messageText = `El socio *${socioName}* intentó ingresar por el *KIOSCO* pero su membresía está *VENCIDA* (hace ${Math.abs(daysLeft)} días).`;
    } else if (daysLeft === 0) {
        emoji = '❗';
        messageText = `El socio *${socioName}* acaba de ingresar por el *KIOSCO*. Su membresía vence *HOY*.`;
    }

    const text = `${emoji} *Alerta de Sistema*\n\n${messageText}`;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error('Error enviando notificación de Telegram:', e);
    }
}

export async function validateKioskAccess(codigo: string, mode: 'ENTRADA' | 'SALIDA' = 'ENTRADA'): Promise<AccessResult> {
    // Normalize: trim whitespace and strip non-alphanumeric chars to handle scanner artifacts
    const cleanCodigo = codigo.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    console.log(`[KIOSCO] Intento de acceso - Código: "${cleanCodigo}" (raw: "${codigo}"), Modo: ${mode}`);
    try {
        type SocioWithSubs = {
            id: string
            codigo: string
            nombres: string | null
            apellidos: string | null
            fotoUrl: string | null
            suscripciones: {
                fechaFin: Date
                fechaInicio: Date
                estado: string
                meses: number
            }[]
        }

        // 1. Try to find by current codigo first
        let socio: SocioWithSubs | null = await prisma.socio.findUnique({
            where: { codigo: cleanCodigo },
            select: {
                id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true,
                suscripciones: {
                    orderBy: { fechaFin: 'desc' },
                    take: 1,
                    select: { fechaFin: true, fechaInicio: true, estado: true, meses: true }
                }
            }
        })

        // 2. If not found, check if it's a historic code (old printed QR codes still in circulation)
        if (!socio) {
            const historial = await prisma.codigoHistorial.findFirst({
                where: { codigo: cleanCodigo },
                select: {
                    socio: {
                        select: {
                            id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true,
                            suscripciones: {
                                orderBy: { fechaFin: 'desc' },
                                take: 1,
                                select: { fechaFin: true, fechaInicio: true, estado: true, meses: true }
                            }
                        }
                    }
                }
            })
            if (historial?.socio) {
                socio = historial.socio
                console.log(`[KIOSCO] Código histórico "${cleanCodigo}" resuelto al socio "${socio.codigo}"`)
            }
        }

        if (!socio) {
            return {
                success: false,
                message: 'Código no reconocido',
                reason: 'NOT_FOUND'
            }
        }

        const suscripcion = socio.suscripciones[0]

        if (!suscripcion) {
            return {
                success: false,
                message: 'Sin suscripción',
                reason: 'NOT_FOUND',
                socio: {
                    nombres: socio.nombres || '',
                    apellidos: socio.apellidos || '',
                    fotoUrl: socio.fotoUrl,
                    estado: 'INACTIVO'
                }
            }
        }

        const hoy = getLimaStartOfDay()
        const vence = new Date(suscripcion.fechaFin)
        const diffTime = vence.getTime() - hoy.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const fullName = `${socio.nombres} ${socio.apellidos || ''}`.trim()

        if (diffDays <= 5) {
            sendTelegramAlert(fullName, diffDays).catch(console.error);
        }

        if (diffDays < 0) {
            return {
                success: false,
                message: 'Suscripción Vencida',
                reason: 'EXPIRED',
                socio: {
                    nombres: socio.nombres || '',
                    apellidos: socio.apellidos || '',
                    fotoUrl: socio.fotoUrl,
                    estado: 'VENCIDO',
                    diasVencimiento: Math.abs(diffDays),
                    ultimoPago: suscripcion.fechaInicio
                }
            }
        }

        // --- Lógica de Control de Salidas y Anti-Passback ---
        const ultimaAsistencia = await prisma.asistencia.findFirst({
            where: {
                socioId: socio.id,
                fecha: {
                    gte: new Date(hoy.getTime() - 24 * 60 * 60 * 1000) // solo revisamos últimas 24 horas
                }
            },
            orderBy: { fecha: 'desc' }
        })

        const tipoOperacion = mode;
        const COOLDOWN_MINUTES = 15;

        // Validar anti-passback únicamente si intentan repetir la MISMA acción en menos de 15 minutos
        if (ultimaAsistencia) {
            const ahora = new Date();
            const minutosTranscurridos = (ahora.getTime() - new Date(ultimaAsistencia.fecha).getTime()) / (1000 * 60)
            
            if (minutosTranscurridos < COOLDOWN_MINUTES && ultimaAsistencia.tipo === tipoOperacion) {
                // Bloqueo Anti-Passback
                return {
                    success: false,
                    message: ultimaAsistencia.tipo === 'ENTRADA' 
                               ? `Ya registraste entrada hace ${Math.floor(minutosTranscurridos)} min.` 
                               : `Ya registraste salida hace ${Math.floor(minutosTranscurridos)} min.`,
                    reason: 'PASSBACK',
                    socio: {
                        nombres: socio.nombres || '',
                        apellidos: socio.apellidos || '',
                        fotoUrl: socio.fotoUrl,
                        estado: 'ACTIVO',
                        diasVencimiento: diffDays
                    }
                }
            }
        }

        // Registrar asistencia automáticamente
        try {
            await prisma.asistencia.create({
                data: {
                    socioId: socio.id,
                    tipo: tipoOperacion
                }
            })
        } catch (err) {
            console.error('Error registrando asistencia automática en Kiosco:', err)
        }

        return {
            success: true,
            message: tipoOperacion === 'ENTRADA' ? 'Acceso Permitido' : 'Registro de Salida',
            tipoAcceso: tipoOperacion,
            socio: {
                nombres: socio.nombres || '',
                apellidos: socio.apellidos || '',
                fotoUrl: socio.fotoUrl,
                estado: 'ACTIVO',
                diasVencimiento: diffDays,
                ultimoPago: suscripcion.fechaInicio
            }
        }

    } catch (error) {
        console.error("Error validando acceso en Kiosco:", error)
        return { success: false, message: 'Error del servidor', reason: 'NOT_FOUND' }
    }
}
