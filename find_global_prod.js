
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        const search = '5558237';
        console.log(`Buscando ${search} en TODAS las tablas relevantes de Supabase...`);
        
        const q1 = await client.query('SELECT id, nombres, apellidos, codigo, "numeroDocumento", telefono FROM "Socio" WHERE codigo LIKE $1 OR "numeroDocumento" LIKE $1 OR telefono LIKE $1', [`%${search}%`]);
        if (q1.rows.length > 0) {
            console.log("Encontrado en Socio:");
            q1.rows.forEach(r => console.log(JSON.stringify(r)));
        }

        const q2 = await client.query('SELECT id, descripcion, monto FROM "Pago" WHERE descripcion LIKE $1', [`%${search}%`]);
        if (q2.rows.length > 0) {
            console.log("Encontrado en Pago:");
            q2.rows.forEach(r => console.log(JSON.stringify(r)));
        }

        const q3 = await client.query('SELECT * FROM "AuditLog" WHERE detalles LIKE $1', [`%${search}%`]);
        if (q3.rows.length > 0) {
            console.log("Encontrado en AuditLog:");
            q3.rows.forEach(r => console.log(JSON.stringify(r)));
        }

        if (q1.rows.length === 0 && q2.rows.length === 0 && q3.rows.length === 0) {
            console.log("Nada encontrado.");
        }

    } catch (e) {
        console.error("Error: ", e);
    } finally {
        await client.end();
    }
}

main();
