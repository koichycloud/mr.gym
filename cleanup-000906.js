const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socioId = "5ec27b5e-d43b-4264-a2e1-2eb3bf2294a8" // Jose Correa Torres (000906)

    // IDs found in previous search (Note: list-recent output was truncated but IDs from test-renewal-fix are known/patterned)
    // Let's search by date and content to be safe.

    console.log('Cleaning up today\'s test records for socio 000906...')

    // 1. Delete Renewal Code History containing 'REC-2026-TEST'
    const deletedHistory = await prisma.codigoHistorial.deleteMany({
        where: {
            socioId: socioId,
            codigo: { contains: 'REC-2026-TEST' }
        }
    })
    console.log(`Deleted ${deletedHistory.count} history entries.`)

    // 2. Delete Subscriptions created today for this socio
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deletedSubs = await prisma.suscripcion.deleteMany({
        where: {
            socioId: socioId,
            createdAt: { gte: today },
            // To be even safer, check if it matches the test months (1)
            meses: 1
        }
    })
    console.log(`Deleted ${deletedSubs.count} subscriptions.`)

    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
