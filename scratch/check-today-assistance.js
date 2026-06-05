const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const personal = await prisma.personal.findUnique({
        where: { codigo: "INS001" }
    });
    if (!personal) {
        console.log("No se encontró al personal INS001");
        return;
    }
    const todayAsistencias = await prisma.asistenciaPersonal.findMany({
        where: { personalId: personal.id },
        orderBy: { fecha: 'desc' },
        take: 5
    });
    console.log(`Asistencias de ${personal.nombres} ${personal.apellidos}:`);
    console.log(JSON.stringify(todayAsistencias, null, 2));
    await prisma.$disconnect();
}

main().catch(console.error);
