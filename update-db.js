const { Client } = require('pg');
async function runQuery(q) {
    const url = process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'statement_cache_size=0';
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
        await client.query(q);
        console.log('Success:', q.substring(0, 30));
    } catch (e) {
        // Ignore 'already exists' errors
        if (!e.message.includes('already exists')) {
            console.error('Error in query', q.substring(0, 30), e.message);
        }
    }
    finally { await client.end(); }
}

async function run() {
    await runQuery('ALTER TABLE "User" ADD COLUMN "fullName" TEXT');
    await runQuery('ALTER TABLE "User" ADD COLUMN "fotoUrl" TEXT');
    await runQuery('ALTER TABLE "Socio" ADD COLUMN "fotoUrl" TEXT');
    await runQuery('CREATE TABLE "AuditLog" ("id" TEXT NOT NULL, "usuario" TEXT NOT NULL, "accion" TEXT NOT NULL, "detalles" TEXT, "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"))');
    console.log('Done');
}
run();