import { PrismaClient } from '@prisma/client'

// Use Production DB connection
process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    const documentNumbers = ['76074317', '75020667', '75020666', '73329330'];

    for (const doc of documentNumbers) {
        // Find socio by numeroDocumento or codigo
        const socio = await prisma.socio.findFirst({
            where: {
                OR: [
                    { numeroDocumento: doc },
                    { codigo: doc }
                ]
            }
        });

        if (!socio) {
            console.log(`❌ No se encontró socio con documento o código: ${doc}`);
            continue;
        }

        console.log(`✅ Socio encontrado: ${socio.nombres} ${socio.apellidos} (Documento: ${socio.numeroDocumento}, Código: ${socio.codigo})`);

        const result = await prisma.codigoHistorial.deleteMany({
            where: {
                socioId: socio.id
            }
        });

        console.log(`   -> Se eliminaron ${result.count} registros del historial de boleta.`);
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
