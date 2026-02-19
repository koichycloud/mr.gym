const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const code = '000808'

    const socio = await prisma.socio.findUnique({
        where: { codigo: code },
        include: {
            historialCodigos: { orderBy: { fechaCambio: 'desc' } },
            suscripciones: { orderBy: { fechaInicio: 'desc' } }
        }
    })

    if (!socio) {
        console.log(`Socio with code ${code} not found.`)
        return
    }

    console.log(`Socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id})`)
    console.log(`Current Code: ${socio.codigo}`)

    console.log('\n--- Subscriptions ---')
    socio.suscripciones.forEach((sub, i) => {
        console.log(`[${i}] Start: ${sub.fechaInicio.toISOString().split('T')[0]}, End: ${sub.fechaFin.toISOString().split('T')[0]}, State: ${sub.estado}`)
    })

    console.log('\n--- Code History ---')
    socio.historialCodigos.forEach((h, i) => {
        console.log(`[${i}] Code: ${h.codigo}, Date: ${h.fechaCambio.toISOString()}, ID: ${h.id}`)
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
