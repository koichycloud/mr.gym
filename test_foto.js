const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const socios = await prisma.socio.findMany({
        where: { fotoUrl: { not: null } }
    });
    console.log("Total socios con foto: ", socios.length);
    if(socios.length > 0) {
        console.log("Nombres de socios con foto:", socios.map(s => s.nombres).join(', '));
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
