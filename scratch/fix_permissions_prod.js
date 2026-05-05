const { Client } = require('pg');

async function main() {
    const url = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
    console.log('Conectando a PostgreSQL (Producción) para corregir permisos...');
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        // En Postgres, el valor por defecto para Json debe ser un string JSON válido
        const res = await client.query(`UPDATE "User" SET "permissions" = '[]' WHERE "permissions" IS NULL`);
        console.log(`✅ PRODUCCIÓN: Se han corregido ${res.rowCount} registros de usuario.`);
    } catch (err) {
        console.error('❌ ERROR en Producción:', err);
    } finally {
        await client.end();
    }
}

main();
