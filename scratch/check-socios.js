const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const socios = await prisma.socio.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { codigo: true, nombres: true, numeroDocumento: true }
    });
    console.log("Últimos socios en producción:");
    console.log(JSON.stringify(socios, null, 2));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
