const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findByCode() {
    // Search socio with either of the codes as main code
    const socio = await prisma.socio.findFirst({
        where: {
            OR: [
                { codigo: '001297' },
                { codigo: '000857' },
                { numeroDocumento: { contains: '47730225' } }
            ]
        },
        include: { historialCodigos: true, suscripciones: true }
    });

    if (!socio) {
        console.log('Socio no encontrado de ninguna forma');
        return;
    }

    console.log('Socio encontrado:', socio.nombres, socio.apellidos);
    console.log('ID:', socio.id);
    console.log('Documento:', socio.numeroDocumento);
    console.log('Código principal actual:', socio.codigo);
    console.log('Suscripciones:', JSON.stringify(socio.suscripciones.map(s => ({id: s.id, codigo: s.codigo})), null, 2));
    console.log('Historial de códigos:', JSON.stringify(socio.historialCodigos, null, 2));
}

findByCode().then(() => prisma.$disconnect());
