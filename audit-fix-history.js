/**
 * audit-fix-history.js
 * 
 * Audits all socios:
 *   - A socio with N subscriptions (ordered by date) should have N-1 history entries.
 *     (First subscription = original code, each renewal creates a new history entry.)
 * 
 * For any socio with fewer history entries than expected, it backfills them
 * using the `codigo` field stored on each `Suscripcion`.
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socios = await prisma.socio.findMany({
        include: {
            suscripciones: { orderBy: { fechaInicio: 'asc' } },
            historialCodigos: { orderBy: { fechaCambio: 'asc' } }
        }
    })

    let totalFixed = 0
    let totalOk = 0
    let missingCodigoProblem = []

    for (const socio of socios) {
        const subs = socio.suscripciones
        const history = socio.historialCodigos

        // Expected: one history entry per renewal (all subs except the first)
        const expectedHistoryCount = Math.max(0, subs.length - 1)
        const actualHistoryCount = history.length

        if (actualHistoryCount >= expectedHistoryCount) {
            totalOk++
            continue
        }

        // Need to backfill. 
        // Each subscription (except the last) represents the code AT THAT TIME.
        // When the next sub starts, the previous code should be logged.
        // History entries to create: for each sub[i] where i < subs.length-1,
        // create a history entry with sub[i].codigo at date sub[i+1].fechaInicio.

        // Existing history codes to avoid duplicates
        const existingCodes = new Set(history.map(h => `${h.codigo}|${h.fechaCambio.toISOString().split('T')[0]}`))

        let createdForSocio = 0
        for (let i = 0; i < subs.length - 1; i++) {
            const sub = subs[i]
            const nextSub = subs[i + 1]

            if (!sub.codigo) {
                missingCodigoProblem.push({
                    socio: `${socio.nombres} ${socio.apellidos} (DNI: ${socio.numeroDocumento})`,
                    subId: sub.id,
                    start: sub.fechaInicio.toISOString().split('T')[0]
                })
                continue
            }

            const dateKey = `${sub.codigo}|${nextSub.fechaInicio.toISOString().split('T')[0]}`
            if (existingCodes.has(dateKey)) continue // Already exists

            await prisma.codigoHistorial.create({
                data: {
                    socioId: socio.id,
                    codigo: sub.codigo,
                    fechaCambio: nextSub.fechaInicio
                }
            })

            existingCodes.add(dateKey)
            createdForSocio++
            totalFixed++
        }

        if (createdForSocio > 0) {
            console.log(`[FIXED] ${socio.nombres} ${socio.apellidos} (DNI: ${socio.numeroDocumento}) — Added ${createdForSocio} history entries.`)
        }
    }

    console.log(`\n--- AUDIT COMPLETE ---`)
    console.log(`Total socios OK (no fix needed): ${totalOk}`)
    console.log(`Total history entries added: ${totalFixed}`)

    if (missingCodigoProblem.length > 0) {
        console.log(`\nWarning: The following subscriptions had no 'codigo' field (cannot auto-backfill):`)
        missingCodigoProblem.forEach(p => {
            console.log(`  - ${p.socio} | Sub Start: ${p.start} | ID: ${p.subId}`)
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
