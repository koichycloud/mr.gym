import prisma from '@/lib/prisma';
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
    take: 10,
  });
  console.log('USERS:', JSON.stringify(users, null, 2));
  const socios = await prisma.socio.findMany({
    where: { estado: 'ACTIVO' },
    select: { id: true, codigo: true, nombres: true, apellidos: true },
    take: 5,
  });
  console.log('SOCIOS:', JSON.stringify(socios, null, 2));
}
main().finally(() => prisma.$disconnect());
