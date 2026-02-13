const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log("--- Verificando Credenciales de Admin ---")

    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    })

    if (!user) {
        console.error("❌ Usuario 'admin' no encontrado.")
        return
    }

    const password = 'SuperAdminSecure2025!@#'
    const isValid = await bcrypt.compare(password, user.password)

    if (isValid) {
        console.log("✅ ÉXITO: La contraseña de 'admin' es correcta y segura.")
    } else {
        console.error("❌ ERROR: La contraseña de 'admin' NO coincide con la esperada.")
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
