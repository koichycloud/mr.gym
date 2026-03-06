'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export type AccessResult = {
    success: boolean
    message: string
    socio?: {
        nombres: string
        apellidos: string
        fotoUrl?: string | null // Modified to include photo URL
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
    let messageText = `El socio *${socioName}* acaba de escanear su código. Le quedan *${daysLeft} días* de membresía.`;

    if (daysLeft < 0) {
        emoji = '🚨';
        messageText = `El socio *${socioName}* intentó ingresar pero su membresía está *VENCIDA* (hace ${Math.abs(daysLeft)} días).`;
    } else if (daysLeft === 0) {
        emoji = '❗';
        messageText = `El socio *${socioName}* acaba de ingresar. Su membresía vence *HOY*.`;
    }

    const text = `${emoji} *Alerta de Sistema*\n\n${messageText}`;

    try {
        // We use fetch without awaiting it in the main thread if we don't want to block, 
        // but here it's inside an async helper, so we fetch and catch errors.
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
                    fotoUrl: socio.fotoUrl, // Map photo
                    estado: 'INACTIVO'
                }
            }
        }

        const hoy = new Date()
        const vence = new Date(suscripcion.fechaFin)
        const diffTime = vence.getTime() - hoy.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const fullName = `${socio.nombres} ${socio.apellidos || ''}`.trim()

        // Send telegram notification if 5 days or less remaining (including expired)
        if (diffDays <= 5) {
            // Fire and forget so we don't delay the scanner response
            sendTelegramAlert(fullName, diffDays).catch(console.error);
        }

        if (diffDays < 0) {
            return {
                success: false,
                message: 'Suscripción Vencida',
                socio: {
                    nombres: socio.nombres || '',
                    apellidos: socio.apellidos || '',
                    fotoUrl: socio.fotoUrl, // Map photo
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
                fotoUrl: socio.fotoUrl, // Map photo
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
