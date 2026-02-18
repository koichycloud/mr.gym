const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socioData = {
        id: "eaf88c22-51db-48ed-b73d-6355b9b3f047",
        codigo: "000917", // New code
        nombres: "cesar",
        apellidos: "fernandez delgado",
        tipoDocumento: "CE",
        numeroDocumento: "008089731",
        fechaNacimiento: new Date("2026-02-09T00:00:00.000Z"),
        sexo: "M",
        telefono: "991371167",
        createdAt: new Date("2026-02-10T02:32:50.599Z"),
        updatedAt: new Date(),
        suscripciones: {
            create: [
                {
                    id: "fb1480c6-0400-416f-9043-8314a94d6202",
                    fechaInicio: new Date("2025-11-18T00:00:00.000Z"),
                    meses: 4,
                    fechaFin: new Date("2026-03-18T00:00:00.000Z"),
                    estado: "ACTIVA",
                    createdAt: new Date("2026-02-10T02:32:50.599Z"),
                    updatedAt: new Date()
                }
            ]
        }
    }

    try {
        const newSocio = await prisma.socio.create({
            data: socioData,
            include: { suscripciones: true }
        })
        console.log('Socio restored successfully with new code 000917:')
        console.log(JSON.stringify(newSocio, null, 2))
    } catch (error) {
        console.error('An error occurred during restoration:', error)
    }
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
