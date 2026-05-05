
const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        const code = '005558237';
        
        console.log(`Buscando socio ${code} en DB (aws-1-us-east-1)...`);
        const res = await client.query('SELECT id, nombres, apellidos, codigo FROM "Socio" WHERE codigo = $1 OR "numeroDocumento" = $1', [code]);
        
        if (res.rows.length === 0) {
            console.log(`No se encontró al socio con código/DNI ${code} en esta DB.`);
            return;
        }

        const socio = res.rows[0];
        console.log(`¡ENCONTRADO! Socio: ${socio.nombres} ${socio.apellidos} (ID: ${socio.id}, Código: ${socio.codigo})`);

        // Get counts
        const pagoRes = await client.query('SELECT count(*) FROM "Pago" WHERE "socioId" = $1', [socio.id]);
        const subRes = await client.query('SELECT count(*) FROM "Suscripcion" WHERE "socioId" = $1', [socio.id]);
        const asisRes = await client.query('SELECT count(*) FROM "Asistencia" WHERE "socioId" = $1', [socio.id]);
        
        console.log(`Relaciones: ${pagoRes.rows[0].count} pagos, ${subRes.rows[0].count} suscripciones, ${asisRes.rows[0].count} asistencias.`);

        // Delete (The user asked to delete)
        console.log("Eliminando pagos...");
        await client.query('DELETE FROM "Pago" WHERE "socioId" = $1', [socio.id]);
        
        console.log("Eliminando socio (el resto debería ser en cascada)...");
        await client.query('DELETE FROM "Socio" WHERE id = $1', [socio.id]);
        
        console.log(`Socio ${code} y todas sus transacciones han sido eliminados con éxito.`);

    } catch (e) {
        console.error("Error en DB: ", e);
    } finally {
        await client.end();
    }
}

main();
