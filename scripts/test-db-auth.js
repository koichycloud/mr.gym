import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

process.env.DATABASE_URL = "postgresql://postgres:jJh7uow22TI83H1i@db.irqlkbihlqgwzpfbbzhz.supabase.co:5432/postgres"

const prisma = new PrismaClient()

async function main() {
    const username = 'admin'
    const password = 'admin_mrgym_2026'

    const user = await prisma.user.findUnique({
        where: { username }
    })

    if (!user) {
        console.log("NO ADMIN")
        return
    }

    const match = await bcrypt.compare(password, user.password)
    console.log(`DB match test: ${match}`)
}

main().finally(() => prisma.$disconnect())
