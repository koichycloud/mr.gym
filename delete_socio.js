
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const code = '005558237'
    const socio = await prisma.socio.findUnique({
        where: { codigo: code },
        include: {
            pagos: true,
            suscripciones: true,
            asistencias: true
        }
    })

    if (!socio) {
        console.log(`No se encontró al socio con código ${code}`)
        return
    }

    console.log(`Encontrado socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id})`)
    
    // Borrar pagos primero
    const deletedPagos = await prisma.pago.deleteMany({
        where: { socioId: socio.id }
    })
    console.log(`Eliminados ${deletedPagos.count} pagos.`)

    // Borrar al socio
    await prisma.socio.delete({
        where: { id: socio.id }
    })
    console.log(`Socio ${code} eliminado con éxito.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
