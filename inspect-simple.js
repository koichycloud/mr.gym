const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    console.log(`Checking DNI ${dni}`)

    const socios = await prisma.socio.findMany({
        where: { numeroDocumento: dni },
        include: { suscripciones: true }
    })

    for (const s of socios) {
        console.log(`SOCIO: ${s.nombres} (Code: ${s.codigo})`)
        console.log('SUBSCRIPTIONS:')
        for (const sub of s.suscripciones) {
            console.log(`- ID: ${sub.id}`)
            console.log(`  Start: ${sub.fechaInicio.toISOString().split('T')[0]}`)
            console.log(`  End: ${sub.fechaFin.toISOString().split('T')[0]}`)
        }
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
