const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const socio = await prisma.socio.findFirst({
    where: { OR: [{ codigo: '72166520' }, { numeroDocumento: '72166520' }] },
    include: { suscripciones: { orderBy: { fechaInicio: 'desc' } } }
  });
  console.log(JSON.stringify(socio, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
