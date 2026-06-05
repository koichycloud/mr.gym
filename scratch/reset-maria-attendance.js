const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const personal = await prisma.personal.findUnique({
        where: { codigo: "INS002" }
    });
    if (!personal) {
        console.log("No se encontró a María");
        return;
    }
    const deleted = await prisma.asistenciaPersonal.deleteMany({
        where: { personalId: personal.id }
    });
    console.log(`Se eliminaron ${deleted.count} registros de asistencia para María (INS002). ¡Ahora puede volver a probar desde cero!`);
    await prisma.$disconnect();
}

main().catch(console.error);
