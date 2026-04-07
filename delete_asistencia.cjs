const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  try {
    await client.connect();

    const socioRes = await client.query(`SELECT id, nombres, apellidos FROM "Socio" WHERE codigo = $1 OR "numeroDocumento" = $1 LIMIT 1`, ['72840294']);
    if (socioRes.rows.length === 0) return;
    const socioId = socioRes.rows[0].id;

    // Check Pago
    const pg = await client.query(`SELECT id, fecha, "createdAt" FROM "Pago" WHERE "socioId" = $1 ORDER BY "createdAt" DESC LIMIT 5`, [socioId]);
    console.log("Pago:", pg.rows.map(r => r.createdAt));

    // Check Suscripcion
    const s = await client.query(`SELECT id, "createdAt" FROM "Suscripcion" WHERE "socioId" = $1 ORDER BY "createdAt" DESC LIMIT 5`, [socioId]);
    console.log("Suscripcion:", s.rows.map(r => r.createdAt));

    const resA = await client.query(`DELETE FROM "Asistencia" WHERE "socioId" = $1 AND "fecha" >= current_date`, [socioId]);
    console.log(`Deleted Asistencia: ${resA.rowCount}`);

    const resP = await client.query(`DELETE FROM "Pago" WHERE "socioId" = $1 AND "createdAt" >= NOW() - INTERVAL '4 hours'`, [socioId]);
    console.log(`Deleted Pago: ${resP.rowCount}`);
    
    const resS = await client.query(`DELETE FROM "Suscripcion" WHERE "socioId" = $1 AND "createdAt" >= NOW() - INTERVAL '4 hours'`, [socioId]);
    console.log(`Deleted Suscripcion: ${resS.rowCount}`);

    const resH = await client.query(`DELETE FROM "CodigoHistorial" WHERE "socioId" = $1 AND "fechaCambio" >= NOW() - INTERVAL '4 hours'`, [socioId]);
    console.log(`Deleted CodigoHistorial: ${resH.rowCount}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
