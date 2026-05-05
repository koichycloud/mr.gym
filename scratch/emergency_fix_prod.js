const { Client } = require('pg');

async function main() {
    const url = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
    console.log('Conectando a PostgreSQL (Producción) para reparación de emergencia...');
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        
        console.log('Verificando columna "permissions"...');
        const checkCol = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='User' AND column_name='permissions'
        `);

        if (checkCol.rowCount === 0) {
            console.log('Añadiendo columna "permissions"...');
            await client.query(`ALTER TABLE "User" ADD COLUMN "permissions" JSONB DEFAULT '[]'`);
            console.log('Columna añadida con éxito.');
        } else {
            console.log('La columna ya existe.');
        }

        console.log('Actualizando registros nulos...');
        const res = await client.query(`UPDATE "User" SET "permissions" = '[]' WHERE "permissions" IS NULL`);
        console.log(`✅ PRODUCCIÓN: Se han reparado ${res.rowCount} registros de usuario.`);
        
    } catch (err) {
        console.error('❌ ERROR FATAL en Reparación:', err);
    } finally {
        await client.end();
    }
}

main();
