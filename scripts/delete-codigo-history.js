import { PrismaClient } from '@prisma/client'

// Force the production URL so it connects to Supabase
process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    // Brute force: get all socios
    const socios = await prisma.socio.findMany({
        include: { historialCodigos: true }
    })

    let found = false;

    // We are looking for anything that contains "00000016" or "0000016" or the user DNI/Codigo
    for (const socio of socios) {
        // Did the user mean DNI 00000016? Or maybe the ID? Or maybe the exact string?
        const asString = JSON.stringify(socio);
        if (asString.includes('00000016') || asString.includes('0000016') || socio.codigo === '000016') {
            found = true;
            console.log(`\n>> ENCONTRADO COINCIDENCIA EN SOCIO:`)
            console.log(`Nombre: ${socio.nombres} ${socio.apellidos}`)
            console.log(`Código Oficial: ${socio.codigo}`)
            console.log(`DNI: ${socio.numeroDocumento}`)
            console.log(`Historial total: ${socio.historialCodigos.length}`)

            // Now we delete the history of this specific one
            const deleted = await prisma.codigoHistorial.deleteMany({
                where: { socioId: socio.id }
            })
            console.log(`Eliminados explícitamente: ${deleted.count} registros de historial de este socio.`)
        }
    }

    if (!found) {
        console.log("No se ha encontrado a ningún socio en toda la base de datos que tenga '00000016' o '0000016' en ninguna de sus propiedades (código, ID, DNI).")
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
