'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { socioSchema } from '@/lib/validations'
import { z } from 'zod'
import { logAction } from '@/lib/audit'

/** Capitalizes the first letter of each word (supports accented characters) */
function toTitleCase(str: string | null | undefined): string | null {
    if (!str) return null
    return str.trim().toLowerCase().split(/\s+/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
}

export async function getNextCode() {
    const lastSocio = await prisma.socio.findFirst({
        orderBy: {
            codigo: 'desc'
        }
    })

    if (!lastSocio) {
        return '000001'
    }

    const lastCode = lastSocio.codigo
    const match = lastCode.match(/(\d+)$/)

    if (match) {
        const numberPart = match[1]
        const nextNum = parseInt(numberPart, 10) + 1
        return String(nextNum).padStart(6, '0')
    }

    return '000001'
}

export async function createSocio(data: z.infer<typeof socioSchema>) {
    try {
        await requireAuth() // 🔒 Protected

        const validation = socioSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const { suscripcion, ...socioData } = validation.data
        const formattedCode = socioData.codigo.padStart(6, '0')

        // Prepare subscription create data if provided
        let suscripcionesCreate = undefined
        if (suscripcion && suscripcion.meses > 0) {
            const fechaFin = new Date(suscripcion.fechaInicio)
            fechaFin.setMonth(fechaFin.getMonth() + suscripcion.meses)

            // Dynamic status based on date
            const estado = fechaFin < new Date() ? 'VENCIDA' : 'ACTIVA'

            suscripcionesCreate = {
                create: [{
                    meses: suscripcion.meses,
                    fechaInicio: suscripcion.fechaInicio,
                    fechaFin: fechaFin,
                    estado: estado,
                    codigo: formattedCode // Save snapshot
                }]
            }
        }

        const socio = await prisma.socio.create({
            data: {
                codigo: formattedCode,
                tipoDocumento: socioData.tipoDocumento,
                numeroDocumento: socioData.numeroDocumento,
                fechaNacimiento: socioData.fechaNacimiento,
                sexo: socioData.sexo,
                nombres: toTitleCase(socioData.nombres),
                apellidos: toTitleCase(socioData.apellidos),
                telefono: socioData.telefono,
                fotoUrl: socioData.fotoUrl,
                suscripciones: suscripcionesCreate
            },
            include: {
                suscripciones: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        // If subscription was created, register payment
        if (socio.suscripciones.length > 0 && (suscripcion?.planId || (suscripcion?.monto ?? 0) > 0)) {
            let monto = (suscripcion?.monto ?? 0)
            let nombrePlan = 'Personalizado'

            if (suscripcion?.planId) {
                const plan = await prisma.plan.findUnique({
                    where: { id: suscripcion.planId }
                })
                if (plan) {
                    monto = plan.precio
                    nombrePlan = plan.nombre
                }
            }

            if (monto > 0) {
                await prisma.pago.create({
                    data: {
                        socioId: socio.id,
                        suscripcionId: socio.suscripciones[0].id,
                        monto: monto,
                        metodoPago: suscripcion?.metodoPago || 'EFECTIVO',
                        concepto: 'SUSCRIPCION',
                        descripcion: `Suscripción inicial: ${nombrePlan}`
                    }
                })
            }
        }

        await logAction('CREAR_SOCIO', `Creó al socio ${formattedCode} - ${socioData.nombres} ${socioData.apellidos}`)

        revalidatePath('/socios')
        revalidatePath('/')
        return { success: true, socio }
    } catch (error) {
        console.error('Error creating socio:', error)
        return { success: false, error: 'Error al crear socio. Verifique que el código o DNI no existan.' }
    }
}


async function updateExpiredSubscriptions() {
    await prisma.suscripcion.updateMany({
        where: {
            estado: 'ACTIVA',
            fechaFin: { lt: new Date() }
        },
        data: {
            estado: 'VENCIDA'
        }
    })
}

export async function getSocios() {
    await requireAuth() // 🔒 Protected
    await updateExpiredSubscriptions() // Lazy update
    return await prisma.socio.findMany({
        orderBy: { codigo: 'desc' },
        include: {
            suscripciones: {
                // REMOVED: where: { estado: 'ACTIVA' }
                // We want the latest subscription regardless of status to correctly show "Vencida" if applicable
                orderBy: { fechaFin: 'desc' },
                include: { plan: true },
                take: 1
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
            }
        }
    })
}

export async function getSocioById(id: string) {
    await requireAuth() // 🔒 Protected
    await updateExpiredSubscriptions() // Lazy update
    return await prisma.socio.findUnique({
        where: { id },
        include: {
            suscripciones: {
                orderBy: { codigo: 'desc' }, // Higher code = more recent boleta, shown first
                include: { plan: true }
            },
            historialCodigos: {
                orderBy: { codigo: 'desc' } // Same logic for code history
            }
        }
    })
}

export async function updateSocio(id: string, data: z.infer<typeof socioSchema>) {
    try {
        await requireAuth() // 🔒 Protected

        const updateSchema = socioSchema.partial().extend({
            codigo: z.string().min(1, "El código es requerido").max(10),
            tipoDocumento: z.string(),
            numeroDocumento: z.string(),
            fechaNacimiento: z.coerce.date(),
        })

        const validation = updateSchema.safeParse(data)
        if (!validation.success) {
            return { success: false, error: validation.error.issues[0].message }
        }

        const { suscripcion, ...socioData } = validation.data
        const formattedCode = socioData.codigo.padStart(6, '0')

        // We need to fetch the existing socio to compare the old code and see if
        // history needs to be saved (only save if code changed AND we are adding a subscription)
        const oldSocio = await prisma.socio.findUnique({ where: { id } })
        if (!oldSocio) return { success: false, error: 'Socio no encontrado' }

        // Prepare subscription create data if provided
        let suscripcionesCreate = undefined
        if (suscripcion && suscripcion.meses > 0) {
            const fechaFin = new Date(suscripcion.fechaInicio)
            fechaFin.setMonth(fechaFin.getMonth() + suscripcion.meses)

            // Dynamic status based on date
            const estado = fechaFin < new Date() ? 'VENCIDA' : 'ACTIVA'

            suscripcionesCreate = {
                create: [{
                    meses: suscripcion.meses,
                    fechaInicio: suscripcion.fechaInicio,
                    fechaFin: fechaFin,
                    estado: estado,
                    codigo: formattedCode // Save snapshot
                }]
            }
        }

        // If the code is modified, we must ALWAYS save the old code to history
        // independently of whether a new subscription is being created or not.
        let historialCreate = undefined
        if (oldSocio.codigo !== formattedCode) {
            historialCreate = {
                create: [{
                    codigo: oldSocio.codigo,
                    fechaCambio: new Date()
                }]
            }
        }

        const socio = await prisma.socio.update({
            where: { id },
            data: {
                ...socioData,
                nombres: toTitleCase(socioData.nombres),
                apellidos: toTitleCase(socioData.apellidos),
                codigo: formattedCode,
                suscripciones: suscripcionesCreate,
                historialCodigos: historialCreate
            }
        })
        revalidatePath('/socios')
        revalidatePath(`/socios/${id}`)
        revalidatePath('/')

        // Build a detailed field-level diff for the audit log
        const labelMap: Record<string, string> = {
            nombres: 'Nombres',
            apellidos: 'Apellidos',
            codigo: 'Código',
            tipoDocumento: 'Tipo Doc.',
            numeroDocumento: 'Nro. Doc.',
            telefono: 'Teléfono',
            sexo: 'Sexo',
        }
        const formatDate = (d: Date | string | null | undefined) =>
            d ? new Date(d).toLocaleDateString('es-PE') : '—'

        const changes: string[] = []

        for (const key of Object.keys(labelMap)) {
            const oldVal = (oldSocio as Record<string, unknown>)[key]
            const newVal = key === 'codigo' ? formattedCode : (socioData as Record<string, unknown>)[key] ?? null
            const oldStr = oldVal != null ? String(oldVal) : '—'
            const newStr = newVal != null ? String(newVal) : '—'
            if (oldStr !== newStr) {
                changes.push(`${labelMap[key]}: "${oldStr}" → "${newStr}"`)
            }
        }

        // Check fechaNacimiento separately
        const oldFecha = formatDate(oldSocio.fechaNacimiento)
        const newFecha = formatDate(socioData.fechaNacimiento)
        if (oldFecha !== newFecha) {
            changes.push(`Fecha Nac.: "${oldFecha}" → "${newFecha}"`)
        }

        const diffStr = changes.length > 0 ? changes.join(' | ') : 'Sin cambios detectados'
        await logAction('EDITAR_SOCIO', `Socio ${formattedCode} - ${socioData.nombres} ${socioData.apellidos}: ${diffStr}`)

        return { success: true, socio }
    } catch (error) {
        console.error('Error updating socio:', error)
        return { success: false, error: 'Error al actualizar socio.' }
    }
}

// ... existing exports ...

export async function checkSocioExists(tipoDocumento: string, numeroDocumento: string) {
    await requireAuth() // 🔒 Protected
    return await prisma.socio.findFirst({
        where: {
            tipoDocumento: tipoDocumento,
            numeroDocumento: numeroDocumento
        }
    })
}

import { requireAdmin } from '@/lib/auth-utils'

export async function deleteSocio(id: string) {
    try {
        await requireAdmin() // 🔒 Admin Only

        const socio = await prisma.socio.findUnique({ where: { id } })
        if (socio) {
            await logAction('ELIMINAR_SOCIO', `Eliminó al socio ${socio.codigo} - ${socio.nombres} ${socio.apellidos}`)
        }

        await prisma.socio.delete({
            where: { id }
        })

        revalidatePath('/socios')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Error deleting socio:', error)
        return { success: false, error: 'Error al eliminar socio.' }
    }
}
