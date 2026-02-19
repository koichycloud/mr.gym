const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    console.log(`Inspecting all records for DNI ${dni}...`)

    const socios = await prisma.socio.findMany({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: {
                orderBy: { createdAt: 'desc' }
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
            }
        }
    })

    if (socios.length === 0) {
        console.log('No socios found.')
    } else {
        console.log(`Found ${socios.length} records.`)
        socios.forEach((s, index) => {
            console.log(`\n--- RECORD #${index + 1} ---`)
            console.log(`ID: ${s.id}`)
            console.log(`Code: ${s.codigo}`)
            console.log(`Name: ${s.nombres} ${s.apellidos}`)
            console.log(`Created: ${s.createdAt ? s.createdAt.toISOString() : 'N/A'}`)
            console.log(`Updated: ${s.updatedAt ? s.updatedAt.toISOString() : 'N/A'}`)

            console.log('Subscriptions:')
            s.suscripciones.forEach(sub => {
                console.log(`  - ID: ${sub.id}, Created: ${sub.createdAt.toISOString()}, Meses: ${sub.meses}, Start: ${sub.fechaInicio.toISOString()}, End: ${sub.fechaFin.toISOString()}, State: ${sub.estado}`)
            })

            console.log('History:')
            s.historialCodigos.forEach(h => {
                console.log(`  - ID: ${h.id}, Date: ${h.fechaCambio.toISOString()}, Code: ${h.codigo}`)
            })
        })
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
