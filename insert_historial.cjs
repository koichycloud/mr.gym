const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  try {
    await client.connect();

    // Get the Socio ID
    const socioRes = await client.query(`SELECT id, nombres, apellidos, codigo FROM "Socio" WHERE codigo = $1 OR "numeroDocumento" = $1 LIMIT 1`, ['72840294']);
    if (socioRes.rows.length === 0) {
      console.log("No socio found");
      return;
    }
    const socio = socioRes.rows[0];
    const socioId = socio.id;

    // Use a UUID for the id
    const { randomUUID } = require('crypto');
    
    // We'll insert an old code (e.g. 72840294) as history, settingfechaCambio to right now
    const oldCode = '72840294';
    
    const insertRes = await client.query(`
      INSERT INTO "CodigoHistorial" (id, "socioId", codigo, "fechaCambio") 
      VALUES ($1, $2, $3, NOW())
    `, [randomUUID(), socioId, oldCode]);

    console.log(`Inserted code '${oldCode}' into history for ${socio.nombres}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
