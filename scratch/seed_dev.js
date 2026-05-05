const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Leer DATABASE_URL del .env manualmente
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/^DATABASE_URL="(.+)"/m);
if (match) process.env.DATABASE_URL = match[1];

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hash },
    create: {
      username: 'admin',
      password: hash,
      role: 'ADMIN',
      permissions: [],
    },
  });

  console.log('✅ Usuario admin creado/actualizado:', user.username);
  console.log('   Contraseña: admin123');

  // Crear también un plan de prueba básico
  await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Mensual',
      meses: 1,
      precio: 50,
      activo: true,
    },
  }).catch(() => {
    // Plan puede no tener ID fijo, ignorar
  });
  
  console.log('✅ Base de datos de desarrollo lista.');
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
