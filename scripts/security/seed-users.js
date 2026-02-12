const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log("--- Configurando Usuarios y Roles ---")

    // Definir los usuarios y sus roles
    const users = [
        {
            username: 'admin_gym',
            password: 'AdminSecure2025!',
            role: 'ADMIN',
            message: 'Usuario Administrador (Control Total)'
        },
        {
            username: 'recepcion',
            password: 'RecepUser2025!',
            role: 'RECEPCION',
            message: 'Usuario Recepción (Registros y Pagos)'
        },
        {
            username: 'entrenador',
            password: 'TrainerGym2025!',
            role: 'ENTRENADOR',
            message: 'Usuario Entrenador (Medidas y Rutinas)'
        }
    ]

    for (const u of users) {
        const hashedPassword = await bcrypt.hash(u.password, 10)

        const user = await prisma.user.upsert({
            where: { username: u.username },
            update: {
                password: hashedPassword,
                role: u.role
            },
            create: {
                username: u.username,
                password: hashedPassword,
                role: u.role
            }
        })
        console.log(`✅ Usuario actualizado/creado: ${user.username} [Rol: ${user.role}]`)
    }

    console.log("\n--- Credenciales Generadas ---")
    users.forEach(u => {
        console.log(`Usuario: ${u.username} | Pass: ${u.password} | Rol: ${u.role}`)
    })
    console.log("------------------------------")
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
