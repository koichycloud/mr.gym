const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

process.env.DATABASE_URL = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'koichy' }
    })

    console.log("Usuario encontrado:", user ? "Si" : "No")
    if (user) {
        const passwordMatch = await bcrypt.compare('Negra2025.!$', user.password)
        console.log("Contraseña DB coincide con Negra2025.!$:", passwordMatch)
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
