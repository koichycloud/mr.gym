const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Cleaning database...')
    await prisma.suscripcion.deleteMany({}) // Explicitly delete subscriptions first just in case
    await prisma.socio.deleteMany({})
    console.log('Database cleared.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
