const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const subId = 'acd25240-53c2-48f5-9080-83384b368ff7'
    const newCode = '000831'

    console.log(`Updating Subscription ID: ${subId}`)
    console.log(`Setting Code to: ${newCode}`)

    const updated = await prisma.suscripcion.update({
        where: { id: subId },
        data: { codigo: newCode }
    })

    console.log('Update successful!')
    console.log(`New Code: ${updated.codigo}`)
    console.log(`Start Date: ${updated.fechaInicio.toISOString()}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
