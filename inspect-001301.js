const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const codigo = '001301'
    const socio = await prisma.socio.findUnique({
        where: { codigo },
        include: {
            suscripciones: { orderBy: { createdAt: 'desc' } },
            historialCodigos: { orderBy: { fechaCambio: 'desc' } }
        }
    })

    if (!socio) {
        console.log(`Socio ${codigo} not found.`)
        process.exit(0)
    }

    console.log(`--- Socio ${codigo} ---`)
    console.log(`ID: ${socio.id}`)

    console.log('\nSubscriptions (Last 5):')
    socio.suscripciones.slice(0, 5).forEach(s => {
        console.log(`- CreatedAt: ${s.createdAt.toISOString()}, ID: ${s.id}, Meses: ${s.meses}`)
    })

    console.log('\nCode History (Last 5):')
    socio.historialCodigos.slice(0, 5).forEach(h => {
        console.log(`- FechaCambio: ${h.fechaCambio.toISOString()}, Code: ${h.codigo}`)
    })

    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
