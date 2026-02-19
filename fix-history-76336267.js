const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = '76336267'
    const oldCode = '000831'
    const changeDate = new Date('2026-01-29T00:00:00Z') // Start date of current sub

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni }
    })

    if (!socio) {
        console.log('Socio not found')
        return
    }

    console.log(`Adding history record for ${socio.nombres}...`)

    await prisma.codigoHistorial.create({
        data: {
            socioId: socio.id,
            codigo: oldCode,
            fechaCambio: changeDate
        }
    })

    console.log('History record created!')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
