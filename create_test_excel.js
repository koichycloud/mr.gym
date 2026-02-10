const XLSX = require('xlsx');

const data = [
    {
        codigo: 'TEST01',
        nombres: 'Juan',
        apellidos: 'Perez',
        dni: '12345678',
        telefono: '999888777',
        fechaNacimiento: '1990-01-01',
        meses: 1,
        fechaInicio: '2026-01-28'
    },
    {
        codigo: 'TEST02',
        nombres: 'Maria',
        apellidos: 'Gomez',
        dni: '87654321',
        telefono: '999111222',
        fechaNacimiento: '1995-05-15',
        meses: 3,
        fechaInicio: '2026-02-01'
    }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Socios");
XLSX.writeFile(wb, "test_socios.xlsx");
console.log('Archivo test_socios.xlsx creado correctamente.');
