import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function testAuthorize() {
    const username = 'admin'
    const password = 'admin_mrgym_2026'

    console.log(`Buscando usuario: ${username}...`)
    const user = await prisma.user.findUnique({
        where: { username }
    })

    if (!user) {
        console.log("❌ Usuario NO encontrado en la BD de Vercel (Supabase).")
        return
    }

    console.log(`✅ Usuario encontrado en BD: ${user.username} (Rol: ${user.role})`)
    console.log(`Comprobando contraseña usando bcrypt.compare...`)

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (passwordMatch) {
        console.log("✅ Contraseña correcta. El login a nivel base de datos DEBERIA funcionar.")
    } else {
        console.log("❌ La contraseña NO coincide con el hash guardado.")
    }
}

testAuthorize()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
