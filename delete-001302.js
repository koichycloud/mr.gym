const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const codigo = '001302'
    console.log(`Searching for socio with code ${codigo}...`)

    const socio = await prisma.socio.findUnique({
        where: { codigo }
    })

    if (!socio) {
        console.log(`Socio with code ${codigo} not found.`)
        process.exit(0)
    }

    console.log(`Found socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id}). Deleting...`)

    await prisma.socio.delete({
        where: { id: socio.id }
    })

    console.log(`Socio ${codigo} deleted successfully.`)
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
