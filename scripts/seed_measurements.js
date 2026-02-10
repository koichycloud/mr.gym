
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socioCode = '001134'

    console.log(`Searching for socio with code: ${socioCode}...`)

    const socio = await prisma.socio.findUnique({
        where: { codigo: socioCode },
    })

    if (!socio) {
        console.error(`Socio with code ${socioCode} not found!`)
        return
    }

    console.log(`Found socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id})`)

    // Define 4 measurements with progression
    // Data structure based on MedidaFisica model
    const measurements = [
        {
            fecha: new Date('2023-10-15'),
            peso: 85.5,
            altura: 175,
            porcentajeGrasa: 22.5,
            porcentajeMusculo: 34.0,
            cuello: 40.0,
            hombros: 118.0,
            pecho: 102.0,
            cintura: 94.0,
            vientreBajo: 96.0,
            gluteos: 104.0,
            biceps: 36.0,
            antebrazos: 30.0,
            cuadriceps: 58.0,
            pantorrillas: 38.0
        },
        {
            fecha: new Date('2023-11-20'),
            peso: 83.2,
            altura: 175,
            porcentajeGrasa: 20.8,
            porcentajeMusculo: 35.2,
            cuello: 39.5,
            hombros: 119.0,
            pecho: 103.0,
            cintura: 91.0,
            vientreBajo: 92.5,
            gluteos: 102.5,
            biceps: 36.5,
            antebrazos: 30.2,
            cuadriceps: 59.0,
            pantorrillas: 38.2
        },
        {
            fecha: new Date('2023-12-28'),
            peso: 81.0,
            altura: 175,
            porcentajeGrasa: 18.5,
            porcentajeMusculo: 36.8,
            cuello: 39.0,
            hombros: 120.5,
            pecho: 104.5,
            cintura: 88.0,
            vientreBajo: 89.0,
            gluteos: 101.0,
            biceps: 37.2,
            antebrazos: 30.5,
            cuadriceps: 60.0,
            pantorrillas: 38.5
        },
        {
            fecha: new Date('2024-02-05'),
            peso: 79.5,
            altura: 175,
            porcentajeGrasa: 16.2,
            porcentajeMusculo: 38.5,
            cuello: 38.5,
            hombros: 122.0,
            pecho: 106.0,
            cintura: 85.0,
            vientreBajo: 86.5,
            gluteos: 100.0,
            biceps: 38.0,
            antebrazos: 31.0,
            cuadriceps: 61.5,
            pantorrillas: 39.0
        }
    ]

    console.log(`Inserting ${measurements.length} measurement records...`)

    for (const m of measurements) {
        await prisma.medidaFisica.create({
            data: {
                socioId: socio.id,
                ...m
            }
        })
        console.log(`Created measurement for date: ${m.fecha.toISOString().split('T')[0]}`)
    }

    console.log('Seeding completed successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
