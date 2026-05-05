
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Listando últimos 20 socios:')
    const socios = await prisma.socio.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: { codigo: true, nombres: true, apellidos: true, createdAt: true }
    })

    socios.forEach(s => {
        console.log(`[${s.createdAt.toISOString()}] Código: ${s.codigo} | Nombre: ${s.nombres} ${s.apellidos}`)
    })

    const searchCode = '005558237'
    const found = await prisma.socio.findUnique({ where: { codigo: searchCode } })
    console.log(`\nBúsqueda exacta de ${searchCode}: ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`)

    const searchSim = '5558237'
    const foundSim = await prisma.socio.findMany({ where: { codigo: { contains: searchSim } } })
    console.log(`Búsqueda parcial de ${searchSim}: ${foundSim.length} coincidencias`)
}

main().finally(() => prisma.$disconnect())
