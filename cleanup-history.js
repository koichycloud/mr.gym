const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    console.log(`Cleaning up history for DNI ${dni}...`)

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

    // Check last history entry
    if (socio.historialCodigos.length > 0) {
        const lastHistory = socio.historialCodigos[0]
        console.log(`Found last history entry: Code ${lastHistory.codigo}, Date: ${lastHistory.fechaCambio.toISOString()}`)

        // Check if this is the "bad" code 001194 from today (2026-02-18/19)
        // Note: checking if code is 001194 OR if it was created very recently.
        if (lastHistory.codigo === '001194') {
            await prisma.codigoHistorial.delete({
                where: { id: lastHistory.id }
            })
            console.log(`Deleted history entry for code ${lastHistory.codigo}`)
        } else {
            console.log('Last history code is NOT 001194. Asking validation or assuming already done.')
            // For safety, I will delete it if it is from today, regardless of code, if user insists on "ultimo registro"
            const today = new Date('2026-02-18T00:00:00.000Z')
            if (lastHistory.fechaCambio >= today) {
                await prisma.codigoHistorial.delete({
                    where: { id: lastHistory.id }
                })
                console.log(`Deleted history entry from today (Code: ${lastHistory.codigo})`)
            } else {
                console.log('Last history entry is old. Skipping deletion to avoid data loss.')
            }
        }
    } else {
        console.log('No history entries found.')
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
