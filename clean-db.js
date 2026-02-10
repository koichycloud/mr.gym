const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando limpieza de la base de datos...')

  try {
    // El orden importa por las claves foráneas, aunque el Cascade debería manejarlo.
    // Borramos explícitamente para asegurar.
    
    console.log('Borrando Suscripciones...')
    await prisma.suscripcion.deleteMany({})

    console.log('Borrando Historial de Códigos...')
    await prisma.codigoHistorial.deleteMany({})

    console.log('Borrando Socios...')
    await prisma.socio.deleteMany({})

    console.log('¡Base de datos limpiada exitosamente!')
  } catch (e) {
    console.error('Error durante la limpieza:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
