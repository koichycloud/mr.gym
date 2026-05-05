
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Listando últimos 100 logs:')
    const logs = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { fecha: 'desc' }
    })

    logs.forEach(l => {
        console.log(`[${l.fecha.toISOString()}] ${l.accion}: ${l.detalles}`)
    })
}

main().finally(() => prisma.$disconnect())
