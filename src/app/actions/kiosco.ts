'use server'

import prisma from '@/lib/prisma'
import { getLimaStartOfDay } from '@/lib/date-utils'

export type AccessResult = {
    success: boolean
    message: string
    reason?: 'NOT_FOUND' | 'EXPIRED' | 'PASSBACK'
    tipoAcceso?: 'ENTRADA' | 'SALIDA'
    metodo?: 'AUTO' | 'MANUAL'
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

/**
 * Función de limpieza "Lazy" que cierra sesiones olvidadas.
 * Se ejecuta silenciosamente con el primer escaneo de cada turno.
 */
async function ejecutarLimpiezaAsistencias() {
    try {
        const ahora = new Date()
        // Ajuste a hora Lima (UTC-5) para comparaciones de horas del día
        const horaLima = new Date(ahora.getTime() - (5 * 60 * 60 * 1000))
        const h = horaLima.getUTCHours() + (horaLima.getUTCMinutes() / 60)
        
        const hoy = getLimaStartOfDay()
        
        // --- 1. LIMPIEZA DE MAÑANA (Receso 1:30 PM - 3:00 PM) ---
        // Se activa si son más de las 3:00 PM (15:00)
        if (h >= 15) {
            const fechaKey = hoy.toISOString().split('T')[0]
            const logAccion = `CLEANUP_MORNING_${fechaKey}`
            
            const yaLimpiado = await prisma.auditLog.findFirst({
                where: { accion: logAccion }
            })

            if (!yaLimpiado) {
                console.log(`[CLEANUP] Iniciando cierre automático del turno mañana (${fechaKey})...`)
                
                // Límite del turno mañana: 1:30 PM
                const limiteMañana = new Date(hoy.getTime())
                limiteMañana.setUTCHours(13 + 5, 30, 0, 0) // 13:30 Lima = 18:30 UTC

                // Encontrar socios que entraron pero no salieron en la mañana
                // Buscamos todas las asistencias de hoy antes de las 1:30pm
                const asistenciasHoy = await prisma.asistencia.findMany({
                    where: { fecha: { gte: hoy, lt: limiteMañana } },
                    orderBy: { fecha: 'asc' }
                })

                // Agrupar por socio para ver su último estado en ese rango
                const ultimoEstado: Record<string, string> = {}
                asistenciasHoy.forEach(a => {
                    ultimoEstado[a.socioId] = a.tipo
                })

                const sociosSinSalida = Object.keys(ultimoEstado).filter(id => ultimoEstado[id] === 'ENTRADA')

                if (sociosSinSalida.length > 0) {
                    await prisma.asistencia.createMany({
                        data: sociosSinSalida.map(id => ({
                            socioId: id,
                            tipo: 'SALIDA',
                            fecha: limiteMañana
                        }))
                    })
                    console.log(`[CLEANUP] Se cerraron ${sociosSinSalida.length} sesiones de la mañana.`)
                }

                await prisma.auditLog.create({
                    data: {
                        usuario: 'SYSTEM',
                        accion: logAccion,
                        detalles: `Cierre automático de turno mañana. Socios afectados: ${sociosSinSalida.length}`
                    }
                })
            }
        }

        // --- 2. LIMPIEZA DE NOCHE (Cierre 10:30 PM) ---
        // Se activa con el primer escaneo de la mañana (después de las 6:45 AM)
        if (h >= 6.75) {
            const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000)
            const fechaKeyAyer = ayer.toISOString().split('T')[0]
            const logAccionNoche = `CLEANUP_NIGHT_${fechaKeyAyer}`

            const yaLimpiadoNoche = await prisma.auditLog.findFirst({
                where: { accion: logAccionNoche }
            })

            if (!yaLimpiadoNoche) {
                console.log(`[CLEANUP] Iniciando cierre automático del turno noche anterior (${fechaKeyAyer})...`)
                
                const inicioAyer = getLimaStartOfDay(ayer)
                const limiteNocheAyer = new Date(inicioAyer.getTime())
                limiteNocheAyer.setUTCHours(22 + 5, 30, 0, 0) // 22:30 Lima = 03:30 UTC del día siguiente

                // Encontrar asistencias de "ayer" (desde inicio de ayer hasta inicio de hoy)
                const asistenciasAyer = await prisma.asistencia.findMany({
                    where: { fecha: { gte: inicioAyer, lt: hoy } },
                    orderBy: { fecha: 'asc' }
                })

                const ultimoEstadoAyer: Record<string, string> = {}
                asistenciasAyer.forEach(a => {
                    ultimoEstadoAyer[a.socioId] = a.tipo
                })

                const sociosSinSalidaNoche = Object.keys(ultimoEstadoAyer).filter(id => ultimoEstadoAyer[id] === 'ENTRADA')

                if (sociosSinSalidaNoche.length > 0) {
                    await prisma.asistencia.createMany({
                        data: sociosSinSalidaNoche.map(id => ({
                            socioId: id,
                            tipo: 'SALIDA',
                            fecha: limiteNocheAyer
                        }))
                    })
                    console.log(`[CLEANUP] Se cerraron ${sociosSinSalidaNoche.length} sesiones de la noche anterior.`)
                }

                await prisma.auditLog.create({
                    data: {
                        usuario: 'SYSTEM',
                        accion: logAccionNoche,
                        detalles: `Cierre automático de turno noche. Socios afectados: ${sociosSinSalidaNoche.length}`
                    }
                })
            }
        }
    } catch (e) {
        console.error('[CLEANUP] Error en limpieza automática:', e)
    }
}

