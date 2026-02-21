const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    // Codes involved recently
    const codes = ['001194', '000804']

    console.log(`--- Checking DNI ${dni} ---`)
    const byDni = await prisma.socio.findMany({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: true,
            historialCodigos: true
        }
    })

    byDni.forEach(s => {
        console.log(`Socio ID: ${s.id}, Code: ${s.codigo}, DNI: ${s.numeroDocumento}, Name: ${s.nombres}`)
        s.suscripciones.forEach(sub => {
            console.log(`  Sub ID: ${sub.id}, Start: ${sub.fechaInicio.toISOString().split('T')[0]}, End: ${sub.fechaFin.toISOString().split('T')[0]}, Created: ${sub.createdAt.toISOString()}`)
        })
        s.historialCodigos.forEach(h => {
            console.log(`  History Code: ${h.codigo}, Date: ${h.fechaCambio.toISOString()}`)
        })
    })

    console.log(`\n--- Checking Codes ${codes.join(', ')} ---`)
    for (const code of codes) {
        const byCode = await prisma.socio.findMany({
            where: { codigo: code },
            include: { suscripciones: true }
        })
        if (byCode.length > 0) {
            console.log(`Records with Code ${code}:`)
            byCode.forEach(s => {
                console.log(`  Socio ID: ${s.id}, Code: ${s.codigo}, DNI: ${s.numeroDocumento}, Name: ${s.nombres}`)
                s.suscripciones.forEach(sub => {
                    console.log(`    Sub ID: ${sub.id}, Start: ${sub.fechaInicio.toISOString().split('T')[0]}`)
                })
            })
        } else {
            console.log(`No records with Code ${code}`)
        }
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
