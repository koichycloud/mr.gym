const { createSubscription } = require('./src/app/actions/suscripciones')

async function testRenewal() {
    const socioId = "5ec27b5e-d43b-4264-a2e1-2eb3bf2294a8" // Jose Correa Torres (000906)
    const data = {
        socioId: socioId,
        meses: 1,
        fechaInicio: new Date(),
        fechaFin: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        nuevoCodigo: "REC-2026-001" // This should go to history
    }

    console.log('Testing renewal for socio 000906...')
    const result = await createSubscription(data)
    console.log('Result:', JSON.stringify(result, null, 2))

    // Verify DB state
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    const socio = await prisma.socio.findUnique({
        where: { id: socioId },
        include: { historialCodigos: true, suscripciones: true }
    })

    console.log('Updated Socio Info:')
    console.log('Primary Code:', socio.codigo) // Should still be 000906
    console.log('Codes in History:', socio.historialCodigos.map(h => h.codigo))

    process.exit(0)
}

testRenewal().catch(e => {
    console.error(e)
    process.exit(1)
})
