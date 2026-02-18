const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const socios = await prisma.socio.findMany({
        select: { codigo: true }
    })

    const numericCodes = socios
        .map(s => parseInt(s.codigo, 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b)

    if (numericCodes.length === 0) {
        console.log("No numeric codes found.")
        process.exit(0)
    }

    const min = 1
    const max = numericCodes[numericCodes.length - 1]
    const gaps = []

    let currentGapStart = null

    // Using a Set for faster lookup
    const codeSet = new Set(numericCodes)

    for (let i = min; i <= max; i++) {
        if (!codeSet.has(i)) {
            if (currentGapStart === null) {
                currentGapStart = i
            }
        } else {
            if (currentGapStart !== null) {
                const gapEnd = i - 1
                gaps.push(currentGapStart === gapEnd ? `${String(currentGapStart).padStart(6, '0')}` : `${String(currentGapStart).padStart(6, '0')} - ${String(gapEnd).padStart(6, '0')}`)
                currentGapStart = null
            }
        }
    }

    console.log(JSON.stringify({ min, max, totalSocios: numericCodes.length, gaps }, null, 2))
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
