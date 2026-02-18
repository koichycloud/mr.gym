const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRenewal() {
    const socioId = "5ec27b5e-d43b-4264-a2e1-2eb3bf2294a8" // Jose Correa Torres (000906)
    const nuevoCodigoRenovacion = "REC-2026-TEST-999"

    console.log('Testing renewal logic for socio 000906 directly via Prisma...')

    // Step 1: Create Renewal History Entry (Simulation of createSubscription logic)
    await prisma.codigoHistorial.create({
        data: {
            socioId: socioId,
            codigo: nuevoCodigoRenovacion
        }
    })

    // Step 2: Create Subscription Entry
    const fechaInicio = new Date()
    const fechaFin = new Date()
    fechaFin.setMonth(fechaFin.getMonth() + 1)

    await prisma.suscripcion.create({
        data: {
            socioId: socioId,
            meses: 1,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            estado: 'ACTIVA'
        }
    })

    // Verify DB state
    const socio = await prisma.socio.findUnique({
        where: { id: socioId },
        include: { historialCodigos: true, suscripciones: { orderBy: { createdAt: 'desc' } } }
    })

    console.log('--- Verification Results ---')
    console.log('Socio Name:', socio.nombres, socio.apellidos)
    console.log('Primary Code (Static):', socio.codigo) // Should be 000906

    const hasTestCode = socio.historialCodigos.some(h => h.codigo === nuevoCodigoRenovacion)
    console.log(`Renewal Code '${nuevoCodigoRenovacion}' in History:`, hasTestCode ? 'YES ✅' : 'NO ❌')

    const latestSub = socio.suscripciones[0]
    console.log('Latest Subscription created:', latestSub ? 'YES ✅' : 'NO ❌')

    process.exit(0)
}

testRenewal().catch(e => {
    console.error(e)
    process.exit(1)
})
