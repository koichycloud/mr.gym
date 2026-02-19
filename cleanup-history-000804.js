const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    console.log(`Cleaning up history 000804 for DNI ${dni}...`)

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' },
            }
        }
    })

    if (!socio) {
        console.log('Socio not found')
        return
    }

    // Find history entry with code 000804
    const targetHistory = socio.historialCodigos.find(h => h.codigo === '000804')

    if (targetHistory) {
        console.log(`Found history entry: Code ${targetHistory.codigo}, Date: ${targetHistory.fechaCambio.toISOString()}`)

        await prisma.codigoHistorial.delete({
            where: { id: targetHistory.id }
        })
        console.log(`Deleted history entry for code ${targetHistory.codigo}`)
    } else {
        console.log('No history entry found for code 000804.')
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
