const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test(codigo) {
    const cleanCodigo = codigo.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    console.log(`[TEST] Codigo limpio: "${cleanCodigo}"`);
    
    // 1. Personal
    const personal = await prisma.personal.findUnique({
        where: { codigo: cleanCodigo, activo: true }
    });
    if (personal) {
        console.log(`[TEST] Personal encontrado: ${personal.nombres} ${personal.apellidos}`);
        return;
    }

    // 2. Socio
    let socio = await prisma.socio.findUnique({
        where: { codigo: cleanCodigo },
        select: {
            id: true, codigo: true, nombres: true, apellidos: true,
            suscripciones: {
                orderBy: { fechaFin: 'desc' },
                take: 1,
                select: { fechaFin: true, fechaInicio: true, estado: true }
            }
        }
    });

    if (!socio) {
        // Historial
        const historial = await prisma.codigoHistorial.findFirst({
            where: { codigo: cleanCodigo },
            select: {
                socio: {
                    select: {
                        id: true, codigo: true, nombres: true,
                        suscripciones: {
                            orderBy: { fechaFin: 'desc' },
                            take: 1,
                            select: { fechaFin: true, fechaInicio: true, estado: true }
                        }
                    }
                }
            }
        });
        if (historial?.socio) {
            socio = historial.socio;
        }
    }

    if (!socio) {
        console.log(`[TEST] Código "${cleanCodigo}" no reconocido como socio o personal.`);
        return;
    }

    console.log(`[TEST] Socio encontrado: ${socio.nombres} ${socio.apellidos}`);
    console.log(`[TEST] Suscripción:`, JSON.stringify(socio.suscripciones, null, 2));
}

async function main() {
    // Probar varios códigos conocidos
    await test("INS001");
    await test("001612");
    await test("75193198"); // DNI
    await prisma.$disconnect();
}

main().catch(console.error);
