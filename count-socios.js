const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.socio.count()
    console.log(`Total Socios: ${count}`)
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
