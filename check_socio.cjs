const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  try {
    await client.connect();

    // The socio could have had code '72840294' previously. Let's find by numeroDocumento.
    const socioRes = await client.query(`SELECT id, codigo, "numeroDocumento", nombres FROM "Socio" WHERE codigo = $1 OR "numeroDocumento" = $1 LIMIT 1`, ['72840294']);
    if (socioRes.rows.length === 0) {
      console.log("No socio found");
      return;
    }
    const socio = socioRes.rows[0];
    console.log(`Socio: ${socio.nombres}, Current DB Code: '${socio.codigo}'`);

    const histRes = await client.query(`SELECT codigo, "fechaCambio" FROM "CodigoHistorial" WHERE "socioId" = $1 ORDER BY "fechaCambio" DESC`, [socio.id]);
    console.log("History records:", histRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
