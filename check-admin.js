
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const user = await prisma.user.findUnique({
            where: { username: 'admin' },
        })
        console.log('Admin user found:', user)
    } catch (e) {
        console.error('Error finding user:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
