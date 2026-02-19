const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const codes = ['000808', '001218']
    const dni = '44745914'

    console.log(`--- Checking Codes ${codes.join(', ')} ---`)
    for (const code of codes) {
        const socio = await prisma.socio.findUnique({
            where: { codigo: code },
            include: { suscripciones: true }
        })
        if (socio) {
            console.log(`Found Socio with Code ${code}: ${socio.nombres} ${socio.apellidos} (DNI: ${socio.numeroDocumento})`)
            socio.suscripciones.forEach(sub => {
                console.log(`  Sub: ${sub.fechaInicio.toISOString()} - ${sub.fechaFin.toISOString()} (Meses: ${sub.meses})`)
            })
        } else {
            console.log(`No socio found with Code ${code} (Current Code)`)
        }
    }

    console.log(`\n--- Checking DNI ${dni} History ---`)
    const socioTarget = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: { historialCodigos: { orderBy: { fechaCambio: 'desc' } } }
    })
    if (socioTarget) {
        console.log(`Socio ${dni} Current Code: ${socioTarget.codigo}`)
        console.log('History:')
        socioTarget.historialCodigos.forEach(h => {
            console.log(`  Code: ${h.codigo}, Date: ${h.fechaCambio.toISOString()}, ID: ${h.id}`)
        })
    }

}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
