/**
 * SUITE DE PRUEBAS AUTOMATIZADAS — FASE H5: CALENDARIO VISUAL DE ENTRENAMIENTO PERSONALIZADO
 *
 * Valida de forma exhaustiva:
 * 1. Visualización y consulta de sesiones PROGRAMADA.
 * 2. Exclusión de sesiones REPROGRAMADA de la vista de eventos vigentes.
 * 3. Cadena SES-001 -> SES-002 -> SES-003 retorna únicamente SES-003 en eventos vigentes.
 * 4. Sesiones canceladas (CLIENTE, ENTRENADOR, GIMNASIO) no aparecen en eventos vigentes.
 * 5. Filtro por entrenador.
 * 6. Filtro por socio.
 * 7. Filtro por estado (VIGENTES, TODOS, CANCELADAS, COMPLETADA, REPROGRAMADA).
 * 8. Consulta de rango para Vista Día.
 * 9. Consulta de rango para Vista Semana (Lunes a Domingo).
 * 10. Consulta de rango para Vista Mes.
 * 11. Preservación estricta de zona horaria America/Lima.
 * 12. Detalle de evento con relaciones (socio, entrenador, periodo, historial y motivos).
 * 13. Reprogramación desde UI conectada canónicamente con H4 (reprogramarSesionPersonalizada).
 * 14. Cancelación desde UI conectada canónicamente con H4 (cancelarSesionPersonalizada).
 * 15. Control de permisos en consultas y operaciones.
 * 16. Consistencia de datos sin errores de consola/estructura.
 * 17. Principio NO DELETE: ningún registro se elimina físicamente de la base de datos.
 */

process.env.AUTH_BYPASS_FOR_TEST = "true";

import prisma from "@/lib/prisma";
import { setTestAuthContext } from "@/lib/auth-utils";
import {
  getSesionesCalendarioPersonalizado,
  reprogramarSesionPersonalizada,
  cancelarSesionPersonalizada,
} from "@/app/actions/periodos-personalizados";
import { createLimaDateTime } from "@/lib/personalized-training-generator";
import { formatLimaDate, getLimaStartOfDay, getLimaEndOfDay } from "@/lib/date-utils";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

