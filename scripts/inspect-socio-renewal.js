import { PrismaClient } from '@prisma/client'

process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"
const prisma = new PrismaClient()

async function main() {
    const documentNumber = '61278225'

    console.log(`Inspecting socio with DNI: ${documentNumber}...`)

    const socio = await prisma.socio.findFirst({
        where: { numeroDocumento: documentNumber },
        include: {
            suscripciones: true,
            historialCodigos: true
        }
    })

    if (!socio) {
        console.log("No socio found.");
        return;
    }

    console.log("Socio Code:", socio.codigo);
    console.log("Subscriptions:");
    socio.suscripciones.forEach(s => console.log(` - ID: ${s.id} | Code: ${s.codigo} | Start: ${s.fechaInicio.toISOString()} | End: ${s.fechaFin.toISOString()}`))

    console.log("Code History:");
    socio.historialCodigos.forEach(h => console.log(` - ID: ${h.id} | Code: ${h.codigo} | Date: ${h.fechaCambio.toISOString()}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
