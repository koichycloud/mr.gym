
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const searchString = '5558237'
    const socios = await prisma.socio.findMany({
        where: {
            OR: [
                { codigo: { contains: searchString } },
                { numeroDocumento: { contains: searchString } }
            ]
        },
        include: {
            pagos: true
        }
    })

    if (socios.length === 0) {
        console.log(`No se encontraron socios con el patrón ${searchString}`)
        return
    }

    socios.forEach(s => {
        console.log(`Encontrado: ${s.nombres} ${s.apellidos} | Código: ${s.codigo} | Pagos: ${s.pagos.length}`)
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
