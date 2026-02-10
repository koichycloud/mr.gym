
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const code = '001040'
    // We can check a few
    const socios = await prisma.socio.findMany({
        where: { codigo: code },
        select: { codigo: true, nombres: true, sexo: true }
    })

    console.log('Checking recent socios:')
    console.log(JSON.stringify(socios, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
