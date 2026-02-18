'use server'

import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-utils'
import { pagoSchema } from '@/lib/validations'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export async function registrarPago(data: z.infer<typeof pagoSchema>) {
    try {
        await requireAuth()

        const validation = pagoSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const validData = validation.data

        const pago = await prisma.pago.create({
            data: {
                socioId: validData.socioId || null,
                suscripcionId: validData.suscripcionId || null,
                monto: validData.monto,
                metodoPago: validData.metodoPago,
                concepto: validData.concepto,
                descripcion: validData.descripcion || null
            }
        })

        revalidatePath('/caja')
        revalidatePath('/')

        return { success: true, pago }
    } catch (error) {
        console.error('Error registrando pago:', error)
        return { success: false, error: 'Error al registrar el pago' }
    }
}

export async function getPagosDelDia() {
    try {
        await requireAuth()

        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const manana = new Date(hoy)
        manana.setDate(manana.getDate() + 1)

        const pagos = await prisma.pago.findMany({
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
                        apellidos: true
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        })

        const totalDia = pagos.reduce((acc, p) => acc + p.monto, 0)

        // Desglose por método
        const desglose: Record<string, number> = {}
        pagos.forEach(p => {
            desglose[p.metodoPago] = (desglose[p.metodoPago] || 0) + p.monto
        })

        return { pagos, totalDia, desglose }
    } catch (error) {
        console.error('Error obteniendo pagos del día:', error)
        return { pagos: [], totalDia: 0, desglose: {} }
    }
}

export async function getPagosPorRango(desde: Date, hasta: Date) {
    try {
        await requireAuth()

        const inicio = new Date(desde)
        inicio.setHours(0, 0, 0, 0)

        const fin = new Date(hasta)
        fin.setHours(23, 59, 59, 999)

        const pagos = await prisma.pago.findMany({
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
                        apellidos: true
                    }
                }
            },
            orderBy: {
                fecha: 'desc'
            }
        })

        const total = pagos.reduce((acc, p) => acc + p.monto, 0)

        const desglose: Record<string, number> = {}
        pagos.forEach(p => {
            desglose[p.metodoPago] = (desglose[p.metodoPago] || 0) + p.monto
        })

        return { pagos, total, desglose }
    } catch (error) {
        console.error('Error obteniendo pagos por rango:', error)
        return { pagos: [], total: 0, desglose: {} }
    }
}

export async function getResumenMensual() {
    try {
        await requireAuth()

        const hoy = new Date()
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999)

        const pagos = await prisma.pago.findMany({
            where: {
                fecha: {
                    gte: inicioMes,
                    lte: finMes
                }
            }
        })

        const totalMes = pagos.reduce((acc, p) => acc + p.monto, 0)

        const desglose: Record<string, number> = {}
        pagos.forEach(p => {
            desglose[p.metodoPago] = (desglose[p.metodoPago] || 0) + p.monto
        })

        const porConcepto: Record<string, number> = {}
        pagos.forEach(p => {
            porConcepto[p.concepto] = (porConcepto[p.concepto] || 0) + p.monto
        })

        return {
            totalMes,
            totalTransacciones: pagos.length,
            desglose,
            porConcepto
        }
    } catch (error) {
        console.error('Error obteniendo resumen mensual:', error)
        return { totalMes: 0, totalTransacciones: 0, desglose: {}, porConcepto: {} }
    }
}

export async function getTotalIngresosHoy() {
    try {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        const manana = new Date(hoy)
        manana.setDate(manana.getDate() + 1)

        const pagos = await prisma.pago.findMany({
            where: {
                fecha: {
                    gte: hoy,
                    lt: manana
                }
            },
            select: {
                monto: true
            }
        })

        return pagos.reduce((acc, p) => acc + p.monto, 0)
    } catch (error) {
        console.error('Error obteniendo total ingresos:', error)
        return 0
    }
}
