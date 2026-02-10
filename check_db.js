const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.socio.count()
    console.log('Total Socios:', count)

    if (count > 0) {
        const last = await prisma.socio.findFirst({ orderBy: { createdAt: 'desc' }, include: { suscripciones: true } })
        console.log('Último socio:', JSON.stringify(last, null, 2))
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
