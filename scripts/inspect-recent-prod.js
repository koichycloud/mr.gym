import { PrismaClient } from '@prisma/client'

// Use Production DB connection
process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    console.log("---- Admin Users ----")
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } })
    admins.forEach(u => console.log(`User: ${u.username} | Role: ${u.role}`))

    console.log("\n---- Recent Socios (Last 5 Updated) ----")
    const recientes = await prisma.socio.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { historialCodigos: true }
    })

    recientes.forEach(s => {
        console.log(`\nSocio: ${s.nombres} ${s.apellidos} | ID: ${s.id}`)
        console.log(`Código Actual: ${s.codigo} | DNI: ${s.numeroDocumento}`)
        console.log(`Historial records: ${s.historialCodigos.length}`)
        s.historialCodigos.forEach(h => console.log(`  - Antiguo código: ${h.codigo} (generado: ${h.fechaCambio.toISOString()})`))
    })
}

main()
    .catch((e) => {
        console.error("Error connecting to database:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
