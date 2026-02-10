const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding test socios...')

    // Create out of order to test sorting
    // 1. Code 000001
    await prisma.socio.create({
        data: {
            codigo: '000001',
            nombres: 'Primero',
            apellidos: 'Test',
            tipoDocumento: 'DNI',
            numeroDocumento: '11111111',
            fechaNacimiento: new Date('1990-01-01'),
            sexo: 'M' // Added sex
        }
    })

    // 2. Code 000003 (Created second, but should be first in DESC sort)
    await prisma.socio.create({
        data: {
            codigo: '000003',
            nombres: 'Tercero',
            apellidos: 'Test',
            tipoDocumento: 'DNI',
            numeroDocumento: '33333333',
            fechaNacimiento: new Date('1990-01-01'),
            sexo: 'F'
        }
    })

    // 3. Code 000002
    await prisma.socio.create({
        data: {
            codigo: '000002',
            nombres: 'Segundo',
            apellidos: 'Test',
            tipoDocumento: 'DNI',
            numeroDocumento: '22222222',
            fechaNacimiento: new Date('1990-01-01'),
            sexo: 'M'
        }
    })

    console.log('Seeding complete.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
