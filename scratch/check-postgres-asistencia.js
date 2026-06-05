const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const personal = await prisma.personal.findMany({
        select: { id: true, codigo: true, nombres: true, apellidos: true }
    });
    
    for (const p of personal) {
        const asistencias = await prisma.asistenciaPersonal.findMany({
            where: { personalId: p.id },
            orderBy: { fecha: 'desc' }
        });
        console.log(`Asistencias de ${p.nombres} (${p.codigo}):`);
        console.log(JSON.stringify(asistencias, null, 2));
    }
    
    await prisma.$disconnect();
}

main().catch(console.error);
