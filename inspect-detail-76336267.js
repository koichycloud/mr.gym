const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = '76336267'

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: {
                orderBy: { fechaInicio: 'desc' }
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
            }
        }
    })

    if (!socio) {
        console.log(`Socio with DNI ${dni} not found.`)
        return
    }

    console.log(`Socio: ${socio.nombres} ${socio.apellidos}`)
    console.log(`Current Code (Socio.codigo): ${socio.codigo}`)

    console.log('\n--- Historial de Códigos ---')
    socio.historialCodigos.forEach(h => {
        console.log(`Code: ${h.codigo} | Changed: ${h.fechaCambio.toISOString()} | Anterior: ${h.codigoAnterior}`)
    })

    console.log('\n--- Suscripciones ---')
    socio.suscripciones.forEach(sub => {
        console.log(`ID: ${sub.id}`)
        console.log(`Code: ${sub.codigo}`)
        console.log(`Start: ${sub.fechaInicio.toISOString().split('T')[0]}`)
        console.log(`End: ${sub.fechaFin.toISOString().split('T')[0]}`)
        console.log('---')
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
