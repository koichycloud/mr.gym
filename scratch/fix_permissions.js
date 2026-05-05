const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  console.log('--- Corrigiendo campo permissions en Usuarios ---')
  try {
    // Usamos $executeRaw para evitar que Prisma intente parsear el JSON corrupto antes del update
    const rows = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "permissions" = '[]' WHERE "permissions" IS NULL OR "permissions" = ''`
    )
    console.log(`✅ ÉXITO: Se han actualizado ${rows} usuarios con permisos por defecto [].`)
  } catch (error) {
    console.error('❌ ERROR AL CORREGIR USUARIOS:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
