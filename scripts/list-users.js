import { PrismaClient } from '@prisma/client'

process.env.DATABASE_URL = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            role: true,
            createdAt: true
        }
    })

    console.log("--- SYSTEM USERS ---");
    users.forEach(u => {
        console.log(`Username: ${u.username.padEnd(15)} | Role: ${u.role.padEnd(12)} | Created: ${u.createdAt.toISOString().split('T')[0]}`)
    });
}

main().catch(console.error).finally(() => prisma.$disconnect())
