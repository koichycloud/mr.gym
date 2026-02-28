import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const newPassword = 'admin'
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const user = await prisma.user.update({
        where: { username: 'admin' },
        data: { password: hashedPassword }
    })

    console.log(`Password reset for ${user.username} successfully. New password is: '${newPassword}'`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
