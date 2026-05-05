
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        console.log("Conectado a Supabase. Listando últimos 10 socios registrados:");
        const res = await client.query('SELECT codigo, nombres, apellidos, "numeroDocumento", "createdAt" FROM "Socio" ORDER BY "createdAt" DESC LIMIT 10');
        
        res.rows.forEach(s => {
            console.log(`[${s.createdAt.toISOString()}] Código: ${s.codigo} | Doc: ${s.numeroDocumento} | Nombre: ${s.nombres} ${s.apellidos}`);
        });

    } catch (e) {
        console.error("Error: ", e);
    } finally {
        await client.end();
    }
}

main();
