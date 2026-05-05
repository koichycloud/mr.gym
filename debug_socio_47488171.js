const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const socios = await prisma.socio.findMany({
    where: { 
      OR: [
        { nombres: { contains: 'Nelly', mode: 'insensitive' } },
        { apellidos: { contains: 'Zinanyuca', mode: 'insensitive' } },
        { codigo: '001296' }
      ]
    },
    include: { suscripciones: true }
  });
  
  // Remove fotoUrl so it's readable
  const cleanSocios = socios.map(s => {
    delete s.fotoUrl;
    return s;
  });
  
  console.log(JSON.stringify(cleanSocios, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
