
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const username = 'admin'
    const password = 'admin123'
    const hashedPassword = await bcrypt.hash(password, 10)

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

    console.log(`Admin user created:`)
    console.log(`Username: ${user.username}`)
    console.log(`Password: ${password}`)
    console.log(`Role: ${user.role}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
