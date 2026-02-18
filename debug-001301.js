const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- Searching for Socio with code 001301 ---')
    const socio = await prisma.socio.findFirst({
        where: { OR: [{ codigo: '001301' }, { numeroDocumento: '001301' }] },
        include: {
            suscripciones: { orderBy: { createdAt: 'desc' } },
            historialCodigos: { orderBy: { fechaCambio: 'desc' } }
        }
    })

    if (socio) {
        console.log(`Found Socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id}, Codigo: ${socio.codigo})`)
        console.log('Subscriptions:', JSON.stringify(socio.suscripciones, null, 2))
        console.log('Code History:', JSON.stringify(socio.historialCodigos, null, 2))
    } else {
        console.log('Socio 001301 not found by code.')

        // Search latest 10 subscriptions in the whole system
        console.log('\n--- Searching for latest 10 subscriptions in the whole system ---')
        const latestSubs = await prisma.suscripcion.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { socio: true }
        })
        latestSubs.forEach(s => {
            console.log(`Sub ID: ${s.id}, Socio: ${s.socio.codigo}, CreatedAt: ${s.createdAt.toISOString()}`)
        })

        console.log('\n--- Searching for latest 10 history entries in the whole system ---')
        const latestHist = await prisma.codigoHistorial.findMany({
            orderBy: { fechaCambio: 'desc' },
            take: 10,
            include: { socio: true }
        })
        latestHist.forEach(h => {
            console.log(`Hist ID: ${h.id}, Socio: ${h.socio.codigo}, CreatedAt: ${h.fechaCambio.toISOString()}, Code: ${h.codigo}`)
        })
    }

    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
