const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const subId = 'c8864e89-1e9e-4167-aed1-be600fb6ecde'
    const newCode = '000822'

    console.log(`Updating Subscription ${subId}...`)
    console.log(`Setting Code to: ${newCode}`)

    const result = await prisma.suscripcion.update({
        where: { id: subId },
        data: { codigo: newCode }
    })

    console.log('Update successful!')
    console.log(`New Code: ${result.codigo}`)
    console.log(`Start Date: ${result.fechaInicio.toISOString()}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
