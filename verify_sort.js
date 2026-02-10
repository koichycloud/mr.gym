const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const socios = await prisma.socio.findMany({
        orderBy: { codigo: 'desc' },
        select: { codigo: true }
    })

    console.log('--- Socios Ordering Check ---')
    socios.forEach(s => console.log(s.codigo))
    console.log('-----------------------------')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
