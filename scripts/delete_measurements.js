
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const codesToDelete = ['001134', '001140']

    console.log(`Starting deletion of measurements for codes: ${codesToDelete.join(', ')}...`)

    for (const code of codesToDelete) {
        const socio = await prisma.socio.findUnique({
            where: { codigo: code },
            include: { medidas: true }
        })

        if (!socio) {
            console.log(`Socio with code ${code} not found. Skipping.`)
            continue
        }

        const count = socio.medidas.length
        if (count === 0) {
            console.log(`Socio ${code} (${socio.nombres}) has no measurements to delete.`)
            continue
        }

        console.log(`Deleting ${count} measurements for socio ${code} (${socio.nombres})...`)

        const result = await prisma.medidaFisica.deleteMany({
            where: { socioId: socio.id }
        })

        console.log(`Deleted ${result.count} records for ${code}.`)
    }

    console.log('Deletion process completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
