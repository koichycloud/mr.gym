
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Listando últimos 50 socios:')
    const socios = await prisma.socio.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: { codigo: true, nombres: true, apellidos: true, createdAt: true, numeroDocumento: true }
    })

    socios.forEach(s => {
        console.log(`[${s.createdAt.toISOString()}] Código: ${s.codigo} | Doc: ${s.numeroDocumento} | Nombre: ${s.nombres} ${s.apellidos}`)
    })
}

main().finally(() => prisma.$disconnect())
