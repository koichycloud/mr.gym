const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socioId = "5ec27b5e-d43b-4264-a2e1-2eb3bf2294a8" // Jose Correa Torres (000906)
    const socio = await prisma.socio.findUnique({
        where: { id: socioId },
        include: {
            suscripciones: { orderBy: { createdAt: 'desc' }, take: 5 },
            historialCodigos: { orderBy: { fechaCambio: 'desc' }, take: 5 }
        }
    })

    console.log('--- Socio 000906 Recent Records ---')
    console.log('Subscriptions:')
    socio.suscripciones.forEach(s => console.log(`ID: ${s.id}, CreatedAt: ${s.createdAt}, Months: ${s.meses}`))

    console.log('\nRenewal Code History:')
    socio.historialCodigos.forEach(h => console.log(`ID: ${h.id}, Date: ${h.fechaCambio}, Code: ${h.codigo}`))

    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
