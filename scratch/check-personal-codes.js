const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const personal = await prisma.personal.findMany({
        where: { activo: true },
        select: { codigo: true, nombres: true, apellidos: true, rol: true }
    });
    console.log("Personal activo encontrado:");
    console.log(JSON.stringify(personal, null, 2));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
