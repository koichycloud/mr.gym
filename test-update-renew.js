const { updateSocio, getSocioById } = require('./src/app/actions/socios')

async function testUpdateRenew() {
    const socioId = '5ec27b5e-d43b-4264-a2e1-2eb3bf2294a8' // jose correa torres (001301)
    console.log('Testing updateSocio with renewal for socio ID:', socioId)

    const testData = {
        codigo: '001301', // No change in code for this test
        nombres: 'jose correa torres TEST',
        apellidos: 'test apellidos',
        tipoDocumento: 'DNI',
        numeroDocumento: '001301',
        fechaNacimiento: new Date('1990-01-01'),
        sexo: 'M',
        suscripcion: {
            meses: 1,
            fechaInicio: new Date()
        }
    }

    const result = await updateSocio(socioId, testData)

    if (result.success) {
        console.log('Success: updateSocio returned success.')
        const updatedSocio = await getSocioById(socioId)
        console.log('Newest subscription:', updatedSocio.suscripciones[0])
        console.log('Total subscriptions:', updatedSocio.suscripciones.length)
    } else {
        console.log('Failure:', result.error)
    }

    process.exit(0)
}

testUpdateRenew().catch(e => {
    console.error(e)
    process.exit(1)
})
