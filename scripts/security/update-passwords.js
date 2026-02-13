const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log("--- Iniciando Actualización de Seguridad ---")

    const updates = [
        {
            username: 'admin',
            newPassword: 'SuperAdminSecure2025!@#',
            role: 'ADMIN',
            desc: 'Administrador Principal'
        },
        {
            username: 'admin_gym',
            newPassword: 'GymAdminPower2025!$',
            role: 'ADMIN',
            desc: 'Administrador del Gimnasio'
        },
        {
            username: 'recepcion',
            newPassword: 'FrontDeskSecure2025!*',
            role: 'RECEPCION',
            desc: 'Personal de Recepción'
        },
        {
            username: 'entrenador',
            newPassword: 'TrainerPro2025!+',
            role: 'ENTRENADOR',
            desc: 'Entrenador'
        }
    ]

    console.log("Actualizando contraseñas para los siguientes usuarios:\n")

    for (const update of updates) {
        try {
            const hashedPassword = await bcrypt.hash(update.newPassword, 10)
            
            // Intentar actualizar si existe, o crear si no existe (upsert)
            // Usamos upsert para garantizar que el usuario exista con la nueva contraseña
            const user = await prisma.user.upsert({
                where: { username: update.username },
                update: {
                    password: hashedPassword,
                    role: update.role
                },
                create: {
                    username: update.username,
                    password: hashedPassword,
                    role: update.role
                }
            })

            console.log(`✅ [${update.username.toUpperCase()}] Contraseña actualizada correctamente.`)
        } catch (error) {
            console.error(`❌ Error actualizando ${update.username}:`, error.message)
        }
    }

    console.log("\n--- RESUMEN DE CREDENCIALES (GUA/RDA ESTO EN UN LUGAR SEGURO) ---")
    console.table(updates.map(u => ({
        Usuario: u.username,
        'Nueva Contraseña': u.newPassword,
        Rol: u.role
    })))
    console.log("------------------------------------------------------------------")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
