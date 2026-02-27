const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    });

    try {
        await client.connect();
        console.log("Conectado a la base de datos");

        const res = await client.query(`SELECT id, nombres, apellidos, codigo FROM "Socio" WHERE codigo = '001341'`);
        const socio = res.rows[0];

        if (!socio) {
            console.log("No se encontró el socio 001341");
            return;
        }

        console.log("Socio encontrado:", socio.nombres, socio.apellidos);

        const subRes = await client.query(`SELECT codigo FROM "Suscripcion" WHERE "socioId" = $1 ORDER BY "fechaInicio" ASC`, [socio.id]);
        const suscripciones = subRes.rows;

        console.log("Todas las suscripciones del socio (viejas a nuevas):", suscripciones.map(s => s.codigo));

        const histRes = await client.query(`SELECT codigo FROM "CodigoHistorial" WHERE "socioId" = $1`, [socio.id]);
        const historialActual = histRes.rows.map(h => h.codigo);

        console.log("Historial actual almacenado:", historialActual);

        const currentCode = socio.codigo;
        const allCodes = Array.from(new Set(suscripciones.map(s => s.codigo).filter(c => c)));
        const previousCodes = allCodes.filter(c => c !== currentCode);

        for (const code of previousCodes) {
            if (!historialActual.includes(code)) {
                console.log(`Insertando código faltante ${code} en CodigoHistorial...`);
                await client.query(
                    `INSERT INTO "CodigoHistorial" (id, "socioId", codigo, "fechaCambio") VALUES ($1, $2, $3, $4)`,
                    [require('crypto').randomUUID(), socio.id, code, new Date()]
                );
                console.log(`Código ${code} parcheado exitosamente.`);
            }
        }

        console.log("Parche finalizado.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
