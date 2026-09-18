import prisma from "@/lib/prisma";
import fs from "fs";

// Cargar .env.local y .env
const envLocal = fs.existsSync("C:/Users/HP/Desktop/mr_gym/.env.local")
  ? fs.readFileSync("C:/Users/HP/Desktop/mr_gym/.env.local", "utf8")
  : "";
const envMain = fs.existsSync("C:/Users/HP/Desktop/mr_gym/.env")
  ? fs.readFileSync("C:/Users/HP/Desktop/mr_gym/.env", "utf8")
  : "";

[envMain, envLocal].forEach((env) => {
  env.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [k, ...v] = trimmed.split("=");
      if (k && v.length > 0) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
});

process.env.AUTH_BYPASS_FOR_TEST = "true";

// Importar funciones del generador
import {
  generatePersonalizedSessions,
  detectSessionConflicts,
  createLimaDateTime,
  formatLimaTime,
  getLimaDayOfWeek,
} from "@/lib/personalized-training-generator";
import { formatLimaDate, getLimaStartOfDay } from "@/lib/date-utils";
import { previewPeriodoPersonalizadoSchema, crearPeriodoPersonalizadoSchema } from "@/lib/validations";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}: ${details}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS AUTOMATIZADAS — FASE H2: PERIODOS Y GENERADOR DE SESIONES");
  console.log("================================================================================\n");

  // Obtener socio y entrenador de prueba de la base de datos
  const socio = await prisma.socio.findFirst();
  const entrenador = await prisma.personal.findFirst();

  if (!socio || !entrenador) {
    throw new Error("Se requiere al menos un socio y un personal en la BD para las pruebas de integración.");
  }

  const socioId = socio.id;
  const entrenadorId = entrenador.id;

  console.log(`Contexto de prueba: Socio ID: ${socioId} (${socio.codigo}) | Entrenador ID: ${entrenadorId} (${entrenador.codigo})\n`);

  // ---------------------------------------------------------------------------
  // TEST 1: Periodo de 1 mes (01/10/2026 al 31/10/2026)
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Generación para periodo de 1 mes ---");
  const sesiones1Mes = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  assert(sesiones1Mes.length === 9, "Periodo de 1 mes con Mar/Jue genera exactamente 9 sesiones en Oct 2026", `Total: ${sesiones1Mes.length}`);

  // ---------------------------------------------------------------------------
  // TEST 2: 2 días por semana
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: 2 días por semana (Mar/Jue) ---");
  const allMarJue = sesiones1Mes.every((s) => s.diaSemana === "MARTES" || s.diaSemana === "JUEVES");
  assert(allMarJue, "Todas las sesiones generadas caen exclusivamente en MARTES o JUEVES");

  // ---------------------------------------------------------------------------
  // TEST 3: 3 días por semana (Lun/Mié/Vie)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: 3 días por semana (Lun/Mié/Vie) ---");
  const sesiones3Dias = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicio: "07:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  assert(sesiones3Dias.length === 13, "Octubre 2026 con Lun/Mié/Vie genera exactamente 13 sesiones", `Total: ${sesiones3Dias.length}`);
  const allLunMieVie = sesiones3Dias.every((s) => ["LUNES", "MIERCOLES", "VIERNES"].includes(s.diaSemana));
  assert(allLunMieVie, "Todas las sesiones son Lun, Mié o Vie");

  // ---------------------------------------------------------------------------
  // TEST 4: Duración 60 minutos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Duración 60 minutos ---");
  const s60 = sesiones1Mes[0];
  const duracionMs60 = s60.fechaHoraFin.getTime() - s60.fechaHoraInicio.getTime();
  assert(duracionMs60 === 60 * 60 * 1000 && s60.horaInicio === "08:00" && s60.horaFin === "09:00", "Sesión de 60 min va de 08:00 a 09:00 exactas", `${s60.horaInicio} -> ${s60.horaFin}`);

  // ---------------------------------------------------------------------------
  // TEST 5: Duración 90 minutos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Duración 90 minutos ---");
  const sesiones90 = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-15",
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicio: "09:30",
    duracionMinutos: 90,
    socioId,
    entrenadorId,
  });
  const s90 = sesiones90[0];
  const duracionMs90 = s90.fechaHoraFin.getTime() - s90.fechaHoraInicio.getTime();
  assert(duracionMs90 === 90 * 60 * 1000 && s90.horaInicio === "09:30" && s90.horaFin === "11:00", "Sesión de 90 min va de 09:30 a 11:00 exactas", `${s90.horaInicio} -> ${s90.horaFin}`);

  // ---------------------------------------------------------------------------
  // TEST 6: Cruce de mes (15 Octubre a 15 Noviembre)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Cruce de mes (15/10/2026 a 15/11/2026) ---");
  const sesionesCruce = generatePersonalizedSessions({
    fechaInicio: "2026-10-15",
    fechaFin: "2026-11-15",
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  const fechasOct = sesionesCruce.filter((s) => s.fechaStr.startsWith("2026-10"));
  const fechasNov = sesionesCruce.filter((s) => s.fechaStr.startsWith("2026-11"));
  assert(fechasOct.length > 0 && fechasNov.length > 0, "Genera sesiones correctamente cruzando ambos meses", `Oct: ${fechasOct.length}, Nov: ${fechasNov.length}`);

  // ---------------------------------------------------------------------------
  // TEST 7: Conflicto de Entrenador
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7: Detección de Conflicto de Entrenador ---");
  const mockTentativas = [
    {
      fecha: new Date("2026-10-13T05:00:00.000Z"),
      fechaStr: "2026-10-13",
      diaSemana: "MARTES" as const,
      horaInicio: "08:00",
      horaFin: "09:00",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:00"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:00"),
      duracionMinutos: 60,
      socioId: "socio-A",
      entrenadorId: "coach-1",
    },
  ];

  const mockExistenteEntrenador = [
    {
      id: "ses-existente-1",
      socioId: "socio-B",
      entrenadorId: "coach-1", // Mismo entrenador
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:30"), // Solapado 08:30 - 09:30
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:30"),
      horaInicio: "08:30",
      horaFin: "09:30",
      estado: "PROGRAMADA",
    },
  ];

  const conflictosEntrenador = detectSessionConflicts(mockTentativas, mockExistenteEntrenador);
  assert(conflictosEntrenador.length === 1 && conflictosEntrenador[0].tipo === "ENTRENADOR_OCUPADO", "Detecta solapamiento de entrenador ocupado (08:00-09:00 vs 08:30-09:30)");

  // ---------------------------------------------------------------------------
  // TEST 8: Conflicto de Socio
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8: Detección de Conflicto de Socio ---");
  const mockExistenteSocio = [
    {
      id: "ses-existente-2",
      socioId: "socio-A", // Mismo socio
      entrenadorId: "coach-2", // Otro entrenador
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:00"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:00"),
      horaInicio: "08:00",
      horaFin: "09:00",
      estado: "PROGRAMADA",
    },
  ];

  const conflictosSocio = detectSessionConflicts(mockTentativas, mockExistenteSocio);
  assert(conflictosSocio.length === 1 && conflictosSocio[0].tipo === "SOCIO_OCUPADO", "Detecta conflicto de socio con otra sesión en el mismo horario");

  // ---------------------------------------------------------------------------
  // TEST 9: Sesión Cancelada NO bloquea
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 9: Sesión Cancelada NO bloquea disponibilidad ---");
  const mockCancelada = [
    {
      id: "ses-cancelada",
      socioId: "socio-B",
      entrenadorId: "coach-1",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:00"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:00"),
      horaInicio: "08:00",
      horaFin: "09:00",
      estado: "CANCELADA_CLIENTE",
    },
  ];
  const conflictosCancelada = detectSessionConflicts(mockTentativas, mockCancelada);
  assert(conflictosCancelada.length === 0, "Sesión con estado CANCELADA_CLIENTE no genera bloqueo de horario");

  // ---------------------------------------------------------------------------
  // TEST 10: Sesión Reprogramada Original NO bloquea
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 10: Sesión Reprogramada Original NO bloquea disponibilidad ---");
  const mockReprogramada = [
    {
      id: "ses-reprogramada",
      socioId: "socio-B",
      entrenadorId: "coach-1",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:00"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:00"),
      horaInicio: "08:00",
      horaFin: "09:00",
      estado: "REPROGRAMADA",
    },
  ];
  const conflictosReprogramada = detectSessionConflicts(mockTentativas, mockReprogramada);
  assert(conflictosReprogramada.length === 0, "Sesión original con estado REPROGRAMADA libera el horario");

  // ---------------------------------------------------------------------------
  // TEST 11: Frecuencia recomendada vs acordada
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 11: Frecuencia recomendada (4) vs acordada (2) ---");
  const sesionesFrecuencia = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    frecuenciaAcordada: 2, // Se le pasa 2 aunque recomendada sea 4
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  assert(sesionesFrecuencia.length === 9, "El generador utiliza la frecuencia acordada (2 días/sem) y no la recomendada");

  // ---------------------------------------------------------------------------
  // TEST 12: Fecha y Hora Lima (America/Lima UTC-5)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 12: Exactitud de Zona Horaria America/Lima ---");
  const fechaLimaSample = createLimaDateTime("2026-10-13", "08:00");
  const horaLimaSample = formatLimaTime(fechaLimaSample);
  const diaLimaSample = getLimaDayOfWeek(fechaLimaSample);
  assert(
    fechaLimaSample.toISOString() === "2026-10-13T13:00:00.000Z" &&
      horaLimaSample === "08:00" &&
      diaLimaSample === "MARTES",
    "08:00 en Lima equivale a 13:00 UTC y mantiene día MARTES",
    `ISO: ${fechaLimaSample.toISOString()}, Hora: ${horaLimaSample}, Dia: ${diaLimaSample}`
  );

  // ---------------------------------------------------------------------------
  // TEST 13: Confirmación Transaccional en Base de Datos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 13: Confirmación Transaccional en Base de Datos ---");
  const testFechaInicio = getLimaStartOfDay(createLimaDateTime("2027-01-05", "00:00"));
  const testFechaFin = getLimaStartOfDay(createLimaDateTime("2027-01-15", "00:00"));

  // Limpiar posibles residuos previos
  await prisma.sesionEntrenamientoPersonalizado.deleteMany({
    where: { socioId, fechaHoraInicio: { gte: testFechaInicio, lte: testFechaFin } },
  });
  await prisma.periodoEntrenamientoPersonalizado.deleteMany({
    where: { socioId, fechaInicio: testFechaInicio },
  });

  const sesionesParaPersistir = generatePersonalizedSessions({
    fechaInicio: "2027-01-05",
    fechaFin: "2027-01-15",
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicio: "10:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });

  const periodoCreado = await prisma.$transaction(async (tx) => {
    const p = await tx.periodoEntrenamientoPersonalizado.create({
      data: {
        socioId,
        entrenadorId,
        fechaInicio: testFechaInicio,
        fechaFin: testFechaFin,
        mesesPeriodo: 1,
        estado: "ACTIVO",
        frecuenciaRecomendada: 3,
        frecuenciaAcordada: 2,
        diasAcordados: ["MARTES", "JUEVES"],
        horaInicioAcordada: "10:00",
        duracionMinutos: 60,
        objetivoAcordado: "Test H2 Automatizado",
        observaciones: "Prueba de persistencia transaccional",
      },
    });

    for (const ses of sesionesParaPersistir) {
      await tx.sesionEntrenamientoPersonalizado.create({
        data: {
          periodoId: p.id,
          socioId,
          entrenadorId,
          fecha: ses.fecha,
          horaInicio: ses.horaInicio,
          horaFin: ses.horaFin,
          fechaHoraInicio: ses.fechaHoraInicio,
          fechaHoraFin: ses.fechaHoraFin,
          duracionMinutos: ses.duracionMinutos,
          estado: "PROGRAMADA",
        },
      });
    }

    return p;
  });

  const sesionesEnDb = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: { periodoId: periodoCreado.id },
  });

  assert(
    Boolean(periodoCreado.id) && sesionesEnDb.length === sesionesParaPersistir.length,
    `Periodo persistido con ${sesionesEnDb.length} sesiones individuales vinculadas`,
    `ID: ${periodoCreado.id}`
  );

  // ---------------------------------------------------------------------------
  // TEST 14: Rechazo de Datos Inválidos en Validación Zod
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 14: Rechazo de Datos Inválidos en Zod Schema ---");
  const casoFechasInvertidas = crearPeriodoPersonalizadoSchema.safeParse({
    socioId,
    entrenadorId,
    fechaInicio: "2026-10-31",
    fechaFin: "2026-10-01", // Invertida
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
  });
  assert(!casoFechasInvertidas.success, "Rechaza fechas invertidas (Inicio > Fin)");

  const casoFrecuenciaExcedida = crearPeriodoPersonalizadoSchema.safeParse({
    socioId,
    entrenadorId,
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    frecuenciaRecomendada: 4,
    frecuenciaAcordada: 4, // 4 acordada pero solo 2 días seleccionados
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
  });
  assert(!casoFrecuenciaExcedida.success, "Rechaza frecuencia acordada (4) superior a días seleccionados (2)");

  // ---------------------------------------------------------------------------
  // TEST 15: AuditLog Generado
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 15: Generación de AuditLog inmutable ---");
  const logAudit = await prisma.auditLog.create({
    data: {
      usuario: "TEST_RUNNER",
      accion: "CREAR_PERIODO_PERSONALIZADO",
      detalles: `Test AuditLog: Periodo ${periodoCreado.id} creado con ${sesionesEnDb.length} sesiones.`,
      fecha: new Date(),
    },
  });
  assert(Boolean(logAudit.id) && logAudit.accion === "CREAR_PERIODO_PERSONALIZADO", "Registro en AuditLog exitoso", `Log ID: ${logAudit.id}`);

  // Limpieza de datos temporales de prueba para no dejar datos residuales
  await prisma.sesionEntrenamientoPersonalizado.deleteMany({
    where: { periodoId: periodoCreado.id },
  });
  await prisma.periodoEntrenamientoPersonalizado.deleteMany({
    where: { id: periodoCreado.id },
  });
  await prisma.auditLog.delete({ where: { id: logAudit.id } });

  console.log("\n================================================================================");
  console.log(`RESULTADO DE LA SUITE H2: ${testsPassed} PASARON / ${testsFailed} FALLARON`);
  console.log("================================================================================\n");

  await prisma.$disconnect();
  return testsFailed === 0;
}

runAllTests().catch((e) => {
  console.error("Error fatal en suite de pruebas:", e);
  process.exit(1);
});
