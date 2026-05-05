const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const socio = await prisma.socio.findFirst({
        where: { id: '65210a30-7491-4be5-8249-f2fc6a025c67' },
        include: { historialCodigos: true, suscripciones: { orderBy: { createdAt: 'asc' } } }
    });

    console.log('Suscripciones ordenadas:', JSON.stringify(socio.suscripciones.map(s => ({id: s.id, codigo: s.codigo, createdAt: s.createdAt})), null, 2));
}

fix().then(() => prisma.$disconnect());
