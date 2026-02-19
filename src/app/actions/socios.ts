'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { socioSchema } from '@/lib/validations'
import { z } from 'zod'

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
                nombres: socioData.nombres,
                apellidos: socioData.apellidos,
                telefono: socioData.telefono,
                fotoUrl: socioData.fotoUrl,
                suscripciones: suscripcionesCreate
            }
        })
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
                orderBy: { fechaFin: 'desc' }
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
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

        // Check if code is changing to record history
        const currentSocio = await prisma.socio.findUnique({ where: { id } })
        if (currentSocio && currentSocio.codigo !== formattedCode) {
            await prisma.codigoHistorial.create({
                data: {
                    socioId: id,
                    codigo: currentSocio.codigo
                }
            })
        }

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

        const socio = await prisma.socio.update({
            where: { id },
            data: {
                ...socioData,
                codigo: formattedCode,
                suscripciones: suscripcionesCreate
            }
        })
        revalidatePath('/socios')
        revalidatePath(`/socios/${id}`)
        revalidatePath('/')
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
