const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    const users = await prisma.user.findMany()
    console.log('USUARIOS ENCONTRADOS:', JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('ERROR AL OBTENER USUARIOS:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
