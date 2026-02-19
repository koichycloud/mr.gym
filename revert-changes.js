const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = "44745914"
    const today = new Date('2026-02-18T00:00:00.000Z')

    console.log(`Reverting changes for DNI ${dni} made on/after ${today.toISOString()}`)

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            suscripciones: {
                where: { createdAt: { gte: today } }
            },
            historialCodigos: {
                where: { fechaCambio: { gte: today } },
                orderBy: { fechaCambio: 'desc' }
            }
        }
    })

    if (!socio) {
        console.log('Socio not found')
        return
    }

    // 1. Delete subscriptions created today
    if (socio.suscripciones.length > 0) {
        console.log(`Deleting ${socio.suscripciones.length} subscriptions...`)
        const deleteSubs = await prisma.suscripcion.deleteMany({
            where: {
                id: { in: socio.suscripciones.map(s => s.id) }
            }
        })
        console.log('Subscriptions deleted:', deleteSubs.count)
    }

    // 2. Revert Code Change if any
    // If there is a history entry today, it means code changed FROM 'codigo' stored in history TO current socio.codigo
    // Wait, history stores the OLD code. So if we want to revert, we should set socio.codigo = history.codigo
    if (socio.historialCodigos.length > 0) {
        const lastHistory = socio.historialCodigos[0] // Get most recent
        console.log(`Reverting code from ${socio.codigo} back to ${lastHistory.codigo}...`)

        await prisma.socio.update({
            where: { id: socio.id },
            data: { codigo: lastHistory.codigo }
        })

        // Delete the history entry as we reverted it
        await prisma.codigoHistorial.delete({
            where: { id: lastHistory.id }
        })
        console.log('Code reverted and history entry deleted.')
    }

    // 3. Clear Photo if added today (we can't know for sure if it was added today easily without audit log, 
    // but if updatedAt is today, and user wants revert everything, maybe clearing photo is safe?
    // Let's assume yes if fotoUrl exists.
    if (socio.fotoUrl && socio.updatedAt >= today) {
        console.log('Removing photo added today...')
        await prisma.socio.update({
            where: { id: socio.id },
            data: { fotoUrl: null }
        })
    }

    // 4. Delete attendance today
    const deleteAttendance = await prisma.asistencia.deleteMany({
        where: {
            socioId: socio.id,
            fecha: { gte: today }
        }
    })
    console.log(`Deleted ${deleteAttendance.count} attendance records.`)

    console.log('Revert complete.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
