const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    // Target subscription to delete
    // Based on previous output:
    // - ID: f64ba2fe-d3d4-4434-9c46-61ad9b627adf (Start: 2025-10-15)
    // - ID: 8f3e2856-79e9-4453-b90c-f144d4c79609 (Start: 2025-10-15)

    // User asked to delete "the one with start date 15/10/2025" which applies to both.
    // I will delete one of them. Let's delete f64ba2fe...
    const idToDelete = 'f64ba2fe-d3d4-4434-9c46-61ad9b627adf'

    console.log(`Deleting subscription ${idToDelete}...`)
    await prisma.suscripcion.delete({
        where: { id: idToDelete }
    })
    console.log('Deleted successfully.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
