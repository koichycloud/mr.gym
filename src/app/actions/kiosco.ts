'use server'

import prisma from '@/lib/prisma'

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
    try {
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
                message: 'Socio no encontrado',
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

        const hoy = new Date()
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
            const minutosTranscurridos = (hoy.getTime() - new Date(ultimaAsistencia.fecha).getTime()) / (1000 * 60)
            
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
