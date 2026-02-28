import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

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
