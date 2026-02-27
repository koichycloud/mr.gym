const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Buscando socio 001341...");
        const socio = await prisma.socio.findFirst({
            where: { codigo: '001341' },
            include: {
                suscripciones: {
                    orderBy: { codigo: 'desc' }
                },
                historialCodigos: {
                    orderBy: { fechaCambio: 'desc' }
                }
            }
        });

        if (!socio) {
            console.log("No se encontró el socio 001341 en la base de datos de producción.");
            return;
        }

        console.log("Socio encontrado:", socio.nombres, socio.apellidos);
        console.log("Suscripciones actuales:", socio.suscripciones.map(s => s.codigo));
        console.log("Historial previo:", socio.historialCodigos.map(h => h.codigo));

        // Let's deduce the previous code if it exists but is missing from history
        const currentCode = socio.codigo;
        const allCodes = Array.from(new Set(socio.suscripciones.map(s => s.codigo).filter(c => c)));

        console.log("Todos los códigos en suscripciones:", allCodes);

        const oldCodes = allCodes.filter(c => c !== currentCode);

        for (const oldCode of oldCodes) {
            const existsInHistory = socio.historialCodigos.some(h => h.codigo === oldCode);
            if (!existsInHistory) {
                console.log(`Falta el código ${oldCode} en el historial. Insertando...`);
                await prisma.codigoHistorial.create({
                    data: {
                        socioId: socio.id,
                        codigo: oldCode,
                        fechaCambio: new Date() // Fallback to current date or find subscription relative date
                    }
                });
                console.log(`Código ${oldCode} insertado correctamente.`);
            } else {
                console.log(`El código ${oldCode} ya existe en el historial.`);
            }
        }

    } catch (e) {
        console.error("Error ejecutando script:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
