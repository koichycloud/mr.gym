
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const code = '001140'

    const socio = await prisma.socio.update({
        where: { codigo: code },
        data: { sexo: 'M' }
    })

    console.log(`Updated socio ${socio.nombres} (${socio.codigo}) to sexo: ${socio.sexo}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
