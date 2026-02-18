const { checkSocioExists } = require('./src/app/actions/socios')

async function testCheck() {
    console.log('Testing checkSocioExists for 000906...')
    const socio = await checkSocioExists('DNI', '73033253')

    if (socio && socio.id) {
        console.log('Success: Socio found with ID:', socio.id)
        console.log('Full object returned:', JSON.stringify(socio, null, 2))
    } else {
        console.log('Failure: Socio not found or ID missing.')
    }

    process.exit(0)
}

testCheck().catch(e => {
    console.error(e)
    process.exit(1)
})
