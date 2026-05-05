const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const maricelaId = "7d48dadd-0f86-4583-8446-42a46dbb3152";
  const activeSubId = "9f86f922-0dbe-415a-90d6-6a9c44d24913";

  // Change socio.codigo to 001291
  await prisma.socio.update({
    where: { id: maricelaId },
    data: { codigo: "001291" }
  });

  // Change active sub code to 001291
  await prisma.suscripcion.update({
    where: { id: activeSubId },
    data: { codigo: "001291" }
  });

  // Add 000862 to history
  await prisma.codigoHistorial.create({
    data: {
      socioId: maricelaId,
      codigo: "000862",
      fechaCambio: new Date()
    }
  });

  console.log("Fixed Maricela's codes.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
