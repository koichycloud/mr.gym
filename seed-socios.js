const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Clear existing data (optional, but good for clean test)
    // await prisma.suscripcion.deleteMany({})
    // await prisma.socio.deleteMany({})

    const today = new Date()

    // Helper to add days
    const addDays = (date, days) => {
        const result = new Date(date)
        result.setDate(result.getDate() + days)
        return result
    }

    const socios = []

    // 5 Socios with expiration in next 8 days (e.g., +1 to +7 days)
    for (let i = 1; i <= 5; i++) {
        socios.push({
            codigo: `EXP00${i}`,
            nombres: `Socio Expiring`,
            apellidos: `${i}`,
            tipoDocumento: 'DNI',
            numeroDocumento: `1000000${i}`,
            fechaNacimiento: new Date('1990-01-01'),
            telefono: '999999999',
            suscripcion: {
                meses: 1,
                fechaInicio: addDays(today, -25 + i), // Started ~25 days ago
                fechaFin: addDays(today, i) // Expires in i days (1 to 5)
            }
        })
    }

    // 5 Socios with SAFE expiration (e.g., +30 days)
    for (let i = 6; i <= 10; i++) {
        socios.push({
            codigo: `SAF00${i}`,
            nombres: `Socio Safe`,
            apellidos: `${i}`,
            tipoDocumento: 'DNI',
            numeroDocumento: `2000000${i}`,
            fechaNacimiento: new Date('1995-05-05'),
            telefono: '888888888',
            suscripcion: {
                meses: 1,
                fechaInicio: today,
                fechaFin: addDays(today, 30) // Expires in 30 days
            }
        })
    }

    for (const socio of socios) {
        try {
            const createdSocio = await prisma.socio.create({
                data: {
                    codigo: socio.codigo,
                    nombres: socio.nombres,
                    apellidos: socio.apellidos,
                    tipoDocumento: socio.tipoDocumento,
                    numeroDocumento: socio.numeroDocumento,
                    fechaNacimiento: socio.fechaNacimiento,
                    telefono: socio.telefono,
                    suscripciones: {
                        create: {
                            meses: socio.suscripcion.meses,
                            fechaInicio: socio.suscripcion.fechaInicio,
                            fechaFin: socio.suscripcion.fechaFin,
                            estado: 'ACTIVA'
                        }
                    }
                }
            })
            console.log(`Created socio: ${createdSocio.codigo}`)
        } catch (e) {
            console.error(`Error creating socio ${socio.codigo}: ${e.message}`)
        }
    }

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
