const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'koichy' }
    });
    console.log("Usuario encontrado:", user ? user.username : "No encontrado");
    if (user) {
        console.log("Role:", user.role);
        // We won't print the hash, just verify if it exists
        console.log("Hash existe:", !!user.password);
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
