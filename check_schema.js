process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
async function checkSchema() {
    const url = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Socio';
        `);
        console.log('Columnas de Socio:', res.rows.map(r => r.column_name));

        const res2 = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        console.log('Tablas en BD:', res2.rows.map(r => r.table_name));

    } catch (e) {
        console.error('Error:', e.stack);
    } finally {
        await client.end();
    }
}
checkSchema();