export async function validateKioskAccess(codigo: string, mode: 'ENTRADA' | 'SALIDA' | 'AUTO' = 'AUTO'): Promise<AccessResult> {
    // Ejecutar limpieza automática en segundo plano (Lazy)
    ejecutarLimpiezaAsistencias().catch(console.error)

    // Normalize: trim whitespace and strip non-alphanumeric chars to handle scanner artifacts
    const cleanCodigo = codigo.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    console.log(`[KIOSCO] Intento de acceso - Código: "${cleanCodigo}" (raw: "${codigo}"), Modo: ${mode}`);
    try {
        // Verificar si el código pertenece a un miembro del personal activo
        const personal = await prisma.personal.findUnique({
            where: { codigo: cleanCodigo, activo: true }
        })

        if (personal) {
            console.log(`[KIOSCO] Personal detectado: ${personal.nombres} ${personal.apellidos} (${personal.codigo})`);
            return {
                success: true,
                message: 'PERSONAL_REDIRECT',
                tipoAcceso: 'ENTRADA',
                socio: {
                    nombres: personal.nombres,
                    apellidos: personal.apellidos,
                    estado: 'ACTIVO'
                }
            }
        }

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

        // --- Lógica de Inferencia Inteligente y Anti-Passback ---
        const ultimaAsistencia = await prisma.asistencia.findFirst({
            where: {
                socioId: socio.id,
                fecha: {
                    gte: new Date(hoy.getTime() - 24 * 60 * 60 * 1000) // revisamos últimas 24 horas
                }
            },
            orderBy: { fecha: 'desc' }
        })

        let tipoOperacion: 'ENTRADA' | 'SALIDA' = mode === 'AUTO' ? 'ENTRADA' : mode;
        const ahora = new Date();
        const horaLima = new Date(ahora.getTime() - (5 * 60 * 60 * 1000))
        const hActual = horaLima.getUTCHours() + (horaLima.getUTCMinutes() / 60)

        // Si el modo es AUTO, inferimos la acción
        if (mode === 'AUTO') {
            if (ultimaAsistencia) {
                const esHoy = new Date(ultimaAsistencia.fecha) >= hoy
                
                if (esHoy) {
                    // Si el último registro fue hoy, evaluamos si es cambio de turno o toggle
                    const horaUltima = new Date(new Date(ultimaAsistencia.fecha).getTime() - (5 * 60 * 60 * 1000))
                    const hUltima = horaUltima.getUTCHours() + (horaUltima.getUTCMinutes() / 60)

                    // ¿Es cambio de turno? (Entró antes de la 1:30pm y ahora es después de las 3:00pm)
                    const esCambioTurno = hUltima < 13.5 && hActual >= 15

                    if (esCambioTurno) {
                        // Forzamos ENTRADA porque es un nuevo turno, ignorando que no marcó salida en la mañana
                        tipoOperacion = 'ENTRADA'
                    } else if (ultimaAsistencia.tipo === 'ENTRADA') {
                        // Toggle normal: Si entró y han pasado > 10 min, es salida
                        const diffMs = ahora.getTime() - new Date(ultimaAsistencia.fecha).getTime()
                        if (diffMs > 10 * 60 * 1000) {
                            tipoOperacion = 'SALIDA'
                        } else {
                            tipoOperacion = 'ENTRADA' // Mantenemos para que el anti-passback bloquee el duplicado
                        }
                    } else {
                        // Si el último fue SALIDA, el siguiente es ENTRADA
                        tipoOperacion = 'ENTRADA'
                    }
                } else {
                    // Si el último registro no fue hoy, siempre es ENTRADA
                    tipoOperacion = 'ENTRADA'
                }
            } else {
                tipoOperacion = 'ENTRADA'
            }
        }

        const COOLDOWN_MINUTES = 15;

        // Validar anti-passback únicamente si intentan repetir la MISMA acción en menos de 15 minutos
        if (ultimaAsistencia) {
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
            metodo: mode === 'AUTO' ? 'AUTO' : 'MANUAL',
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
