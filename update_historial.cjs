const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  try {
    await client.connect();

    // Get the Socio ID
    const socioRes = await client.query(`SELECT id FROM "Socio" WHERE codigo = $1 OR "numeroDocumento" = $1 LIMIT 1`, ['72840294']);
    if (socioRes.rows.length === 0) {
      console.log("No socio found");
      return;
    }
    const socioId = socioRes.rows[0].id;

    // Delete the incorrectly assigned historical code (72840294)
    await client.query(`DELETE FROM "CodigoHistorial" WHERE "socioId" = $1 AND codigo = '72840294'`, [socioId]);
    console.log(`Eliminado el código temporal anterior.`);

    // Insert the correct historical code (001032)
    const { randomUUID } = require('crypto');
    const correctCode = '001032';
    
    await client.query(`
      INSERT INTO "CodigoHistorial" (id, "socioId", codigo, "fechaCambio") 
      VALUES ($1, $2, $3, NOW())
    `, [randomUUID(), socioId, correctCode]);

    console.log(`Insertado el código correcto '${correctCode}' en el historial.`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
