/**
 * SUITE DE VALIDACIÓN FINAL — FASE H6: REPROGRAMACIONES H4 Y AJUSTE DE ACUERDO
 *
 * Verificaciones requeridas:
 * 1. No duplicar una sesión ya reprogramada.
 * 2. No romper sesionOriginalId ni reprogramadaEnSesionId.
 * 3. Mantener una única sesión activa visible en el calendario H5.
 * 4. Conservar la trazabilidad completa de la cadena (SES-1 -> SES-2 -> SES-3).
 * 5. Comprobar el comportamiento y estado de sesiones reprogramadas ante el ajuste de acuerdo.
 * 6. Principio NO DELETE estricto (cero eliminaciones físicas).
 */

process.env.AUTH_BYPASS_FOR_TEST = "true";

import prisma from "@/lib/prisma";
import { setTestAuthContext } from "@/lib/auth-utils";
import {
  actualizarAcuerdoPeriodoPersonalizado,
  reprogramarSesionPersonalizada,
  getSesionesCalendarioPersonalizado,
  EventoSesionCalendario,
} from "@/app/actions/periodos-personalizados";
import { getLimaStartOfDay, getLimaEndOfDay } from "@/lib/date-utils";
import { createLimaDateTime } from "@/lib/personalized-training-generator";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detalle: ${detail}`);
    testsFailed++;
  }
}

async function runValidationTests() {
  console.log("================================================================================");
  console.log("VALIDACIÓN FINAL H6: INTERACCIÓN CON REPROGRAMACIONES H4 Y CADENAS H4");
  console.log("================================================================================\n");

  // Autenticación como Administrador
  setTestAuthContext({
    userId: "admin-test-h6-val-id",
    name: "Admin Validador H6",
    role: "ADMIN",
    permissions: ["ADMIN", "PLANES_PERSONALIZADOS_GESTIONAR", "SOCIOS_EDITAR"],
  });

  // Obtener o crear socio
  let socio = await prisma.socio.findFirst();
  if (!socio) {
    socio = await prisma.socio.create({
      data: {
        codigo: "SOC-H6-VAL",
        nombres: "Validador",
        apellidos: "Cadena H4",
        numeroDocumento: "79901234",
        fechaNacimiento: new Date("1993-05-15"),
        sexo: "M",
      },
    });
  }

  // Obtener o crear entrenador
  let entrenador = await prisma.personal.findFirst({ where: { activo: true } });
  if (!entrenador) {
    entrenador = await prisma.personal.create({
      data: {
        codigo: "ENT-H6-VAL",
        nombres: "Entrenador",
        apellidos: "Validador H4",
        dni: "89954321",
        rol: "Instructor",
        metodoPago: "MENSUAL",
        montoPago: 1800,
        horasObjetivo: 40,
        activo: true,
      },
    });
  }

  const fechaInicioStr = "2027-02-01"; // Lunes
  const fechaFinStr = "2027-02-28";    // Domingo (4 semanas completas)
  const fechaInicioDate = getLimaStartOfDay(createLimaDateTime(fechaInicioStr, "00:00"));
  const fechaFinDate = getLimaEndOfDay(createLimaDateTime(fechaFinStr, "23:59"));

  // 1. Crear periodo de prueba en 2027
  const periodoVal = await prisma.periodoEntrenamientoPersonalizado.create({
    data: {
      socioId: socio.id,
      entrenadorId: entrenador.id,
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      mesesPeriodo: 1,
      estado: "ACTIVO",
      frecuenciaRecomendada: 3,
      frecuenciaAcordada: 2,
      diasAcordados: ["LUNES", "MIERCOLES"],
      horaInicioAcordada: "08:00",
      duracionMinutos: 60,
      observaciones: "Periodo de validación H6 + H4 [TEST-VAL-H4]",
    },
  });

  const periodoValId = periodoVal.id;

  // Crear sesiones iniciales: 4 semanas x 2 días = 8 sesiones
  // Lunes: Feb 1, 8, 15, 22
  // Miércoles: Feb 3, 10, 17, 24
  const diasFechas = [
    { fecha: "2027-02-01", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-03", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-08", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-10", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-15", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-17", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-22", horaInicio: "08:00", horaFin: "09:00" },
    { fecha: "2027-02-24", horaInicio: "08:00", horaFin: "09:00" },
  ];

  const sesionesCreadas = [];
  for (const df of diasFechas) {
    const fInicio = createLimaDateTime(df.fecha, df.horaInicio);
    const fFin = createLimaDateTime(df.fecha, df.horaFin);
    const s = await prisma.sesionEntrenamientoPersonalizado.create({
      data: {
        periodoId: periodoValId,
        socioId: socio.id,
        entrenadorId: entrenador.id,
        fecha: getLimaStartOfDay(fInicio),
        horaInicio: df.horaInicio,
        horaFin: df.horaFin,
        fechaHoraInicio: fInicio,
        fechaHoraFin: fFin,
        duracionMinutos: 60,
        estado: "PROGRAMADA",
      },
    });
    sesionesCreadas.push(s);
  }

  console.log(`--- Configuración inicial: Periodo ${periodoValId} creado con ${sesionesCreadas.length} sesiones ---`);

  // ---------------------------------------------------------------------------
  // ESCENARIO 1: Cadena de Reprogramación H4 (SES-1 -> SES-2 -> SES-3)
  // ---------------------------------------------------------------------------
  console.log("\n--- ESCENARIO 1: Generar cadena de reprogramación H4 ---");

  // Reprogramar sesión 0 (Feb 1 08:00) a Feb 2 (Martes 11:00)
  const sesionOriginalId = sesionesCreadas[0].id;
  const reprog1 = await reprogramarSesionPersonalizada({
    sesionId: sesionOriginalId,
    nuevaFecha: "2027-02-02",
    nuevaHoraInicio: "11:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Socio no puede el lunes por la mañana (Paso 1)",
  });

  assert(reprog1.success === true, "Reprogramación 1 exitosa (SES-1 -> SES-2)");
  const sesion2Id = reprog1.nuevaSesionId!;

  // Reprogramar sesión 2 (Feb 2 11:00) a Feb 4 (Jueves 16:00)
  const reprog2 = await reprogramarSesionPersonalizada({
    sesionId: sesion2Id,
    nuevaFecha: "2027-02-04",
    nuevaHoraInicio: "16:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Reajuste adicional solicitado por socio (Paso 2)",
  });

  assert(reprog2.success === true, "Reprogramación 2 exitosa (SES-2 -> SES-3)");
  const sesion3Id = reprog2.nuevaSesionId!;

  // Verificar estado de la cadena H4 antes del ajuste de acuerdo
  const ses1_pre = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sesionOriginalId } });
  const ses2_pre = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sesion2Id } });
  const ses3_pre = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sesion3Id } });

  assert(
    ses1_pre?.estado === "REPROGRAMADA" &&
      ses1_pre?.reprogramadaEnSesionId === sesion2Id &&
      ses2_pre?.estado === "REPROGRAMADA" &&
      ses2_pre?.sesionOriginalId === sesionOriginalId &&
      ses2_pre?.reprogramadaEnSesionId === sesion3Id &&
      ses3_pre?.estado === "PROGRAMADA" &&
      ses3_pre?.esReprogramada === true &&
      ses3_pre?.sesionOriginalId === sesion2Id,
    "Cadena H4 pre-ajuste consistente: SES-1 -> SES-2 -> SES-3"
  );

  // ---------------------------------------------------------------------------
  // ESCENARIO 2: Ejecutar actualizarAcuerdoPeriodoPersonalizado
  // ---------------------------------------------------------------------------
  console.log("\n--- ESCENARIO 2: Ejecución de actualizarAcuerdoPeriodoPersonalizado ---");

  // Se actualiza el acuerdo del periodo a 3 días por semana: MARTES, JUEVES, SABADO de 10:00 a 11:00 (60 min)
  const updateResult = await actualizarAcuerdoPeriodoPersonalizado({
    periodoId: periodoValId,
    frecuenciaAcordada: 3,
    diasAcordados: ["MARTES", "JUEVES", "SABADO"],
    horaInicioAcordada: "10:00",
    duracionMinutos: 60,
    motivoCambio: "Actualización de disponibilidad del socio para febrero",
  });

  assert(updateResult.success === true, "actualizarAcuerdoPeriodoPersonalizado ejecutado exitosamente");

  // ---------------------------------------------------------------------------
  // VERIFICACIÓN 1: Integridad de la cadena H4 (sesionOriginalId y reprogramadaEnSesionId)
  // ---------------------------------------------------------------------------
  console.log("\n--- VERIFICACIÓN 1: Integridad de trazabilidad H4 tras ajuste ---");

  const ses1_post = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sesionOriginalId } });
  const ses2_post = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sesion2Id } });
  const ses3_post = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sesion3Id } });

  assert(
    ses1_post?.estado === "REPROGRAMADA" &&
      ses1_post?.reprogramadaEnSesionId === sesion2Id &&
      ses1_post?.sesionOriginalId === null,
    "SES-1 conserva su estado REPROGRAMADA y puntero reprogramadaEnSesionId hacia SES-2"
  );

  assert(
    ses2_post?.estado === "REPROGRAMADA" &&
      ses2_post?.sesionOriginalId === sesionOriginalId &&
      ses2_post?.reprogramadaEnSesionId === sesion3Id,
    "SES-2 conserva intactos sesionOriginalId (hacia SES-1) y reprogramadaEnSesionId (hacia SES-3)"
  );

  assert(
    ses3_post?.sesionOriginalId === sesion2Id && ses3_post?.esReprogramada === true,
    "SES-3 conserva intacta la referencia sesionOriginalId (hacia SES-2) y flag esReprogramada=true"
  );

  // ---------------------------------------------------------------------------
  // VERIFICACIÓN 2: Principio NO DELETE (Cero eliminaciones físicas)
  // ---------------------------------------------------------------------------
  console.log("\n--- VERIFICACIÓN 2: Principio NO DELETE en Base de Datos ---");

  const totalSesionesEnBD = await prisma.sesionEntrenamientoPersonalizado.count({
    where: { periodoId: periodoValId },
  });

  assert(
    totalSesionesEnBD >= 10,
    `Principio NO DELETE: Total sesiones en BD = ${totalSesionesEnBD} (ninguna sesión fue eliminada físicamente)`
  );

  // ---------------------------------------------------------------------------
  // VERIFICACIÓN 3: Trazabilidad en Calendario H5 (Única sesión activa por horario)
  // ---------------------------------------------------------------------------
  console.log("\n--- VERIFICACIÓN 3: Comportamiento en Calendario Visual H5 ---");

  const calResult = await getSesionesCalendarioPersonalizado({
    fechaDesde: "2027-02-01",
    fechaHasta: "2027-02-28",
    socioId: socio.id,
  });

  assert(calResult.success === true, "Consulta de calendario H5 exitosa");

  const eventosVigentes: EventoSesionCalendario[] = calResult.sesiones || [];

  // Comprobar que ninguna sesión REPROGRAMADA aparece como vigente
  const eventosReprogramadosVigentes = eventosVigentes.filter((e: EventoSesionCalendario) => e.estado === "REPROGRAMADA");
  assert(
    eventosReprogramadosVigentes.length === 0,
    "Ninguna sesión en estado REPROGRAMADA aparece como evento activo/vigente en H5"
  );

  // Comprobar que ninguna sesión CANCELADA aparece como vigente por defecto
  const eventosCanceladosVigentes = eventosVigentes.filter((e: EventoSesionCalendario) =>
    ["CANCELADA_CLIENTE", "CANCELADA_ENTRENADOR", "CANCELADA_GIMNASIO"].includes(e.estado)
  );
  assert(
    eventosCanceladosVigentes.length === 0,
    "Ninguna sesión cancelada aparece como evento activo en la vista regular de H5"
  );

  // Comprobar que todas las sesiones activas en el calendario son PROGRAMADA
  const todasProgramadas = eventosVigentes.every((e: EventoSesionCalendario) => e.estado === "PROGRAMADA");
  assert(todasProgramadas, "Todos los eventos visibles en el calendario tienen estado PROGRAMADA");

  // ---------------------------------------------------------------------------
  // VERIFICACIÓN 4: No duplicación de sesiones
  // ---------------------------------------------------------------------------
  console.log("\n--- VERIFICACIÓN 4: Verificación de No Duplicación ---");

  // Comprobar si existen dos sesiones activas (PROGRAMADA) en la misma fecha y hora para el socio
  const horariosActivos = eventosVigentes.map((e: EventoSesionCalendario) => `${e.fecha}_${e.horaInicio}`);
  const tieneDuplicados = new Set(horariosActivos).size !== horariosActivos.length;

  assert(!tieneDuplicados, "No existe ninguna duplicación de sesiones activas en la misma fecha y hora");

  // ---------------------------------------------------------------------------
  // Limpieza de datos de prueba
  // ---------------------------------------------------------------------------
  console.log("\n--- Limpieza de datos temporales de prueba ---");
  await prisma.sesionEntrenamientoPersonalizado.deleteMany({ where: { periodoId: periodoValId } });
  await prisma.periodoEntrenamientoPersonalizado.delete({ where: { id: periodoValId } });
  console.log("Datos de prueba limpiados exitosamente.");

  console.log("\n================================================================================");
  console.log(`RESULTADOS VALIDACIÓN H4 + H6: ${testsPassed} PASARON / ${testsFailed} FALLARON`);
  console.log("================================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runValidationTests()
  .catch((err) => {
    console.error("Error fatal en la prueba de validación:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
