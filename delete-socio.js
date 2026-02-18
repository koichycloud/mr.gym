const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const deletedSocio = await prisma.socio.delete({
            where: { codigo: '001289' }
        })
        console.log('Socio deleted successfully:')
        console.log(JSON.stringify(deletedSocio, null, 2))
    } catch (error) {
        if (error.code === 'P2025') {
            console.log('Error: Socio not found.')
        } else {
            console.error('An error occurred during deletion:', error)
        }
    }
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
