const XLSX = require('xlsx');

const filePath = 'C:\\Users\\HP\\Desktop\\mr. gym.xlsx';

try {
    console.log('Leyendo archivo:', filePath);
    const wb = XLSX.readFile(filePath);
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws);

    console.log('Filas encontradas:', data.length);
    if (data.length > 0) {
        console.log('Primera fila (Headers/Keys):', Object.keys(data[0]));
        console.log('Primer objeto:', data[0]);
    }

    // Simulate connection logic
    console.log('Simulando lógica de importación...');

    // Validar posibles errores
    data.forEach((row, i) => {
        try {
            // Check headers manually to match what the user might map
            // We don't know the mapping, but we can guess or just check raw values
            const headers = Object.keys(row);

            // Check for potential date issues
            headers.forEach(h => {
                if (h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date')) {
                    const val = row[h];
                    const date = new Date(val);
                    // Excel dates might be numbers, that's fine for new Date() if they are milliseconds, 
                    // BUT Excel dates are days since 1900, so new Date(44000) is 1970... 
                    // XLSX.utils.sheet_to_json usually handles type decoding if passed options, but default is raw.
                    console.log(`Fila ${i} [${h}]: ${val} (Type: ${typeof val}) -> Parsed: ${date}`);
                }
            });

        } catch (e) {
            console.error(`Error procesando fila ${i}:`, e);
        }
    });

    console.log('Análisis finalizado.');

} catch (e) {
    console.error('Error fatal leyendo el archivo:', e);
}
