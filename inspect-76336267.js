const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = '76336267'
    const targetDate = '2025-10-20'

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: {
                orderBy: { fechaInicio: 'desc' }
            }
        }
    })

    if (!socio) {
        console.log(`Socio with DNI ${dni} not found.`)
        return
    }

    console.log(`Socio Found: ${socio.nombres} ${socio.apellidos}`)
    console.log('Subscriptions:')

    socio.suscripciones.forEach(sub => {
        console.log(`- ID: ${sub.id}`)
        console.log(`  Start: ${sub.fechaInicio.toISOString().split('T')[0]}`)
        console.log(`  End: ${sub.fechaFin.toISOString().split('T')[0]}`)
        console.log(`  Current Code: ${sub.codigo}`)

        // Check if this is the target
        const dateStr = sub.fechaInicio.toISOString().split('T')[0]
        if (dateStr === targetDate) {
            console.log('  *** TARGET MATCH ***')
        }
        console.log('---')
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
