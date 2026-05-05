
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const searchString = '5558237'
    const socios = await prisma.socio.findMany({
        where: {
            OR: [
                { codigo: { contains: searchString } },
                { numeroDocumento: { contains: searchString } },
                { nombres: { contains: 'Prueba', mode: 'insensitive' } },
                { apellidos: { contains: 'Prueba', mode: 'insensitive' } }
            ]
        }
    })

    if (socios.length === 0) {
        console.log(`No se encontraron socios con el patrón ${searchString} o nombre 'Prueba'`)
        return
    }

    socios.forEach(s => {
        console.log(`Encontrado: ${s.nombres} ${s.apellidos} | Código: ${s.codigo} | Documento: ${s.numeroDocumento} | ID: ${s.id}`)
    })
}

main().finally(() => prisma.$disconnect())
