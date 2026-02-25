import { PrismaClient } from '@prisma/client'

// Force production URL
process.env.DATABASE_URL = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient()

async function main() {
    console.log("=== DB USERS ===");
    const users = await prisma.user.findMany()
    users.forEach(u => {
        console.log(`- Username: ${u.username}`);
        console.log(`  Role: ${u.role}`);
        console.log(`  Password: Hashed & Encrypted`);
        console.log(`  Created: ${u.createdAt.toISOString()}`);
        console.log("---");
    });
}
main().finally(() => prisma.$disconnect())
