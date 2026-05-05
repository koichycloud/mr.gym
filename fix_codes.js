const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    const socioId = '65210a30-7491-4be5-8249-f2fc6a025c67';

    // 1. Update the main code of the Socio to 001297
    await prisma.socio.update({
        where: { id: socioId },
        data: { codigo: '001297' }
    });

    // 2. Update the historial record to show 000857 as the old code
    await prisma.codigoHistorial.updateMany({
        where: { socioId: socioId, codigo: '001297' },
        data: { codigo: '000857' }
    });

    // 3. Update the subscriptions to match the correct codes
    // Subscription 1 (createdAt: Feb 17) should have the old code (000857)
    await prisma.suscripcion.update({
        where: { id: '336a40a7-f160-42ff-8882-92360a322ac3' },
        data: { codigo: '000857' }
    });

    // Subscription 2 (createdAt: Feb 24) should have the current code (001297)
    await prisma.suscripcion.update({
        where: { id: '3fcc86b3-ad3c-4bd5-9185-cc37bf2dfd51' },
        data: { codigo: '001297' }
    });

    console.log('Successfully fixed the codes for socio 47730225');
}

fix()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
