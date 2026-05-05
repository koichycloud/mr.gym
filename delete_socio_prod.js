
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83postgres@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        const code = '005558237';
        
        // Find socio
        const res = await client.query('SELECT id, nombres, apellidos FROM "Socio" WHERE codigo = $1', [code]);
        
        if (res.rows.length === 0) {
            console.log(`No se encontró al socio con código ${code} en Supabase.`);
            return;
        }

        const socio = res.rows[0];
        console.log(`Encontrado socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id})`);

        // Check payments
        const pagoRes = await client.query('SELECT count(*) FROM "Pago" WHERE "socioId" = $1', [socio.id]);
        console.log(`Pagos encontrados: ${pagoRes.rows[0].count}`);

        // Delete payments
        const delPagos = await client.query('DELETE FROM "Pago" WHERE "socioId" = $1', [socio.id]);
        console.log(`Eliminados ${delPagos.rowCount} pagos.`);

        // Delete socio
        const delSocio = await client.query('DELETE FROM "Socio" WHERE id = $1', [socio.id]);
        console.log(`Socio ${code} eliminado con éxito.`);

    } catch (e) {
        console.error("Error en Supabase: ", e);
    } finally {
        await client.end();
    }
}

main();
