import { PrismaClient } from '@prisma/client'

// Use Production DB connection
process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    console.log("=== INSPECCION DETALLADA SOCIO 61278225 ===");
    const socio = await prisma.socio.findFirst({
        where: { numeroDocumento: '61278225' },
        include: {
            suscripciones: {
                orderBy: { fechaInicio: 'desc' }
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' }
            }
        }
    });

    if (!socio) {
        console.log("No socio found.");
        return;
    }

    console.log(`Nombre: ${socio.nombres} ${socio.apellidos}`);
    console.log(`DNI: ${socio.numeroDocumento}`);
    console.log(`Codigo Oficial Actual: ${socio.codigo}`);
    console.log(`-----------------------------------`);

    console.log(`Suscripciones encontradas: ${socio.suscripciones.length}`);
    socio.suscripciones.forEach((s, idx) => {
        console.log(` [${idx}] ID: ${s.id.slice(0, 8)} | Codigo: ${s.codigo} | Fecha Inicio: ${s.fechaInicio.toISOString()} | Fecha Fin: ${s.fechaFin.toISOString()} | Estado: ${s.estado}`);
    });

    console.log(`-----------------------------------`);
    console.log(`Historial Codigos encontrados: ${socio.historialCodigos.length}`);
    socio.historialCodigos.forEach((h, idx) => {
        console.log(` [${idx}] ID: ${h.id.slice(0, 8)} | Codigo: ${h.codigo} | Fecha Cambio: ${h.fechaCambio.toISOString()}`);
    });
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    });
