import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Force the connection to the production Supabase database
process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    const username = 'koichy'
    const password = 'Negra2025.!$'

    // Hash the password securely as the system expects
    const hashedPassword = await bcrypt.hash(password, 10)

    // Upsert means it will update the password if 'koichy' exists, or create it if not
    const user = await prisma.user.upsert({
        where: { username },
        update: {
            password: hashedPassword,
            role: 'ADMIN'
        },
        create: {
            username,
            password: hashedPassword,
            role: 'ADMIN'
        }
    })

    console.log(`✅ Credenciales configuradas en Producción:`)
    console.log(`Usuario: ${user.username}`)
    console.log(`Rol: ${user.role}`)
    console.log(`Contraseña guardada mediante Hash.`);
}

main()
    .catch((e) => {
        console.error("Error setting up super admin:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