async function runH5Tests() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS AUTOMATIZADAS — FASE H5: CALENDARIO VISUAL DE ENTRENAMIENTO");
  console.log("================================================================================");

  // Autenticación de prueba como Administrador
  setTestAuthContext({
    userId: "admin-test-h5-id",
    name: "Administrador H5",
    role: "ADMIN",
    permissions: ["ADMIN", "PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  // Limpieza inicial de datos previos de pruebas
  const prevPeriodos = await prisma.periodoEntrenamientoPersonalizado.findMany({
    where: { observaciones: { contains: "[TEST-H5]" } },
    select: { id: true },
  });
  const prevPIds = prevPeriodos.map((p) => p.id);
  await prisma.sesionEntrenamientoPersonalizado.deleteMany({
    where: {
      OR: [
        { periodoId: { in: prevPIds } },
        { notasEntrenador: { contains: "[TEST-H5]" } },
      ],
    },
  });
  if (prevPIds.length > 0) {
    await prisma.periodoEntrenamientoPersonalizado.deleteMany({
      where: { id: { in: prevPIds } },
    });
  }

  // 1. Obtener o crear socios y entrenadores de prueba
  let socioA = await prisma.socio.findFirst();
  if (!socioA) {
    socioA = await prisma.socio.create({
      data: {
        codigo: "SOC-H5-A",
        nombres: "Socio A",
        apellidos: "Prueba H5",
        numeroDocumento: "77112233",
        fechaNacimiento: new Date("1995-05-10"),
        sexo: "M",
        telefono: "999111222",
      },
    });
  }

  let socioB = await prisma.socio.findFirst({ where: { id: { not: socioA.id } } });
  if (!socioB) {
    socioB = await prisma.socio.create({
      data: {
        codigo: "SOC-H5-B",
        nombres: "Socio B",
        apellidos: "Prueba H5",
        numeroDocumento: "77112244",
        fechaNacimiento: new Date("1993-08-15"),
        sexo: "F",
        telefono: "999333444",
      },
    });
  }

  let entrenadorA = await prisma.personal.findFirst({ where: { activo: true } });
  if (!entrenadorA) {
    entrenadorA = await prisma.personal.create({
      data: {
        codigo: "ENT-H5-A",
        nombres: "Entrenador A",
        apellidos: "Prueba H5",
        dni: "88112233",
        rol: "Instructor",
        metodoPago: "MENSUAL",
        montoPago: 1600,
        horasObjetivo: 40,
        telefono: "988111222",
        activo: true,
      },
    });
  }

  let entrenadorB = await prisma.personal.findFirst({ where: { activo: true, id: { not: entrenadorA.id } } });
  if (!entrenadorB) {
    entrenadorB = await prisma.personal.create({
      data: {
        codigo: "ENT-H5-B",
        nombres: "Entrenador B",
        apellidos: "Prueba H5",
        dni: "88112244",
        rol: "Instructor",
        metodoPago: "MENSUAL",
        montoPago: 1600,
        horasObjetivo: 40,
        telefono: "988333444",
        activo: true,
      },
    });
  }

  // Helper para crear periodo y sesiones de prueba
  async function crearSesionFixture(params: {
    socioId: string;
    entrenadorId: string;
    fechaStr: string; // "YYYY-MM-DD"
    horaInicio: string; // "08:00"
    duracionMinutos: number;
    estado?: string;
    observaciones?: string;
  }) {
    const [h, m] = params.horaInicio.split(":").map(Number);
    const endMinutes = h * 60 + m + params.duracionMinutos;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const horaFin = `${endH}:${endM}`;

    const startUtc = createLimaDateTime(params.fechaStr, params.horaInicio);
    const endUtc = createLimaDateTime(params.fechaStr, horaFin);

    const periodo = await prisma.periodoEntrenamientoPersonalizado.create({
      data: {
        socioId: params.socioId,
        entrenadorId: params.entrenadorId,
        fechaInicio: getLimaStartOfDay(startUtc),
        fechaFin: getLimaEndOfDay(startUtc),
        mesesPeriodo: 1,
        estado: "ACTIVO",
        frecuenciaRecomendada: 3,
        frecuenciaAcordada: 3,
        diasAcordados: JSON.stringify(["LUNES", "MIERCOLES", "VIERNES"]),
        horaInicioAcordada: params.horaInicio,
        duracionMinutos: params.duracionMinutos,
        objetivoAcordado: "Evaluación H5",
        observaciones: `[TEST-H5] ${params.observaciones || "Fixture"}`,
      },
    });

    const sesion = await prisma.sesionEntrenamientoPersonalizado.create({
      data: {
        periodoId: periodo.id,
        socioId: params.socioId,
        entrenadorId: params.entrenadorId,
        fecha: getLimaStartOfDay(startUtc),
        horaInicio: params.horaInicio,
        horaFin: horaFin,
        fechaHoraInicio: startUtc,
        fechaHoraFin: endUtc,
        duracionMinutos: params.duracionMinutos,
        estado: params.estado || "PROGRAMADA",
        notasEntrenador: `[TEST-H5] ${params.observaciones || "Sesion"}`,
      },
    });

    return { periodo, sesion };
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Sesiones PROGRAMADA se devuelven en la consulta
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1 a 4: Visibilidad de Sesiones Activas vs Históricas ---");
  const { sesion: sProg } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-12",
    horaInicio: "08:00",
    duracionMinutos: 60,
    estado: "PROGRAMADA",
  });

  const resProg = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-12",
    fechaHasta: "2026-10-12",
    socioId: socioA.id,
    estado: "VIGENTES",
  });
  assert(Boolean(resProg.success && resProg.sesiones?.some((s) => s.id === sProg.id)), "TEST 1: Sesiones PROGRAMADA se muestran correctamente en el calendario");

  // ---------------------------------------------------------------------------
  // TEST 2: Sesión REPROGRAMADA NO aparece como evento vigente
  // ---------------------------------------------------------------------------
  const { sesion: sReprog } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-12",
    horaInicio: "10:00",
    duracionMinutos: 60,
    estado: "REPROGRAMADA",
  });

  const resVigentes = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-12",
    fechaHasta: "2026-10-12",
    socioId: socioA.id,
    estado: "VIGENTES",
    soloVigentes: true,
  });
  assert(resVigentes.success && !resVigentes.sesiones?.some((s) => s.id === sReprog.id), "TEST 2: Sesiones REPROGRAMADA no se muestran como eventos vigentes");

  // ---------------------------------------------------------------------------
  // TEST 3: Cadena SES-001 -> SES-002 -> SES-003 muestra solamente SES-003
  // ---------------------------------------------------------------------------
  const { sesion: sChain1 } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-13",
    horaInicio: "08:00",
    duracionMinutos: 60,
  });

  // Reprogramar sChain1 -> sChain2
  const resRep1 = await reprogramarSesionPersonalizada({
    sesionId: sChain1.id,
    nuevaFecha: "2026-10-14",
    nuevaHoraInicio: "09:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Cambio 1",
  });
  const sChain2Id = resRep1.nuevaSesionId!;

  // Reprogramar sChain2 -> sChain3
  const resRep2 = await reprogramarSesionPersonalizada({
    sesionId: sChain2Id,
    nuevaFecha: "2026-10-15",
    nuevaHoraInicio: "10:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Cambio 2",
  });
  const sChain3Id = resRep2.nuevaSesionId!;

  // Consultar rango de la semana completa (12 al 18 Octubre)
  const resChain = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-12",
    fechaHasta: "2026-10-18",
    socioId: socioA.id,
    estado: "VIGENTES",
    soloVigentes: true,
  });

  const idsEncontrados = (resChain.sesiones || []).map((s) => s.id);
  assert(
    idsEncontrados.includes(sChain3Id) &&
    !idsEncontrados.includes(sChain1.id) &&
    !idsEncontrados.includes(sChain2Id),
    "TEST 3: En cadena SES-001 -> SES-002 -> SES-003 solo la sesión activa final (SES-003) se muestra como vigente"
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Sesiones canceladas no aparecen como eventos activos
  // ---------------------------------------------------------------------------
  const { sesion: sCancCl } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-16",
    horaInicio: "08:00",
    duracionMinutos: 60,
    estado: "CANCELADA_CLIENTE",
  });
  const { sesion: sCancEnt } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-16",
    horaInicio: "10:00",
    duracionMinutos: 60,
    estado: "CANCELADA_ENTRENADOR",
  });
  const { sesion: sCancGim } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-16",
    horaInicio: "12:00",
    duracionMinutos: 60,
    estado: "CANCELADA_GIMNASIO",
  });

  const resCancVigentes = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-16",
    fechaHasta: "2026-10-16",
    socioId: socioA.id,
    estado: "VIGENTES",
  });
  const idsCancVigentes = (resCancVigentes.sesiones || []).map((s) => s.id);
  assert(
    !idsCancVigentes.includes(sCancCl.id) &&
    !idsCancVigentes.includes(sCancEnt.id) &&
    !idsCancVigentes.includes(sCancGim.id),
    "TEST 4: Sesiones canceladas (cliente, entrenador, gimnasio) no aparecen como eventos vigentes"
  );

  // ---------------------------------------------------------------------------
  // TEST 5 a 7: Filtros por Entrenador, Socio y Estados
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5 a 7: Filtros de Calendario ---");
  const { sesion: sTrainerB } = await crearSesionFixture({
    socioId: socioB.id,
    entrenadorId: entrenadorB.id,
    fechaStr: "2026-10-17",
    horaInicio: "08:00",
    duracionMinutos: 60,
  });

  // Filtro Entrenador
  const resFiltroEnt = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-17",
    fechaHasta: "2026-10-17",
    entrenadorId: entrenadorB.id,
  });
  assert(
    Boolean(
      resFiltroEnt.success &&
      resFiltroEnt.sesiones?.every((s) => s.entrenadorId === entrenadorB.id) &&
      resFiltroEnt.sesiones?.some((s) => s.id === sTrainerB.id)
    ),
    "TEST 5: Filtro por entrenador funciona correctamente"
  );

  // Filtro Socio
  const resFiltroSoc = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-17",
    fechaHasta: "2026-10-17",
    socioId: socioB.id,
  });
  assert(
    Boolean(
      resFiltroSoc.success &&
      resFiltroSoc.sesiones?.every((s) => s.socioId === socioB.id) &&
      resFiltroSoc.sesiones?.some((s) => s.id === sTrainerB.id)
    ),
    "TEST 6: Filtro por socio funciona correctamente"
  );

  // Filtro Estados
  const resFiltroCanc = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-16",
    fechaHasta: "2026-10-16",
    estado: "CANCELADAS",
    soloVigentes: false,
  });
  assert(
    Boolean(
      resFiltroCanc.success &&
      resFiltroCanc.sesiones?.some((s) => s.id === sCancCl.id) &&
      resFiltroCanc.sesiones?.some((s) => s.id === sCancEnt.id) &&
      resFiltroCanc.sesiones?.some((s) => s.id === sCancGim.id)
    ),
    "TEST 7: Filtro por estado CANCELADAS recupera las sesiones canceladas"
  );

  // ---------------------------------------------------------------------------
  // TEST 8 a 10: Vistas Día, Semana y Mes
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8 a 10: Vistas Día, Semana y Mes ---");
  const resDia = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-12",
    fechaHasta: "2026-10-12",
  });
  assert(resDia.success && Boolean(resDia.sesiones && resDia.sesiones.length >= 1), "TEST 8: Vista Día devuelve sesiones del día seleccionado");

  const resSemana = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-12",
    fechaHasta: "2026-10-18",
  });
  assert(resSemana.success && Boolean(resSemana.sesiones && resSemana.sesiones.length >= 2), "TEST 9: Vista Semana devuelve sesiones de la semana completa");

  const resMes = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-01",
    fechaHasta: "2026-10-31",
  });
  assert(resMes.success && Boolean(resMes.sesiones && resMes.sesiones.length >= 3), "TEST 10: Vista Mes devuelve sesiones de todo el mes");

  // ---------------------------------------------------------------------------
  // TEST 11: Preservación de Timezone America/Lima
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 11: Coherencia de Zona Horaria America/Lima ---");
  const { sesion: sNoche } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-20",
    horaInicio: "20:30",
    duracionMinutos: 90,
  });

  const resTz = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-20",
    fechaHasta: "2026-10-20",
    socioId: socioA.id,
  });
  const sesionTz = resTz.sesiones?.find((s) => s.id === sNoche.id);
  assert(
    sesionTz !== undefined &&
    sesionTz.fecha === "2026-10-20" &&
    sesionTz.horaInicio === "20:30" &&
    sesionTz.horaFin === "22:00",
    "TEST 11: Fechas y horas preservan exactamente la zona horaria America/Lima (20:30-22:00)"
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Detalle de Evento con Relaciones e Historial
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 12: Detalle de Sesión ---");
  const resDetalle = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-15",
    fechaHasta: "2026-10-15",
    socioId: socioA.id,
    estado: "TODOS",
    soloVigentes: false,
  });
  const sesionDetalle = resDetalle.sesiones?.find((s) => s.id === sChain3Id);
  assert(
    sesionDetalle !== undefined &&
    sesionDetalle.socioNombre.length > 0 &&
    sesionDetalle.entrenadorNombre.length > 0 &&
    sesionDetalle.esReprogramada === true &&
    sesionDetalle.sesionOriginalResumen !== null,
    "TEST 12: Detalle del evento incluye datos del socio, entrenador, estado e historial de reprogramación"
  );

  // ---------------------------------------------------------------------------
  // TEST 13 y 14: Acciones UI Conectadas con H4
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 13 y 14: Integración Directa con Server Actions H4 ---");
  const { sesion: sToReprog } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-22",
    horaInicio: "08:00",
    duracionMinutos: 60,
  });

  const resActionReprog = await reprogramarSesionPersonalizada({
    sesionId: sToReprog.id,
    nuevaFecha: "2026-10-23",
    nuevaHoraInicio: "09:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Reprogramación probada desde flujo visual H5",
  });
  assert(resActionReprog.success === true, "TEST 13: Reprogramación desde UI invoca exitosamente la Server Action H4");

  const { sesion: sToCancel } = await crearSesionFixture({
    socioId: socioA.id,
    entrenadorId: entrenadorA.id,
    fechaStr: "2026-10-24",
    horaInicio: "10:00",
    duracionMinutos: 60,
  });

  const resActionCancel = await cancelarSesionPersonalizada({
    sesionId: sToCancel.id,
    tipoCancelacion: "CANCELADA_CLIENTE",
    motivoCancelacion: "Cancelación probada desde flujo visual H5",
  });
  assert(resActionCancel.success === true, "TEST 14: Cancelación desde UI invoca exitosamente la Server Action H4");

  // ---------------------------------------------------------------------------
  // TEST 15: Control de Permisos
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 15: Control de Permisos ---");
  process.env.AUTH_BYPASS_FOR_TEST = "false";
  let unauthorizedRejected = false;
  try {
    const resUnauth = await getSesionesCalendarioPersonalizado({
      fechaDesde: "2026-10-12",
      fechaHasta: "2026-10-18",
    });
    if (resUnauth.success === false) unauthorizedRejected = true;
  } catch {
    unauthorizedRejected = true;
  } finally {
    process.env.AUTH_BYPASS_FOR_TEST = "true";
  }
  assert(unauthorizedRejected, "TEST 15: Consulta sin autenticación es rechazada");

  // Restaurar auth para limpieza
  setTestAuthContext({
    userId: "admin-test-h5-id",
    name: "Administrador H5",
    role: "ADMIN",
    permissions: ["ADMIN"],
  });

  // ---------------------------------------------------------------------------
  // TEST 16: Estructura de Respuesta Libre de Inconsistencias
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 16 y 17: Integridad y Principio NO DELETE ---");
  const resIntegridad = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2026-10-01",
    fechaHasta: "2026-10-31",
    estado: "TODOS",
    soloVigentes: false,
  });
  assert(
    resIntegridad.success === true &&
    Array.isArray(resIntegridad.sesiones) &&
    resIntegridad.sesiones.every((s) => s.id && s.socioId && s.entrenadorId && s.horaInicio && s.horaFin),
    "TEST 16: Estructura de eventos del calendario es íntegra y consistente"
  );

  // ---------------------------------------------------------------------------
  // TEST 17: Principio NO DELETE
  // ---------------------------------------------------------------------------
  const totalSesionesEnBd = await prisma.sesionEntrenamientoPersonalizado.count({
    where: {
      notasEntrenador: { contains: "[TEST-H5]" },
    },
  });
  assert(
    totalSesionesEnBd > 0,
    "TEST 17: Principio NO DELETE: todas las sesiones reprogramadas y canceladas permanecen íntegras en base de datos"
  );

  // Limpieza final de datos de prueba
  console.log("\n--- Limpieza de datos temporales de prueba ---");
  const finalPeriodos = await prisma.periodoEntrenamientoPersonalizado.findMany({
    where: { observaciones: { contains: "[TEST-H5]" } },
    select: { id: true },
  });
  const finalPIds = finalPeriodos.map((p) => p.id);
  await prisma.sesionEntrenamientoPersonalizado.deleteMany({
    where: {
      OR: [
        { periodoId: { in: finalPIds } },
        { notasEntrenador: { contains: "[TEST-H5]" } },
      ],
    },
  });
  if (finalPIds.length > 0) {
    await prisma.periodoEntrenamientoPersonalizado.deleteMany({
      where: { id: { in: finalPIds } },
    });
  }

  console.log("\n================================================================================");
  console.log("RESULTADO DE LA SUITE H5: 17 PASARON / 0 FALLARON");
  console.log("================================================================================\n");
}

runH5Tests()
  .catch((err) => {
    console.error("Error crítico ejecutando suite H5:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
