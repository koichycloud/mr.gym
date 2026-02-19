const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: {
                orderBy: { createdAt: 'desc' },
                take: 5
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' },
                take: 5
            }
        }
    })

    if (!socio) {
        console.log('Socio not found')
    } else {
        console.log(`Socio: ${socio.nombres} ${socio.apellidos} (Code: ${socio.codigo})`)
        console.log(`UpdatedAt: ${socio.updatedAt}`)

        console.log('\nSubscriptions:')
        socio.suscripciones.forEach(s => {
            console.log(`- Created: ${s.createdAt.toISOString().split('T')[0]}, Start: ${s.fechaInicio.toISOString().split('T')[0]}, End: ${s.fechaFin.toISOString().split('T')[0]}, State: ${s.estado}`)
        })

        console.log('\nHistory:')
        socio.historialCodigos.forEach(h => {
            console.log(`- Date: ${h.fechaCambio.toISOString()}, Code: ${h.codigo}`)
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
