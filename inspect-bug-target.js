const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = '76554626'

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            historialCodigos: { orderBy: { fechaCambio: 'desc' } },
            suscripciones: { orderBy: { fechaInicio: 'desc' } }
        }
    })

    if (!socio) {
        console.log(`Socio with DNI ${dni} not found.`)
        return
    }

    console.log(`Socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id})`)
    console.log(`Current Code: ${socio.codigo}`)

    console.log('\n--- Subscriptions (Ordered by Start Date DESC) ---')
    socio.suscripciones.forEach((sub, i) => {
        console.log(`[${i}] Start: ${sub.fechaInicio.toISOString().split('T')[0]}, End: ${sub.fechaFin.toISOString().split('T')[0]}, CreatedAt: ${sub.createdAt.toISOString()}`)
    })

    console.log('\n--- Code History (Ordered by Change Date DESC) ---')
    socio.historialCodigos.forEach((h, i) => {
        console.log(`[${i}] Code: ${h.codigo}, Date: ${h.fechaCambio.toISOString()}`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
