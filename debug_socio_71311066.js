const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const socios = await prisma.socio.findMany({
    where: { numeroDocumento: '71311066' },
    include: { 
      suscripciones: { orderBy: { createdAt: 'desc' } },
      historialCodigos: { orderBy: { fechaCambio: 'desc' } }
    }
  });
  
  const cleanSocios = socios.map(s => {
    delete s.fotoUrl;
    return s;
  });
  
  console.log(JSON.stringify(cleanSocios, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
