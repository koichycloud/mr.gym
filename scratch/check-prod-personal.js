const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.personal.count();
    console.log(`Total Personal en Producción: ${count}`);
    if (count > 0) {
        const personal = await prisma.personal.findMany();
        console.log(JSON.stringify(personal, null, 2));
    }
    await prisma.$disconnect();
}

main().catch(console.error);
