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

import {
  generatePersonalizedSessions,
  detectSessionConflicts,
  createLimaDateTime,
  formatLimaTime,
  getLimaDayOfWeek,
  isSessionBlockingAvailability,
  ESTADOS_BLOQUEANTES,
  ESTADOS_LIBERADOS,
  SesionTentativa,
} from "@/lib/personalized-training-generator";
import { formatLimaDate, getLimaStartOfDay, getLimaEndOfDay } from "@/lib/date-utils";
import { crearPeriodoPersonalizadoSchema } from "@/lib/validations";

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

async function runH3AuditSuite() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS AUTOMATIZADAS — FASE H3: AUDITORÍA Y REFUERZO DE CONFLICTOS");
  console.log("================================================================================\n");

  const socio = await prisma.socio.findFirst();
  const entrenador = await prisma.personal.findFirst();

  if (!socio || !entrenador) {
    throw new Error("Se requiere al menos un socio y un personal en la BD para las pruebas.");
  }

  const socioId = socio.id;
  const entrenadorId = entrenador.id;

  // Base tentativa para tests: 13 Octubre 2026 08:00 a 09:00
  const t0800_0900: SesionTentativa = {
    fecha: new Date("2026-10-13T05:00:00.000Z"),
    fechaStr: "2026-10-13",
    diaSemana: "MARTES",
    horaInicio: "08:00",
    horaFin: "09:00",
    fechaHoraInicio: createLimaDateTime("2026-10-13", "08:00"),
    fechaHoraFin: createLimaDateTime("2026-10-13", "09:00"),
    duracionMinutos: 60,
    socioId: "socio-1",
    entrenadorId: "coach-1",
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Borde exacto 09:00 -> NO conflicto
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Borde exacto (08:00-09:00 vs 09:00-10:00) ---");
  const exist0900 = [
    {
      id: "ses-0900",
      socioId: "socio-2",
      entrenadorId: "coach-1",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "09:00"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "10:00"),
      horaInicio: "09:00",
      horaFin: "10:00",
      estado: "PROGRAMADA",
    },
  ];
  const conf1 = detectSessionConflicts([t0800_0900], exist0900);
  assert(conf1.length === 0, "Borde exacto contiguo (08:00-09:00 y 09:00-10:00) NO genera conflicto");

  // ---------------------------------------------------------------------------
  // TEST 2: Solapamiento por 1 minuto (08:00-09:00 vs 08:59-09:30)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Solapamiento mínimo de 1 minuto (08:00-09:00 vs 08:59-09:30) ---");
  const exist0859 = [
    {
      id: "ses-0859",
      socioId: "socio-2",
      entrenadorId: "coach-1",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:59"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:30"),
      horaInicio: "08:59",
      horaFin: "09:30",
      estado: "PROGRAMADA",
    },
  ];
  const conf2 = detectSessionConflicts([t0800_0900], exist0859);
  assert(conf2.length === 1 && conf2[0].tipo === "ENTRENADOR_OCUPADO", "Solapamiento de 1 minuto (08:59) SÍ genera conflicto");

  // ---------------------------------------------------------------------------
  // TEST 3: Mismo entrenador con 2 socios
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Mismo entrenador con 2 socios en solapamiento ---");
  const existEntrenador = [
    {
      id: "ses-ent-ocupado",
      socioId: "socio-2",
      entrenadorId: "coach-1",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:30"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:30"),
      horaInicio: "08:30",
      horaFin: "09:30",
      estado: "PROGRAMADA",
    },
  ];
  const conf3 = detectSessionConflicts([t0800_0900], existEntrenador);
  assert(conf3.length === 1 && conf3[0].tipo === "ENTRENADOR_OCUPADO", "Detecta correctamente ENTRENADOR_OCUPADO");

  // ---------------------------------------------------------------------------
  // TEST 4: Mismo socio con 2 entrenadores
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Mismo socio con 2 entrenadores en solapamiento ---");
  const existSocio = [
    {
      id: "ses-soc-ocupado",
      socioId: "socio-1", // Mismo socio
      entrenadorId: "coach-2", // Distinto entrenador
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:30"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:30"),
      horaInicio: "08:30",
      horaFin: "09:30",
      estado: "PROGRAMADA",
    },
  ];
  const conf4 = detectSessionConflicts([t0800_0900], existSocio);
  assert(conf4.length === 1 && conf4[0].tipo === "SOCIO_OCUPADO", "Detecta correctamente SOCIO_OCUPADO");

  // ---------------------------------------------------------------------------
  // TEST 5: Entrenadores diferentes pero mismo socio
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Entrenadores diferentes pero mismo socio ---");
  assert(conf4[0].tipo === "SOCIO_OCUPADO" && conf4[0].descripcion.includes("El socio ya cuenta con otra sesión"), "Impide que un socio agende dos sesiones simultáneas");

  // ---------------------------------------------------------------------------
  // TEST 6: Socios diferentes pero mismo entrenador
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Socios diferentes pero mismo entrenador ---");
  assert(conf3[0].tipo === "ENTRENADOR_OCUPADO" && conf3[0].descripcion.includes("El entrenador ya tiene la sesión"), "Impide que un entrenador atienda a dos socios al mismo tiempo");

  // ---------------------------------------------------------------------------
  // TEST 7: CANCELADA_CLIENTE libera
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7: CANCELADA_CLIENTE libera horario ---");
  const existCancCliente = [
    {
      id: "ses-canc-cli",
      socioId: "socio-2",
      entrenadorId: "coach-1",
      fechaHoraInicio: createLimaDateTime("2026-10-13", "08:00"),
      fechaHoraFin: createLimaDateTime("2026-10-13", "09:00"),
      horaInicio: "08:00",
      horaFin: "09:00",
      estado: "CANCELADA_CLIENTE",
    },
  ];
  assert(detectSessionConflicts([t0800_0900], existCancCliente).length === 0, "CANCELADA_CLIENTE no bloquea horario");

  // ---------------------------------------------------------------------------
  // TEST 8: CANCELADA_ENTRENADOR libera
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8: CANCELADA_ENTRENADOR libera horario ---");
  const existCancCoach = [{ ...existCancCliente[0], estado: "CANCELADA_ENTRENADOR" }];
  assert(detectSessionConflicts([t0800_0900], existCancCoach).length === 0, "CANCELADA_ENTRENADOR no bloquea horario");

  // ---------------------------------------------------------------------------
  // TEST 9: CANCELADA_GIMNASIO libera
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 9: CANCELADA_GIMNASIO libera horario ---");
  const existCancGym = [{ ...existCancCliente[0], estado: "CANCELADA_GIMNASIO" }];
  assert(detectSessionConflicts([t0800_0900], existCancGym).length === 0, "CANCELADA_GIMNASIO no bloquea horario");

  // ---------------------------------------------------------------------------
  // TEST 10: REPROGRAMADA (origen) libera horario
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 10: REPROGRAMADA (origen) libera horario ---");
  const existReprog = [{ ...existCancCliente[0], estado: "REPROGRAMADA" }];
  assert(detectSessionConflicts([t0800_0900], existReprog).length === 0, "Sesión origen REPROGRAMADA no bloquea horario original");

  // ---------------------------------------------------------------------------
  // TEST 11: Nueva sesión reprogramada (PROGRAMADA) bloquea horario
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 11: Nueva sesión reprogramada (PROGRAMADA) bloquea horario ---");
  const existNuevaReprog = [{ ...existCancCliente[0], estado: "PROGRAMADA", id: "ses-nueva-reprog" }];
  assert(detectSessionConflicts([t0800_0900], existNuevaReprog).length === 1, "Nueva sesión reprogramada con estado PROGRAMADA sí bloquea horario");

  // ---------------------------------------------------------------------------
  // TEST 12: COMPLETADA histórica no bloquea futuro
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 12: COMPLETADA no bloquea disponibilidad futura ---");
  const existCompletada = [{ ...existCancCliente[0], estado: "COMPLETADA" }];
  assert(detectSessionConflicts([t0800_0900], existCompletada).length === 0, "Sesión con estado COMPLETADA no bloquea nuevos agendamientos");

  // ---------------------------------------------------------------------------
  // TEST 13: NO_ASISTIO no bloquea futuro
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 13: NO_ASISTIO no bloquea disponibilidad futura ---");
  const existNoAsistio = [{ ...existCancCliente[0], estado: "NO_ASISTIO" }];
  assert(detectSessionConflicts([t0800_0900], existNoAsistio).length === 0, "Sesión con estado NO_ASISTIO no bloquea nuevos agendamientos");

  // ---------------------------------------------------------------------------
  // TEST 14: Conflicto interno entre sesiones tentativas
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 14: Conflicto interno entre sesiones tentativas del mismo lote ---");
  const tDuplicada1: SesionTentativa = { ...t0800_0900 };
  const tDuplicada2: SesionTentativa = {
    ...t0800_0900,
    horaInicio: "08:30",
    horaFin: "09:30",
    fechaHoraInicio: createLimaDateTime("2026-10-13", "08:30"),
    fechaHoraFin: createLimaDateTime("2026-10-13", "09:30"),
  };
  const confInterno = detectSessionConflicts([tDuplicada1, tDuplicada2], []);
  assert(confInterno.length === 1 && confInterno[0].tipo === "CONFLICTO_INTERNO_LOTE", "Detecta colisión interna en el lote de generación tentativa");

  // ---------------------------------------------------------------------------
  // TEST 15: fechaInicio incluida correctamente si coincide con día acordado
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 15: Inclusión de fechaInicio si coincide con día acordado ---");
  // 01/10/2026 es JUEVES
  const genInicio = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    frecuenciaAcordada: 1,
    diasAcordados: ["JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  assert(genInicio[0].fechaStr === "2026-10-01", "La primera sesión es exactamente la fechaInicio (01/10/2026)", `Primera: ${genInicio[0].fechaStr}`);

  // ---------------------------------------------------------------------------
  // TEST 16: fechaFin incluida correctamente si coincide con día acordado
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 16: Inclusión de fechaFin si coincide con día acordado ---");
  // 29/10/2026 y 31/10/2026 (SABADO)
  const genFin = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    frecuenciaAcordada: 1,
    diasAcordados: ["SABADO"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  const ultima = genFin[genFin.length - 1];
  assert(ultima.fechaStr === "2026-10-31", "La última sesión coincide exactamente con fechaFin (31/10/2026)", `Ultima: ${ultima.fechaStr}`);

  // ---------------------------------------------------------------------------
  // TEST 17: Sesión fuera del periodo no es generada
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 17: Sesiones fuera del rango de fechas son excluidas ---");
  const genRangoEstricto = generatePersonalizedSessions({
    fechaInicio: "2026-10-05",
    fechaFin: "2026-10-20",
    frecuenciaAcordada: 1,
    diasAcordados: ["LUNES"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });
  const todasEnRango = genRangoEstricto.every((s) => s.fechaStr >= "2026-10-05" && s.fechaStr <= "2026-10-20");
  assert(todasEnRango && genRangoEstricto.length === 3, "Todas las sesiones (05, 12, 19 Oct) están dentro de [05/10, 20/10]", `Count: ${genRangoEstricto.length}`);

  // ---------------------------------------------------------------------------
  // TEST 18: Duración 45 minutos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 18: Duración 45 minutos ---");
  const s45 = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-07",
    frecuenciaAcordada: 1,
    diasAcordados: ["JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 45,
    socioId,
    entrenadorId,
  })[0];
  assert(s45.horaInicio === "08:00" && s45.horaFin === "08:45", "08:00 + 45 min -> 08:45", `${s45.horaInicio} -> ${s45.horaFin}`);

  // ---------------------------------------------------------------------------
  // TEST 19: Duración 60 minutos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 19: Duración 60 minutos ---");
  const s60 = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-07",
    frecuenciaAcordada: 1,
    diasAcordados: ["JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  })[0];
  assert(s60.horaInicio === "08:00" && s60.horaFin === "09:00", "08:00 + 60 min -> 09:00", `${s60.horaInicio} -> ${s60.horaFin}`);

  // ---------------------------------------------------------------------------
  // TEST 20: Duración 90 minutos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 20: Duración 90 minutos ---");
  const s90 = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-07",
    frecuenciaAcordada: 1,
    diasAcordados: ["JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 90,
    socioId,
    entrenadorId,
  })[0];
  assert(s90.horaInicio === "08:00" && s90.horaFin === "09:30", "08:00 + 90 min -> 09:30", `${s90.horaInicio} -> ${s90.horaFin}`);

  // ---------------------------------------------------------------------------
  // TEST 21: Duración 120 minutos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 21: Duración 120 minutos ---");
  const s120 = generatePersonalizedSessions({
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-07",
    frecuenciaAcordada: 1,
    diasAcordados: ["JUEVES"],
    horaInicio: "08:00",
    duracionMinutos: 120,
    socioId,
    entrenadorId,
  })[0];
  assert(s120.horaInicio === "08:00" && s120.horaFin === "10:00", "08:00 + 120 min -> 10:00", `${s120.horaInicio} -> ${s120.horaFin}`);

  // ---------------------------------------------------------------------------
  // TEST 22: Cruce de medianoche en hora de Lima bloqueado
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 22: Cruce de medianoche en hora de Lima ---");
  let errorMedianoche = "";
  try {
    generatePersonalizedSessions({
      fechaInicio: "2026-10-01",
      fechaFin: "2026-10-07",
      frecuenciaAcordada: 1,
      diasAcordados: ["JUEVES"],
      horaInicio: "23:30",
      duracionMinutos: 60, // Terminaría 00:30 del viernes
      socioId,
      entrenadorId,
    });
  } catch (e: any) {
    errorMedianoche = e.message;
  }
  assert(
    errorMedianoche.includes("cruza la medianoche"),
    "Bloquea explícitamente sesiones que cruzan la medianoche en hora de Lima",
    `Mensaje: ${errorMedianoche}`
  );

  // ---------------------------------------------------------------------------
  // TEST 23: Coherencia de Timezone America/Lima
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 23: Coherencia Timezone America/Lima ---");
  const sampleTime = createLimaDateTime("2026-10-13", "20:30");
  const formattedLima = formatLimaTime(sampleTime);
  const formattedDate = formatLimaDate(sampleTime);
  assert(
    sampleTime.toISOString() === "2026-10-14T01:30:00.000Z" &&
      formattedLima === "20:30" &&
      formattedDate === "2026-10-13",
    "20:30 en Lima (UTC-5) equivale exactamente a 01:30 UTC del día siguiente y se formatea como 20:30 del 13 de Octubre",
    `ISO: ${sampleTime.toISOString()}`
  );

  // ---------------------------------------------------------------------------
  // TEST 24: Concurrencia — Detección de colisión creada entre preview y confirm
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 24: Protección contra Concurrencia ---");
  const testFechaHoraInicio = createLimaDateTime("2027-02-10", "11:00");
  const testFechaHoraFin = createLimaDateTime("2027-02-10", "12:00");

  // Crear una sesión previa en DB para simular reserva concurrente
  const periodoTemp = await prisma.periodoEntrenamientoPersonalizado.create({
    data: {
      socioId,
      entrenadorId,
      fechaInicio: getLimaStartOfDay(testFechaHoraInicio),
      fechaFin: getLimaEndOfDay(testFechaHoraInicio),
      mesesPeriodo: 1,
      frecuenciaRecomendada: 1,
      frecuenciaAcordada: 1,
      diasAcordados: JSON.stringify(["MIERCOLES"]),
      horaInicioAcordada: "11:00",
      duracionMinutos: 60,
      estado: "ACTIVO",
    },
  });

  const sesionConcurrente = await prisma.sesionEntrenamientoPersonalizado.create({
    data: {
      periodoId: periodoTemp.id,
      socioId,
      entrenadorId,
      fecha: getLimaStartOfDay(testFechaHoraInicio),
      horaInicio: "11:00",
      horaFin: "12:00",
      fechaHoraInicio: testFechaHoraInicio,
      fechaHoraFin: testFechaHoraFin,
      duracionMinutos: 60,
      estado: "PROGRAMADA",
    },
  });

  // Intentar confirmar un nuevo periodo que compite por ese mismo horario
  const sesionesCompetidoras = generatePersonalizedSessions({
    fechaInicio: "2027-02-10",
    fechaFin: "2027-02-10",
    frecuenciaAcordada: 1,
    diasAcordados: ["MIERCOLES"],
    horaInicio: "11:00",
    duracionMinutos: 60,
    socioId,
    entrenadorId,
  });

  const sesionesEnDbParaVerificar = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: {
      OR: [{ entrenadorId }, { socioId }],
      estado: { in: [...ESTADOS_BLOQUEANTES] },
      fechaHoraInicio: { lte: testFechaHoraFin },
      fechaHoraFin: { gte: testFechaHoraInicio },
    },
  });

  const conflictosConcurrencia = detectSessionConflicts(sesionesCompetidoras, sesionesEnDbParaVerificar);
  assert(
    conflictosConcurrencia.length > 0,
    "La consulta en DB previa a la confirmación detecta la sesión concurrente recién insertada y aborta",
    `Conflictos encontrados: ${conflictosConcurrencia.length}`
  );

  // Limpieza de datos temporales
  await prisma.sesionEntrenamientoPersonalizado.delete({ where: { id: sesionConcurrente.id } });
  await prisma.periodoEntrenamientoPersonalizado.delete({ where: { id: sesionConcurrente.periodoId } });

  console.log("\n================================================================================");
  console.log(`RESULTADO DE LA SUITE H3: ${testsPassed} PASARON / ${testsFailed} FALLARON`);
  console.log("================================================================================\n");

  await prisma.$disconnect();
  return testsFailed === 0;
}

runH3AuditSuite().catch((e) => {
  console.error("Error fatal en suite de pruebas H3:", e);
  process.exit(1);
});
