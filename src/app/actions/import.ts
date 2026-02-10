'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

import * as XLSX from 'xlsx'

export async function importSocios(data: any[], mapping: Record<string, string>) {
    try {
        const results = await prisma.$transaction(async (tx) => {
            const createdSocios = []

            // Get all existing codes and documents
            const existingData = await tx.socio.findMany({
                select: { codigo: true, numeroDocumento: true }
            })

            let maxNum = 0
            const takenCodes = new Set<string>()
            const takenDocuments = new Set<string>()

            existingData.forEach(s => {
                takenCodes.add(s.codigo)
                takenDocuments.add(s.numeroDocumento)
                const num = parseInt(s.codigo)
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num
                }
            })

            let nextCodeNum = maxNum + 1
            const skippedRecords: any[] = []

            for (const row of data) {
                const getVal = (field: string) => {
                    const colName = mapping[field]
                    return colName ? row[colName] : null
                }

                // Documento Logic: Ensure uniqueness
                let numeroDocumento = String(getVal('dni') || getVal('numeroDocumento') || '')
                if (!numeroDocumento || numeroDocumento === '0' || numeroDocumento === '00000000') {
                    // Generate a unique placeholder if missing or invalid
                    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000)
                    numeroDocumento = `SD-${uniqueSuffix}`
                }

                // Check for duplicate document
                if (takenDocuments.has(numeroDocumento)) {
                    skippedRecords.push({
                        ...row,
                        REASON: 'Documento duplicado',
                        DUPLICATE_DOC: numeroDocumento
                    })
                    continue // Skip this row
                }

                // Mark document as taken for subsequent rows in this batch
                takenDocuments.add(numeroDocumento)

                // Generate or validate Code
                let codigoRaw = getVal('codigo')
                let codigo = codigoRaw ? String(codigoRaw).padStart(6, '0') : ''

                // If no code provided or code already taken
                if (!codigo || takenCodes.has(codigo)) {
                    while (takenCodes.has(String(nextCodeNum).padStart(6, '0'))) {
                        nextCodeNum++
                    }
                    codigo = String(nextCodeNum).padStart(6, '0')
                    nextCodeNum++
                }

                // Track this code as taken
                takenCodes.add(codigo)

                // Optional fields
                const nombres = getVal('nombres')
                const apellidos = getVal('apellidos')

                // Helper to parse date
                const parseExcelDate = (val: any): Date => {
                    if (!val) return new Date()
                    if (typeof val === 'number') {
                        return new Date(Math.round((val - 25569) * 86400 * 1000))
                    }
                    const parsed = new Date(val)
                    if (!isNaN(parsed.getTime())) return parsed
                    return new Date()
                }

                let fechaNacimiento = parseExcelDate(getVal('fechaNacimiento'))

                // Create socio
                const socio = await tx.socio.create({
                    data: {
                        codigo,
                        nombres: nombres ? String(nombres) : 'Socio',
                        apellidos: apellidos ? String(apellidos) : 'Sin Apellido',
                        tipoDocumento: 'DNI',
                        numeroDocumento,
                        fechaNacimiento,
                        telefono: getVal('telefono') ? String(getVal('telefono')) : null,
                    }
                })

                // Create initial subscription if months provided
                const mesesRaw = getVal('meses')
                if (mesesRaw && Number(mesesRaw) > 0) {
                    const meses = Number(mesesRaw)
                    const fInicioRaw = getVal('fechaInicio')
                    let fechaInicio = new Date()
                    if (fInicioRaw) {
                        if (typeof fInicioRaw === 'number') {
                            fechaInicio = new Date(Math.round((fInicioRaw - 25569) * 86400 * 1000))
                        } else {
                            const parsed = new Date(fInicioRaw)
                            if (!isNaN(parsed.getTime())) fechaInicio = parsed
                        }
                    }

                    const fechaFin = new Date(fechaInicio)
                    if (!isNaN(fechaFin.getTime())) {
                        fechaFin.setMonth(fechaFin.getMonth() + meses)
                        await tx.suscripcion.create({
                            data: {
                                socioId: socio.id,
                                meses,
                                fechaInicio,
                                fechaFin,
                                estado: 'ACTIVA'
                            }
                        })
                    }
                }

                createdSocios.push(socio)
            }

            return { created: createdSocios, skippedRecords }
        })

        // Generate Report if needed
        let skippedReportBase64 = null
        if (results.skippedRecords.length > 0) {
            const ws = XLSX.utils.json_to_sheet(results.skippedRecords)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Omitidos")
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
            skippedReportBase64 = buf.toString('base64')
        }

        revalidatePath('/socios')
        revalidatePath('/')
        return {
            success: true,
            count: results.created.length,
            skippedCount: results.skippedRecords.length,
            skippedRecords: results.skippedRecords,
            skippedReportBase64
        }
    } catch (error) {
        console.error('Import error DETAILS:', error)
        if (error instanceof Error) {
            console.error('Message:', error.message)
            console.error('Stack:', error.stack)
        }
        return { success: false, error: error instanceof Error ? `Error detallado: ${error.message}` : 'Error desconocido durante la importación.' }
    }
}
