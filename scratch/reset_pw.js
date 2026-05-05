const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({where:{username:'koichy'}});
  if(!u) {
    console.log('Usuario koichy no existe');
    return;
  }
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.update({
    where: {username:'koichy'},
    data: {password: hash}
  });
  console.log('Contraseña de koichy reseteada a: 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
