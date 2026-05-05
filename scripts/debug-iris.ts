import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient({ datasources: { db: { url: process.env.PROD_DATABASE_URL } } })

async function main() {
    const socio = await prisma.socio.findFirst({
        where: { numeroDocumento: '41060826' },
        include: {
            suscripciones: {
                orderBy: { createdAt: 'desc' }
            }
        }
    })
    if (!socio) return console.log('Socio no encontrado')
    console.log(`Socio: ${socio.nombres} ${socio.apellidos}`)
    socio.suscripciones.forEach(sub => {
        console.log(`ID: ${sub.id} | Estado: ${sub.estado} | Inicio: ${sub.fechaInicio.toISOString()} | Fin: ${sub.fechaFin.toISOString()} | CreatedAt: ${sub.createdAt.toISOString()}`)
    })
}
main().finally(() => prisma.$disconnect())
