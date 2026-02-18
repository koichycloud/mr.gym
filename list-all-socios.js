const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socios = await prisma.socio.findMany({
        select: { codigo: true, nombres: true, apellidos: true, numeroDocumento: true }
    })
    console.log(JSON.stringify(socios, null, 2))
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
