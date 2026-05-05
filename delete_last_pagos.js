
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        console.log("Conectado a Supabase. Buscando los últimos 2 ingresos...");
        
        const res = await client.query('SELECT id, monto, concepto, descripcion, "createdAt" FROM "Pago" ORDER BY "createdAt" DESC LIMIT 2');
        
        if (res.rows.length === 0) {
            console.log("No se encontraron pagos.");
            return;
        }

        console.log("Pagos a eliminar:");
        res.rows.forEach(p => {
            console.log(`- ID: ${p.id} | Monto: ${p.monto} | Concepto: ${p.concepto} | Desc: ${p.descripcion} | Creado: ${p.createdAt}`);
        });

        const ids = res.rows.map(r => r.id);
        const delRes = await client.query('DELETE FROM "Pago" WHERE id = ANY($1)', [ids]);
        console.log(`Eliminados ${delRes.rowCount} pagos con éxito.`);

    } catch (e) {
        console.error("Error: ", e);
    } finally {
        await client.end();
    }
}

main();
