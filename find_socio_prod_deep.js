
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        const search = '5558237';
        console.log(`Buscando patrón ${search} en Supabase...`);
        const res = await client.query(`
            SELECT id, codigo, "numeroDocumento", nombres, apellidos 
            FROM "Socio" 
            WHERE codigo LIKE '%' || $1 || '%' 
               OR "numeroDocumento" LIKE '%' || $1 || '%'
               OR nombres ILIKE '%Prueba%'
               OR apellidos ILIKE '%Prueba%'
        `, [search]);
        
        if (res.rows.length === 0) {
            console.log(`No se encontró nada con el patrón ${search} o 'Prueba'.`);
            return;
        }

        res.rows.forEach(s => {
            console.log(`¡ENCONTRADO! ID: ${s.id} | Código: ${s.codigo} | Doc: ${s.numeroDocumento} | Nombre: ${s.nombres} ${s.apellidos}`);
        });

    } catch (e) {
        console.error("Error: ", e);
    } finally {
        await client.end();
    }
}

main();
