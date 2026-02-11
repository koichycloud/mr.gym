'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
        // If the code is purely numeric or ends in numbers, increment
        const nextNum = parseInt(numberPart, 10) + 1
        return String(nextNum).padStart(6, '0')
    }

    // Fallback if last code is completely weird
    return '000001'
}

export async function createSocio(data: {
    codigo: string
    nombres?: string
    apellidos?: string
    tipoDocumento: string
    numeroDocumento: string
    fechaNacimiento: Date
    sexo: string
    telefono?: string
    suscripcion?: {
        meses: number
        fechaInicio: Date
    }
}) {
    try {
        const { suscripcion, ...socioData } = data

        // Auto-format code to 6 digits on save
        const formattedCode = socioData.codigo.padStart(6, '0')

        // Prepare subscription create data if provided
        let suscripcionesCreate = undefined
        if (suscripcion && suscripcion.meses > 0) {
            const fechaFin = new Date(suscripcion.fechaInicio)
            // Add months correctly
            fechaFin.setMonth(fechaFin.getMonth() + suscripcion.meses)

            suscripcionesCreate = {
                create: [{
                    meses: suscripcion.meses,
                    fechaInicio: suscripcion.fechaInicio,
                    fechaFin: fechaFin,
                    estado: 'ACTIVA'
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

export async function getSocios() {
    return await prisma.socio.findMany({
        orderBy: { codigo: 'desc' },
        include: {
            suscripciones: {
                where: { estado: 'ACTIVA' },
                orderBy: { fechaFin: 'desc' },
                take: 1
            }
        }
    })
}

export async function getSocioById(id: string) {
    return await prisma.socio.findUnique({
        where: { id },
        include: {
            suscripciones: {
                orderBy: { fechaFin: 'desc' }
            }
        }
    })
}

export async function updateSocio(id: string, data: {
    codigo: string
    nombres?: string
    apellidos?: string
    tipoDocumento: string
    numeroDocumento: string
    fechaNacimiento: Date
    telefono?: string
}) {
    try {
        const formattedCode = data.codigo.padStart(6, '0')

        const socio = await prisma.socio.update({
            where: { id },
            data: {
                ...data,
                codigo: formattedCode
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

export async function checkSocioExists(tipoDocumento: string, numeroDocumento: string) {
    const socio = await prisma.socio.findFirst({
        where: {
            tipoDocumento: tipoDocumento,
            numeroDocumento: numeroDocumento
        }
    })
    return !!socio
}
