const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const socio = await prisma.socio.findFirst({
        where: { numeroDocumento: '47730225' },
        include: { historialCodigos: true, suscripciones: true }
    });

    if (!socio) {
        console.log('Socio no encontrado');
        return;
    }

    console.log('Socio actual:', socio.nombres, socio.apellidos);
    console.log('Código principal actual:', socio.codigo);
    console.log('Suscripciones:', JSON.stringify(socio.suscripciones.map(s => ({id: s.id, codigo: s.codigo})), null, 2));
    console.log('Historial de códigos:', JSON.stringify(socio.historialCodigos, null, 2));
}

fix().then(() => prisma.$disconnect());
