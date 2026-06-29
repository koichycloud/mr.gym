const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

async function main() {
    try {
        await client.connect();
        console.log("Conectado a la base de datos de producción...");

        // 1. Obtener todos los socios
        const sociosRes = await client.query('SELECT id, codigo, nombres, apellidos, "numeroDocumento" FROM "Socio"');
        const socios = sociosRes.rows;

        // 2. Obtener todas las suscripciones
        const subsRes = await client.query('SELECT id, "socioId", "fechaFin", estado FROM "Suscripcion"');
        const subscriptions = subsRes.rows;

        // 3. Obtener todo el historial de códigos
        const histRes = await client.query('SELECT id, "socioId", codigo FROM "CodigoHistorial"');
        const historyCodes = histRes.rows;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Agrupar suscripciones por socioId
        const subsBySocio = {};
        subscriptions.forEach(sub => {
            if (!subsBySocio[sub.socioId]) subsBySocio[sub.socioId] = [];
            subsBySocio[sub.socioId].push(sub);
        });

        // Agrupar historial de códigos por socioId
        const histBySocio = {};
        historyCodes.forEach(hist => {
            if (!histBySocio[hist.socioId]) histBySocio[hist.socioId] = [];
            histBySocio[hist.socioId].push(hist.codigo);
        });

        // Clasificar socios
        const habilitados = [];
        const vencidos = [];
        const sinSuscripcion = [];

        socios.forEach(s => {
            const subs = subsBySocio[s.id] || [];
            const historic = histBySocio[s.id] || [];
            
            s.historicos = historic;
            s.suscripciones = subs;

            if (subs.length === 0) {
                sinSuscripcion.push(s);
                return;
            }

            // Un socio está habilitado si tiene al menos una suscripción activa cuya fechaFin >= hoy
            const tieneActiva = subs.some(sub => new Date(sub.fechaFin) >= today);

            if (tieneActiva) {
                habilitados.push(s);
            } else {
                vencidos.push(s);
            }
        });

        console.log(`\n=== RESUMEN GENERAL ===`);
        console.log(`Total Socios: ${socios.length}`);
        console.log(`Socios Habilitados (Activos): ${habilitados.length}`);
        console.log(`Socios Vencidos: ${vencidos.length}`);
        console.log(`Socios sin Suscripción: ${sinSuscripcion.length}`);

        // --- COMPARACIÓN 1: Coincidencias de DNI/Documento ---
        console.log(`\n=== 1. COINCIDENCIAS POR NÚMERO DE DOCUMENTO (DNI) ===`);
        const dniMap = {};
        socios.forEach(s => {
            if (s.numeroDocumento) {
                if (!dniMap[s.numeroDocumento]) dniMap[s.numeroDocumento] = [];
                dniMap[s.numeroDocumento].push(s);
            }
        });

        let dniDuplicatesCount = 0;
        Object.keys(dniMap).forEach(dni => {
            if (dniMap[dni].length > 1) {
                dniDuplicatesCount++;
                console.log(`DNI duplicado: ${dni}`);
                dniMap[dni].forEach(s => {
                    const status = habilitados.includes(s) ? 'HABILITADO' : (vencidos.includes(s) ? 'VENCIDO' : 'SIN_SUB');
                    console.log(`  - [${status}] Código: ${s.codigo} | Nombre: ${s.nombres} ${s.apellidos}`);
                });
            }
        });
        if (dniDuplicatesCount === 0) {
            console.log("No se encontraron socios con el mismo número de documento.");
        }

        // --- COMPARACIÓN 2: Coincidencias de Código (Código Actual vs Código Actual) ---
        console.log(`\n=== 2. COINCIDENCIAS POR CÓDIGO ACTUAL ===`);
        const codeMap = {};
        socios.forEach(s => {
            if (s.codigo) {
                const clean = s.codigo.trim().toUpperCase();
                if (!codeMap[clean]) codeMap[clean] = [];
                codeMap[clean].push(s);
            }
        });

        let codeDuplicatesCount = 0;
        Object.keys(codeMap).forEach(code => {
            if (codeMap[code].length > 1) {
                codeDuplicatesCount++;
                console.log(`Código duplicado: ${code}`);
                codeMap[code].forEach(s => {
                    const status = habilitados.includes(s) ? 'HABILITADO' : (vencidos.includes(s) ? 'VENCIDO' : 'SIN_SUB');
                    console.log(`  - [${status}] Nombre: ${s.nombres} ${s.apellidos} | DNI: ${s.numeroDocumento}`);
                });
            }
        });
        if (codeDuplicatesCount === 0) {
            console.log("No se encontraron socios con el mismo código de acceso actual.");
        }

        // --- COMPARACIÓN 3: Coincidencias Cruzadas (Códigos Actuales vs Históricos) ---
        console.log(`\n=== 3. COINCIDENCIAS CRUZADAS (CÓDIGO ACTUAL VS HISTÓRICO) ===`);
        // Queremos ver si el código actual de un socio está en el historial de otro socio
        let crossMatchesCount = 0;
        socios.forEach(s1 => {
            const cleanCode1 = s1.codigo.trim().toUpperCase();
            
            socios.forEach(s2 => {
                if (s1.id === s2.id) return; // Mismo socio

                const tieneComoHistorico = s2.historicos.some(hCode => hCode.trim().toUpperCase() === cleanCode1);
                if (tieneComoHistorico) {
                    crossMatchesCount++;
                    const status1 = habilitados.includes(s1) ? 'HABILITADO' : (vencidos.includes(s1) ? 'VENCIDO' : 'SIN_SUB');
                    const status2 = habilitados.includes(s2) ? 'HABILITADO' : (vencidos.includes(s2) ? 'VENCIDO' : 'SIN_SUB');
                    
                    console.log(`Conflicto de código: "${cleanCode1}"`);
                    console.log(`  - Usado como CÓDIGO ACTUAL por: [${status1}] ${s1.nombres} ${s1.apellidos} (ID: ${s1.id})`);
                    console.log(`  - Usado como CÓDIGO HISTÓRICO por: [${status2}] ${s2.nombres} ${s2.apellidos} (ID: ${s2.id})`);
                }
            });
        });
        if (crossMatchesCount === 0) {
            console.log("No se encontraron códigos actuales que existan como códigos históricos en otros socios.");
        }

        // --- COMPARACIÓN 4: Cruce de Históricos vs Históricos ---
        console.log(`\n=== 4. COINCIDENCIAS DE CÓDIGOS HISTÓRICOS ENTRE SÍ ===`);
        const histCodeMap = {};
        socios.forEach(s => {
            s.historicos.forEach(h => {
                const clean = h.trim().toUpperCase();
                if (!histCodeMap[clean]) histCodeMap[clean] = [];
                histCodeMap[clean].push(s);
            });
        });

        let histDuplicatesCount = 0;
        Object.keys(histCodeMap).forEach(code => {
            if (histCodeMap[code].length > 1) {
                histDuplicatesCount++;
                console.log(`Código Histórico repetido en múltiples socios: "${code}"`);
                histCodeMap[code].forEach(s => {
                    const status = habilitados.includes(s) ? 'HABILITADO' : (vencidos.includes(s) ? 'VENCIDO' : 'SIN_SUB');
                    console.log(`  - [${status}] Código Actual: ${s.codigo} | Nombre: ${s.nombres} ${s.apellidos}`);
                });
            }
        });
        if (histDuplicatesCount === 0) {
            console.log("No se encontraron códigos históricos compartidos por múltiples socios.");
        }

    } catch (e) {
        console.error("Error durante la comparación: ", e);
    } finally {
        await client.end();
    }
}

main();
