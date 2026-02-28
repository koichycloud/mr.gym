import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres",
        },
    },
})

async function check() {
    const user = await prisma.user.findUnique({
        where: { username: "koichy" }
    })
    if (!user) {
        console.log("User koichy not found")
        return
    }
    console.log("User:", user.username)
    console.log("Role:", user.role)
    console.log("Hash:", user.password)
    const isMatch = await bcrypt.compare("Negra2025.!$", user.password)
    console.log("Password matches Negra2025.!$:", isMatch)
}

check().catch(console.error).finally(() => prisma.$disconnect())
