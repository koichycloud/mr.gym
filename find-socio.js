const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socio = await prisma.socio.findUnique({
        where: { codigo: '001289' },
        include: {
            suscripciones: true,
            historialCodigos: true,
            medidas: true
        }
    })

    if (socio) {
        console.log('Socio found:')
        console.log(JSON.stringify(socio, null, 2))
    } else {
        console.log('Socio not found.')
    }
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
