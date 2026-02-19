const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    console.log(`Undoing last code change for DNI ${dni}...`)

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' },
                take: 1
            }
        }
    })

    if (!socio) {
        console.log('Socio not found')
        return
    }

    if (socio.historialCodigos.length > 0) {
        const lastHistory = socio.historialCodigos[0]
        console.log(`Current Code: ${socio.codigo}`)
        console.log(`Restoring Code from history: ${lastHistory.codigo} (Date: ${lastHistory.fechaCambio.toISOString()})`)

        // Update socio code back to old one
        await prisma.socio.update({
            where: { id: socio.id },
            data: { codigo: lastHistory.codigo }
        })

        // Delete the history entry (since we reverted, we don't want a record of "changing back" effectively, or we want to wipe the "mistake")
        // User asked to "revert", so wiping the history of the mistake is best.
        await prisma.codigoHistorial.delete({
            where: { id: lastHistory.id }
        })

        console.log(`Reverted successfully. Socio is now ${lastHistory.codigo}.`)
    } else {
        console.log('No history found to revert.')
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
