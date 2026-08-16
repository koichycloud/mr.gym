import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hash }
  });
  console.log('Password for admin reset to admin123');
}

main().finally(() => prisma.$disconnect());
