const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
});

// Helper to normalize strings (lowercase, remove accents, trim, replace multiple spaces)
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, ' ');
}

// Helper to normalize DNI (extract digits only)
function normalizeDni(str) {
  if (!str) return '';
  return str.replace(/\D/g, '').trim();
}

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
      histBySocio[hist.socioId].push(hist.codigo.trim().toUpperCase());
    });

    // Clasificar socios en HABILITADOS, VENCIDOS, SIN_SUSCRIPCION
    const habilitados = [];
    const vencidos = [];
    const sinSuscripcion = [];

    socios.forEach(s => {
      const subs = subsBySocio[s.id] || [];
      const historic = histBySocio[s.id] || [];
      
      s.historicos = historic;
      s.suscripciones = subs;
      s.allCodes = new Set([s.codigo.trim().toUpperCase(), ...historic]);

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

    // --- COMPARACIÓN 1: Coincidencias de Nombres entre Habilitados y Vencidos ---
    console.log(`\n=== 1. COINCIDENCIAS DE NOMBRES (HABILITADOS VS VENCIDOS) ===`);
    let nameMatches = 0;
    
    habilitados.forEach(h => {
      const normH = normalizeString(`${h.nombres} ${h.apellidos}`);
      if (!normH) return;

      vencidos.forEach(v => {
        const normV = normalizeString(`${v.nombres} ${v.apellidos}`);
        if (!normV) return;

        if (normH === normV) {
          nameMatches++;
          console.log(`Socio duplicado por Nombre: "${h.nombres} ${h.apellidos}"`);
          console.log(`  - [HABILITADO] ID: ${h.id} | Código: ${h.codigo} | DNI: ${h.numeroDocumento}`);
          console.log(`  - [VENCIDO]    ID: ${v.id} | Código: ${v.codigo} | DNI: ${v.numeroDocumento}`);
        }
      });
    });

    if (nameMatches === 0) {
      console.log("No se encontraron coincidencias de nombres entre habilitados y vencidos.");
    } else {
      console.log(`Total coincidencias por nombre: ${nameMatches}`);
    }

    // --- COMPARACIÓN 2: Coincidencias de DNI Normalizado entre Habilitados y Vencidos ---
    console.log(`\n=== 2. COINCIDENCIAS DE DNI NORMALIZADO (HABILITADOS VS VENCIDOS) ===`);
    let dniMatches = 0;

    habilitados.forEach(h => {
      const normDniH = normalizeDni(h.numeroDocumento);
      if (!normDniH) return;

      vencidos.forEach(v => {
        const normDniV = normalizeDni(v.numeroDocumento);
        if (!normDniV) return;

        if (normDniH === normDniV) {
          dniMatches++;
          console.log(`Coincidencia de DNI: "${h.numeroDocumento}" (Norm: ${normDniH})`);
          console.log(`  - [HABILITADO] Nombre: ${h.nombres} ${h.apellidos} | ID: ${h.id} | Código: ${h.codigo}`);
          console.log(`  - [VENCIDO]    Nombre: ${v.nombres} ${v.apellidos} | ID: ${v.id} | Código: ${v.codigo}`);
        }
      });
    });

    if (dniMatches === 0) {
      console.log("No se encontraron coincidencias de DNI entre habilitados y vencidos.");
    } else {
      console.log(`Total coincidencias por DNI: ${dniMatches}`);
    }

    // --- COMPARACIÓN 3: Coincidencias de Códigos (Actuales o Históricos) entre Habilitados y Vencidos ---
    console.log(`\n=== 3. COINCIDENCIAS DE CÓDIGOS (ACTUALES/HISTÓRICOS) ENTRE HABILITADOS Y VENCIDOS ===`);
    let codeMatches = 0;

    habilitados.forEach(h => {
      vencidos.forEach(v => {
        // Encontrar la intersección de todos los códigos (actual + históricos) de ambos socios
        const intersection = [...h.allCodes].filter(x => v.allCodes.has(x));
        
        if (intersection.length > 0) {
          codeMatches++;
          console.log(`Socio Habilitado y Vencido comparten código(s): ${JSON.stringify(intersection)}`);
          console.log(`  - [HABILITADO] Nombre: ${h.nombres} ${h.apellidos} | ID: ${h.id} | Código Actual: ${h.codigo} | Históricos: ${JSON.stringify(h.historicos)}`);
          console.log(`  - [VENCIDO]    Nombre: ${v.nombres} ${v.apellidos} | ID: ${v.id} | Código Actual: ${v.codigo} | Históricos: ${JSON.stringify(v.historicos)}`);
        }
      });
    });

    if (codeMatches === 0) {
      console.log("No se encontraron coincidencias de códigos actuales o históricos entre habilitados y vencidos.");
    } else {
      console.log(`Total coincidencias de códigos: ${codeMatches}`);
    }

  } catch (e) {
    console.error("Error durante la comparación detallada: ", e);
  } finally {
    await client.end();
  }
}

main();
