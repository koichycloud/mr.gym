const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const estados = await prisma.$queryRawUnsafe(`SELECT estado, COUNT(*) as count FROM "Suscripcion" GROUP BY estado`)
    console.log('ESTADOS:', JSON.stringify(estados))

    const activaExp = await prisma.suscripcion.count({ where: { estado: 'ACTIVA', fechaFin: { lt: today } } })
    const vencidaExp = await prisma.suscripcion.count({ where: { estado: 'VENCIDA', fechaFin: { lt: today } } })
    const anyExp = await prisma.suscripcion.count({ where: { fechaFin: { lt: today } } })

    console.log('ACTIVA+expired:', activaExp)
    console.log('VENCIDA+expired:', vencidaExp)
    console.log('ANY+expired:', anyExp)
}

main().catch(console.error).finally(() => prisma.$disconnect())
