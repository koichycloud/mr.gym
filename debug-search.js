const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socios = await prisma.socio.findMany({
        where: {
            OR: [
                { nombres: { contains: 'Cesar', mode: 'insensitive' } },
                { apellidos: { contains: 'Carrasco', mode: 'insensitive' } }
            ]
        }
    })
    console.log('Socios found:', JSON.stringify(socios, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
