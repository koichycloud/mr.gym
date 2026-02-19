const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('Starting backfill...')

    // Get all socios with their subscriptions and code history
    const socios = await prisma.socio.findMany({
        include: {
            suscripciones: {
                orderBy: { fechaInicio: 'desc' }, // Newest first
                where: { codigo: null } // Only process those without code
            },
            historialCodigos: {
                orderBy: { fechaCambio: 'desc' } // Newest change first
            }
        }
    })

    console.log(`Found ${socios.length} socios to process.`)
    let updatedCount = 0

    for (const socio of socios) {
        if (socio.suscripciones.length === 0) continue;

        // Process subscriptions
        // The logic used in frontend was:
        // Index 0 (Newest Sub) -> socio.codigo
        // Index 1 (Older Sub) -> historialCodigos[0].codigo
        // Index 2 (Older Sub) -> historialCodigos[1].codigo

        // We will apply this logic to persist the codes
        const history = socio.historialCodigos || []

        for (let i = 0; i < socio.suscripciones.length; i++) {
            const sub = socio.suscripciones[i]
            let codeToSet = ''

            if (i === 0) {
                // Newest subscription gets current code
                codeToSet = socio.codigo
            } else {
                // Older subscriptions get history code matches
                // History index is i - 1
                const historyIndex = i - 1
                if (history[historyIndex]) {
                    codeToSet = history[historyIndex].codigo
                } else {
                    // Fallback if history is missing: keep current code or leave empty?
                    // Better to set current code than nothing if history is missing but sub exists
                    codeToSet = socio.codigo
                }
            }

            if (codeToSet) {
                await prisma.suscripcion.update({
                    where: { id: sub.id },
                    data: { codigo: codeToSet }
                })
                updatedCount++
                // process.stdout.write('.')
            }
        }
    }

    console.log(`\nBackfill completed! Updated ${updatedCount} subscriptions.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
