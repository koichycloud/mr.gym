const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx');

const prisma = new PrismaClient()

async function main() {
    const filePath = 'C:\\Users\\HP\\Desktop\\mr. gym.xlsx';
    console.log('Leyendo:', filePath);
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    console.log(`Filas: ${data.length}`);

    // MOCK MAPPING based on headers seen in logs
    // Trying to guess based on standard names
    const first = data[0];
    const headers = Object.keys(first);
    console.log('Headers detected:', headers);

    const mapping = {};
    headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('codigo')) mapping['codigo'] = h;
        if (lower.includes('nombre')) mapping['nombres'] = h;
        if (lower.includes('apellido')) mapping['apellidos'] = h;
        if (lower.includes('dni') || lower.includes('documento')) mapping['numeroDocumento'] = h;
        if (lower.includes('nacimiento')) mapping['fechaNacimiento'] = h;
        if (lower.includes('telefono') || lower.includes('celular')) mapping['telefono'] = h;
        if (lower.includes('inicio')) mapping['fechaInicio'] = h;
        if (lower.includes('fin')) mapping['fechaFin'] = h; // Note: import.ts expects 'meses', not 'fechaFin' usually, but we'll see
        if (lower.includes('meses')) mapping['meses'] = h;
    });
    console.log('Mapping inferido:', mapping);

    // COPY OF LOGIC FROM import.ts
    await prisma.$transaction(async (tx) => {
        const existingCodes = await tx.socio.findMany({ select: { codigo: true } })
        const takenCodes = new Set(existingCodes.map(s => s.codigo))

        let maxNum = 0
        existingCodes.forEach(s => {
            const num = parseInt(s.codigo)
            if (!isNaN(num) && num > maxNum) maxNum = num
        })
        let nextCodeNum = maxNum + 1

        for (const row of data) {
            const getVal = (field) => {
                const colName = mapping[field]
                return colName ? row[colName] : null
            }

            try {
                // ... logic copy ...
                let codigoRaw = getVal('codigo');
                let codigo = codigoRaw ? String(codigoRaw).padStart(6, '0') : '';

                if (!codigo || takenCodes.has(codigo)) {
                    while (takenCodes.has(String(nextCodeNum).padStart(6, '0'))) {
                        nextCodeNum++
                    }
                    codigo = String(nextCodeNum).padStart(6, '0')
                    nextCodeNum++
                }
                takenCodes.add(codigo);

                const parseExcelDate = (val) => {
                    if (!val) return new Date()
                    if (typeof val === 'number') {
                        return new Date(Math.round((val - 25569) * 86400 * 1000))
                    }
                    const parsed = new Date(val)
                    if (!isNaN(parsed.getTime())) return parsed
                    return new Date()
                }

                let fechaNacimiento = parseExcelDate(getVal('fechaNacimiento'))

                let numeroDocumento = String(getVal('dni') || getVal('numeroDocumento') || '')
                if (!numeroDocumento || numeroDocumento === '0' || numeroDocumento === '00000000') {
                    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000)
                    numeroDocumento = `SD-${uniqueSuffix}`
                }

                console.log(`Procesando: ${codigo} - ${numeroDocumento} - Nac: ${fechaNacimiento.toISOString()}`);

                const socio = await tx.socio.create({
                    data: {
                        codigo,
                        nombres: String(getVal('nombres') || 'Socio'),
                        apellidos: String(getVal('apellidos') || 'Sin Apellido'),
                        tipoDocumento: 'DNI',
                        numeroDocumento,
                        fechaNacimiento,
                        telefono: String(getVal('telefono') || '')
                    }
                })

                // Subscription logic mock
                const fInicioRaw = getVal('fechaInicio');
                if (fInicioRaw) {
                    // logic...
                }

            } catch (err) {
                console.error('ERROR en fila:', JSON.stringify(row));
                console.error('ERROR DETAILS:', JSON.stringify(err, null, 2));
                throw err; // Stop on first error to see it
            }
        }
    }, {
        maxWait: 5000, // default: 2000
        timeout: 10000 // default: 5000
    })
    console.log('Transacción completada con éxito.');
}

main()
    .catch(e => console.error('FATAL:', e))
    .finally(() => prisma.$disconnect())
