const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const duplicateId = "7496d4fd-ff6c-4a99-8482-46c37a135e44"; // Nelly Sinanyuca Suarez (000953)
  const targetId = "8130784f-80dd-49f0-8a68-6e657a0e94b4"; // Nelly Zinanyuca Suarez (001296)

  try {
    // 1. Move Suscripciones
    const updatedSubs = await prisma.suscripcion.updateMany({
      where: { socioId: duplicateId },
      data: { socioId: targetId }
    });
    console.log(`Moved ${updatedSubs.count} subscriptions.`);

    // 2. Move Pagos
    const updatedPagos = await prisma.pago.updateMany({
      where: { socioId: duplicateId },
      data: { socioId: targetId }
    });
    console.log(`Moved ${updatedPagos.count} pagos.`);

    // 3. Move Asistencias
    const updatedAsistencias = await prisma.asistencia.updateMany({
      where: { socioId: duplicateId },
      data: { socioId: targetId }
    });
    console.log(`Moved ${updatedAsistencias.count} asistencias.`);

    // 4. Move MedidasFisicas (if any)
    const updatedMedidas = await prisma.medidaFisica.updateMany({
      where: { socioId: duplicateId },
      data: { socioId: targetId }
    });
    console.log(`Moved ${updatedMedidas.count} medidas fisicas.`);

    // 5. Move CodigoHistorial (if any)
    const updatedHistorial = await prisma.codigoHistorial.updateMany({
      where: { socioId: duplicateId },
      data: { socioId: targetId }
    });
    console.log(`Moved ${updatedHistorial.count} codigo historial.`);

    // 6. Delete the duplicate socio
    const deleted = await prisma.socio.delete({
      where: { id: duplicateId }
    });
    console.log(`Deleted duplicate socio: ${deleted.nombres} ${deleted.apellidos} (${deleted.codigo})`);

  } catch (err) {
    console.error("Error during merge:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
