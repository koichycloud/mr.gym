const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    console.log(`Deleting latest subscription for DNI ${dni}...`)

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    })

    if (!socio) {
        console.log('Socio not found')
        return
    }

    if (socio.suscripciones.length > 0) {
        const lastSub = socio.suscripciones[0]
        // Double check it's recent (created in last 24h) just to be safe, or just do it because user asked "ultimo movimiento"
        const created = new Date(lastSub.createdAt)
        const now = new Date()
        // If created in 2026, it's definitely the one.

        console.log(`Deleting subscription: ID ${lastSub.id}, Created ${created.toISOString()}, Start ${lastSub.fechaInicio.toISOString()}`)

        await prisma.suscripcion.delete({
            where: { id: lastSub.id }
        })
        console.log('Deleted.')
    } else {
        console.log('No subscriptions found to delete.')
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
