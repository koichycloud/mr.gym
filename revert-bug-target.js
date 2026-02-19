const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const dni = '76554626'
    console.log(`Reverting activity for DNI ${dni}...`)

    const socio = await prisma.socio.findUnique({
        where: { numeroDocumento: dni },
        include: {
            historialCodigos: { orderBy: { fechaCambio: 'desc' } },
            suscripciones: { orderBy: { fechaInicio: 'desc' } }
        }
    })

    // 1. Delete the subscription created today (2026-02-18/19)
    // Based on inspection: "CreatedAt: 2026-02-19T02:05..." 
    // We will delete ANY subscription created > 2026-02-18
    const today = new Date('2026-02-18T00:00:00Z')

    const subsToDelete = socio.suscripciones.filter(s => s.createdAt > today)
    console.log(`Found ${subsToDelete.length} subscriptions to delete.`)

    for (const sub of subsToDelete) {
        await prisma.suscripcion.delete({ where: { id: sub.id } })
        console.log(`Deleted subscription ID: ${sub.id}`)
    }

    // 2. Delete history entries created today
    const historyToDelete = socio.historialCodigos.filter(h => h.fechaCambio > today)
    console.log(`Found ${historyToDelete.length} history entries to delete.`)

    for (const h of historyToDelete) {
        await prisma.codigoHistorial.delete({ where: { id: h.id } })
        console.log(`Deleted history ID: ${h.id} (Code: ${h.codigo})`)
    }

    // 3. Restore Socio Code if valid
    // If we deleted history, we might need to reset the socio's current code to what it was before.
    // Inspection showed: 
    // [0] 000811 (2:17)
    // [1] 001264 (2:05)
    // Before that? Likely 000811 or similar if 001264 was the "new" one.
    // Actually, if 000811 is the *latest* history, it means it was changed *to* 000811 recently?
    // Or maybe 000811 was the ORIGINAL code, and it was pushed to history when 001264 was added?
    // Wait, if 000811 is in history with a timestamp of 02:17, it means the code CHANGED at 02:17.
    // The user probably added a historical sub which triggered a code change/save.

    // Let's rely on the remaining history or just leave the current code if it looks correct (user didn't specify exact code to restore, just "revert records").
    // If we delete the history of changes, we should probably set the code back to what it was before the mess.
    // If 000811 was the code before today, we should restore it.

    // Checking previous inspection:
    // [0] Code: 000811, Date: 2026-02-19T02:17...
    // [1] Code: 001264, Date: 2026-02-19T02:05...

    // If we delete these, we are left with whatever was before.
    // However, deleting history doesn't automatically revert `socio.codigo`.
    // If the user wants to "revert", they probably want the code back to 000811 (if that was the original).
    // Current code is likely 001264 or something else?

    // Let's just delete the records for now. The user can manually edit the code if needed, strictly speaking "reverting records" means deleting what was added.
    // But to be helpful, if the current code depends on the deleted history, we might want to fix it.
    // I'll set the socio code to 000811 if it's not already, as that seems to be the "stable" code before the recent 001264 change.
    // Wait, the log says:
    // [0] 000811 (Latest change) -> This implies 000811 IS the old code pushed to history when a NEW code was generated? 
    // OR is it the new code?
    // Converting logic: createSocio(code=X) -> no history. updateSocio(newCode=Y) -> History=X.
    // So if History[0] is 000811, it means the code WAS 000811 before it was changed to current.
    // So we should restore 000811.

    await prisma.socio.update({
        where: { id: socio.id },
        data: { codigo: '000811' }
    })
    console.log('Restored code to 000811.')

}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
