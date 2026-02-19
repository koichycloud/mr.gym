const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // Current values
    const currentCode = '000808'
    const targetHistoryCode = '001218'

    // Desired values (Swap)
    const newCurrentCode = '001218'
    const newHistoryCode = '000808'

    const socio = await prisma.socio.findUnique({
        where: { codigo: currentCode },
        include: {
            historialCodigos: { orderBy: { fechaCambio: 'desc' }, take: 1 }
        }
    })

    if (!socio) {
        console.log(`Socio with code ${currentCode} not found.`)
        return
    }

    const latestHistory = socio.historialCodigos[0]
    if (!latestHistory) {
        console.log('No history found.')
        return
    }

    if (latestHistory.codigo !== targetHistoryCode) {
        console.log(`Mismatch! Expected latest history code to be ${targetHistoryCode} but found ${latestHistory.codigo}. Aborting.`)
        return
    }

    console.log(`Swapping codes for ${socio.nombres} ${socio.apellidos}...`)
    console.log(`Socio Code: ${currentCode} -> ${newCurrentCode}`)
    console.log(`History ID ${latestHistory.id}: ${latestHistory.codigo} -> ${newHistoryCode}`)

    // Transaction to ensure atomicity
    await prisma.$transaction([
        // 1. Update history FIRST (set to temp or directly if unique constraints allow? History code is not unique usually)
        // Actually, Socio.codigo IS unique. So if we set valid code to 001218, it might conflict if 001218 was already there?
        // Wait, 001218 is in HISTORY, so it's NOT a current code of someone else (unless duplicates exist, but we checked 001218 as current and found none).

        // We can update the history entry first to the new value (000808).
        prisma.codigoHistorial.update({
            where: { id: latestHistory.id },
            data: { codigo: newHistoryCode }
        }),
        // 2. Update socio code to new value (001218).
        prisma.socio.update({
            where: { id: socio.id },
            data: { codigo: newCurrentCode }
        })
    ])

    console.log('Swap completed successfully.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
