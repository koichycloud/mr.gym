const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = '77700555'
    console.log(`Inspecting DNI ${dni}...`)

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: { orderBy: { fechaInicio: 'desc' } },
            historialCodigos: { orderBy: { fechaCambio: 'desc' } }
        }
    })

    if (!socio) {
        console.log('Socio not found')
        return
    }

    console.log(`Socio: ${socio.nombres} ${socio.apellidos} (Current Code: ${socio.codigo})`)

    console.log('--- Subscriptions ---')
    socio.suscripciones.forEach(s => {
        console.log(`ID: ${s.id}`)
        console.log(`  Start: ${s.fechaInicio.toISOString()}`) // Log ISO to confirm date match
        console.log(`  End: ${s.fechaFin.toISOString()}`)
        console.log(`  Code: ${s.codigo}`)
        console.log(`  Status: ${s.estado}`)
    })

    console.log('--- Code History ---')
    socio.historialCodigos.forEach(h => {
        console.log(`Code: ${h.codigo}, Date: ${h.fechaCambio.toISOString()}`)
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
