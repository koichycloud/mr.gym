import { PrismaClient } from '@prisma/client'

// Use Production DB connection
process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    const documentNumber = '61278225'

    const socio = await prisma.socio.findFirst({
        where: { numeroDocumento: documentNumber },
        include: { suscripciones: { orderBy: { fechaInicio: 'asc' } } }
    })

    if (!socio) {
        console.log("No socio found.");
        return;
    }

    console.log(`Restoring history for: ${socio.nombres} ${socio.apellidos}`);

    // If there's an old subscription, let's also fix its snapshot code just in case
    if (socio.suscripciones.length > 1) {
        const oldSub = socio.suscripciones[0];
        if (oldSub.codigo !== '000882') {
            await prisma.suscripcion.update({
                where: { id: oldSub.id },
                data: { codigo: '000882' }
            });
            console.log(`Updated old subscription snapshot code to 000882.`);
        }
    }

    // Now insert the missing history record
    const historyCheck = await prisma.codigoHistorial.findFirst({
        where: { socioId: socio.id, codigo: '000882' }
    });

    if (!historyCheck) {
        await prisma.codigoHistorial.create({
            data: {
                socioId: socio.id,
                codigo: '000882',
                // Date sets to today since the renewal was done today, or the old sub start if preferred. 
                // Setting it to a few minutes ago to look like it happened during the renewal.
                fechaCambio: new Date()
            }
        });
        console.log("Successfully created history record for 000882.");
    } else {
        console.log("History record for 000882 already exists.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
