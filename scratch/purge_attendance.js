const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');

async function purgePostgres(url) {
    console.log('Conectando a PostgreSQL (Producción)...');
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        const res = await client.query('DELETE FROM "Asistencia"');
        console.log(`✅ PRODUCCIÓN: Se han eliminado ${res.rowCount} registros de asistencia.`);
    } catch (err) {
        console.error('❌ ERROR en Producción:', err);
    } finally {
        await client.end();
    }
}

async function purgeSqlite() {
    console.log('Conectando a SQLite (Local)...');
    const prisma = new PrismaClient();
    try {
        const count = await prisma.asistencia.deleteMany({});
        console.log(`✅ LOCAL: Se han eliminado ${count.count} registros de asistencia.`);
    } catch (err) {
        console.error('❌ ERROR en Local:', err);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const url = process.env.DATABASE_URL;
    if (url && url.startsWith('postgresql')) {
        await purgePostgres(url);
    } else {
        await purgeSqlite();
    }
}

main();
