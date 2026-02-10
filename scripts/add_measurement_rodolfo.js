
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socioCode = '001140' // Rodolfo

    const socio = await prisma.socio.findUnique({
        where: { codigo: socioCode },
    })

    if (!socio) {
        console.error(`Socio with code ${socioCode} not found!`)
        return
    }

    const measurement = {
        fecha: new Date(),
        peso: 78.5,
        altura: 172,
        porcentajeGrasa: 18.5,
        porcentajeMusculo: 42.0,
        cuello: 38,
        hombros: 115,
        pecho: 102,
        cintura: 85,
        vientreBajo: 88,
        gluteos: 98,
        biceps: 36,
        antebrazos: 30,
        muslos: 58,
        cuadriceps: 56,
        pantorrillas: 38,
    }

    const created = await prisma.medidaFisica.create({
        data: {
            socioId: socio.id,
            ...measurement
        }
    })

    console.log(`Created measurement for ${socio.nombres} (${socioCode})`)
    console.log(created)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
