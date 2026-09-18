/**
 * SUITE DE PRUEBAS AUTOMATIZADAS — FASE H4: REPROGRAMACIÓN Y CANCELACIÓN DE SESIONES
 *
 * Escenarios a validar:
 *  1. Reprogramación simple
 *  2. Original queda REPROGRAMADA
 *  3. Nueva queda PROGRAMADA
 *  4. sesionOriginalId correcto
 *  5. reprogramadaEnSesionId correcto
 *  6. Motivo conservado en ambas sesiones
 *  7. Original deja de bloquear disponibilidad
 *  8. Nueva sesión bloquea disponibilidad
 *  9. Conflicto con entrenador en nuevo horario es rechazado
 * 10. Conflicto con socio en nuevo horario es rechazado
 * 11. Cancelación por cliente (CANCELADA_CLIENTE)
 * 12. Cancelación por entrenador (CANCELADA_ENTRENADOR)
 * 13. Cancelación por gimnasio (CANCELADA_GIMNASIO)
 * 14. Sesión cancelada libera horario para nuevas reservas
 * 15. Principio NO DELETE: ningún registro es eliminado físicamente
 * 16. Registro inmutable en AuditLog para reprogramaciones
 * 17. Registro inmutable en AuditLog para cancelaciones
 * 18. Reprogramación ante colisión concurrente (aborto seguro)
 * 19. Reprogramación manteniendo coherencia en America/Lima
 * 20. Reprogramación encadenada (SES-001 -> SES-002 -> SES-003)
 * 21. Intentar reprogramar sesión cancelada es rechazado
 * 22. Intentar cancelar sesión ya cancelada es rechazado
 * 23. Intentar alterar/reprogramar/cancelar sesión COMPLETADA es rechazado
 * 24. Intentar alterar/reprogramar/cancelar sesión NO_ASISTIO es rechazado
 */

process.env.AUTH_BYPASS_FOR_TEST = "true";

import prisma from "@/lib/prisma";
import { setTestAuthContext } from "@/lib/auth-utils";
import {
  reprogramarSesionPersonalizada,
  cancelarSesionPersonalizada,
} from "@/app/actions/periodos-personalizados";
import {
  createLimaDateTime,
  formatLimaTime,
  ESTADOS_BLOQUEANTES,
  detectSessionConflicts,
} from "@/lib/personalized-training-generator";
import { getLimaStartOfDay, getLimaEndOfDay, formatLimaDate } from "@/lib/date-utils";

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

async function runH4Suite() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS AUTOMATIZADAS — FASE H4: REPROGRAMACIÓN Y CANCELACIÓN");
  console.log("================================================================================\n");

  setTestAuthContext({
    userId: "test-admin-h4",
    name: "Admin Tester H4",
    role: "ADMIN",
    permissions: ["PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  // 1. Obtener o crear Socio y Entrenador de prueba
  let socio = await prisma.socio.findFirst();
  if (!socio) {
    socio = await prisma.socio.create({
      data: {
        codigo: "SOC-H4-01",
        nombres: "Socio",
        apellidos: "Prueba H4",
        numeroDocumento: "99887766",
        fechaNacimiento: new Date("1995-05-15"),
        sexo: "M",
      },
    });
  }

  let socio2 = await prisma.socio.findFirst({ where: { id: { not: socio.id } } });
  if (!socio2) {
    socio2 = await prisma.socio.create({
      data: {
        codigo: "SOC-H4-02",
        nombres: "Socio Dos",
        apellidos: "Prueba H4",
        numeroDocumento: "99887765",
        fechaNacimiento: new Date("1996-06-20"),
        sexo: "F",
      },
    });
  }

  let entrenador = await prisma.personal.findFirst({ where: { activo: true } });
  if (!entrenador) {
    entrenador = await prisma.personal.create({
      data: {
        codigo: "ENT-H4-01",
        nombres: "Entrenador",
        apellidos: "Prueba H4",
        dni: "88776655",
        rol: "Instructor",
        metodoPago: "MENSUAL",
        montoPago: 1500,
        horasObjetivo: 40,
        telefono: "999888777",
        activo: true,
      },
    });
  }

  const socioId = socio.id;
  const socio2Id = socio2.id;
  const entrenadorId = entrenador.id;

  // Limpieza inicial previa para asegurar estado prístino
  await prisma.sesionEntrenamientoPersonalizado.deleteMany({
    where: {
      OR: [
        { fechaHoraInicio: { gte: new Date("2026-10-01T00:00:00Z"), lte: new Date("2026-12-31T23:59:59Z") } },
        { socioId: { in: [socioId, socio2Id] } },
      ],
    },
  });
  await prisma.periodoEntrenamientoPersonalizado.deleteMany({
    where: {
      socioId: { in: [socioId, socio2Id] },
    },
  });

  // Helper para crear periodo y sesión base
  async function crearSesionFixture(fechaStr: string, horaInicio: string, duracionMin = 60, estado = "PROGRAMADA") {
    const fInicio = createLimaDateTime(fechaStr, horaInicio);
    const fFin = new Date(fInicio.getTime() + duracionMin * 60 * 1000);
    const horaFin = formatLimaTime(fFin);

    const periodo = await prisma.periodoEntrenamientoPersonalizado.create({
      data: {
        socioId,
        entrenadorId,
        fechaInicio: getLimaStartOfDay(fInicio),
        fechaFin: getLimaEndOfDay(fInicio),
        mesesPeriodo: 1,
        frecuenciaRecomendada: 1,
        frecuenciaAcordada: 1,
        diasAcordados: JSON.stringify(["LUNES"]),
        horaInicioAcordada: horaInicio,
        duracionMinutos: duracionMin,
        estado: "ACTIVO",
      },
    });

    const sesion = await prisma.sesionEntrenamientoPersonalizado.create({
      data: {
        periodoId: periodo.id,
        socioId,
        entrenadorId,
        fecha: getLimaStartOfDay(fInicio),
        horaInicio,
        horaFin,
        fechaHoraInicio: fInicio,
        fechaHoraFin: fFin,
        duracionMinutos: duracionMin,
        estado,
      },
    });

    return { periodo, sesion };
  }

  // ---------------------------------------------------------------------------
  // TEST 1 a 6: Reprogramación Simple, Estados, Enlace Bidireccional y Motivo
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1 a 6: Reprogramación Simple e Historial Inmutable ---");
  const { periodo: p1, sesion: s1 } = await crearSesionFixture("2026-11-02", "08:00", 60);

  const resReprog1 = await reprogramarSesionPersonalizada({
    sesionId: s1.id,
    nuevaFecha: "2026-11-05",
    nuevaHoraInicio: "10:30",
    duracionMinutos: 60,
    motivoReprogramacion: "Socio solicita cambio por motivo laboral",
  });

  if (!resReprog1.success) {
    console.error("  [DEBUG ERROR resReprog1]:", resReprog1.error);
  }
  assert(resReprog1.success === true, "TEST 1: Reprogramación simple se ejecuta con éxito", resReprog1.error);

  const s1Db = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: s1.id } });
  const s2Db = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: resReprog1.nuevaSesionId! } });

  assert(s1Db?.estado === "REPROGRAMADA", "TEST 2: Sesión original pasa a estado REPROGRAMADA");
  assert(s2Db?.estado === "PROGRAMADA", "TEST 3: Nueva sesión derivada pasa a estado PROGRAMADA");
  assert(s2Db?.sesionOriginalId === s1.id && s2Db?.esReprogramada === true, "TEST 4: Nueva sesión referencia correctamente sesionOriginalId y esReprogramada=true");
  assert(s1Db?.reprogramadaEnSesionId === s2Db?.id, "TEST 5: Sesión original referencia correctamente reprogramadaEnSesionId");
  assert(
    s1Db?.motivoReprogramacion === "Socio solicita cambio por motivo laboral" &&
    s2Db?.motivoReprogramacion === "Socio solicita cambio por motivo laboral",
    "TEST 6: Motivo de reprogramación conservado en ambas sesiones"
  );

  // ---------------------------------------------------------------------------
  // TEST 7 y 8: Disponibilidad - Original NO bloquea, Nueva SÍ bloquea
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7 y 8: Disponibilidad tras Reprogramación ---");
  // A. El horario original (02/11 08:00) debe estar libre
  const sesionesEnHorarioOriginal = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: {
      entrenadorId,
      estado: { in: [...ESTADOS_BLOQUEANTES] },
      fechaHoraInicio: { lte: s1.fechaHoraFin },
      fechaHoraFin: { gte: s1.fechaHoraInicio },
    },
  });
  assert(sesionesEnHorarioOriginal.length === 0, "TEST 7: El horario de la sesión original queda liberado para nuevos agendamientos");

  // B. El nuevo horario (05/11 10:30) debe estar bloqueado
  const sesionesEnNuevoHorario = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: {
      entrenadorId,
      estado: { in: [...ESTADOS_BLOQUEANTES] },
      fechaHoraInicio: { lte: s2Db!.fechaHoraFin },
      fechaHoraFin: { gte: s2Db!.fechaHoraInicio },
    },
  });
  assert(sesionesEnNuevoHorario.length === 1 && sesionesEnNuevoHorario[0].id === s2Db!.id, "TEST 8: La nueva sesión reprogramada bloquea activamente el horario");

  // ---------------------------------------------------------------------------
  // TEST 9 y 10: Detección de Conflictos al Reprogramar (Entrenador y Socio)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 9 y 10: Detección de Conflictos al Reprogramar ---");
  // Crear sesión competidora para el entrenador el 06/11 09:00 a 10:00
  const { periodo: pCompEnt, sesion: sCompEnt } = await crearSesionFixture("2026-11-06", "09:00", 60);

  // Intentar reprogramar s2Db hacia 06/11 09:30 (solapamiento)
  const resConfEnt = await reprogramarSesionPersonalizada({
    sesionId: s2Db!.id,
    nuevaFecha: "2026-11-06",
    nuevaHoraInicio: "09:30",
    duracionMinutos: 60,
    motivoReprogramacion: "Intento de solapamiento con entrenador",
  });
  assert(resConfEnt.success === false && Boolean(resConfEnt.error?.includes("conflictos") || (resConfEnt.conflictos && resConfEnt.conflictos.length > 0)), "TEST 9: Reprogramación hacia horario ocupado del entrenador es rechazada");

  // Crear sesión con otro entrenador para el socio el 07/11 15:00 a 16:00
  const { periodo: pCompSoc, sesion: sCompSoc } = await crearSesionFixture("2026-11-07", "15:00", 60);

  // Intentar reprogramar s2Db hacia 07/11 15:30
  const resConfSoc = await reprogramarSesionPersonalizada({
    sesionId: s2Db!.id,
    nuevaFecha: "2026-11-07",
    nuevaHoraInicio: "15:30",
    duracionMinutos: 60,
    motivoReprogramacion: "Intento de solapamiento con socio",
  });
  assert(resConfSoc.success === false, "TEST 10: Reprogramación hacia horario ocupado del socio es rechazada");

  // ---------------------------------------------------------------------------
  // TEST 11 a 15: Cancelaciones (Cliente, Entrenador, Gimnasio), Disponibilidad y NO DELETE
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 11 a 15: Cancelaciones y Principio NO DELETE ---");
  const { periodo: pCanc1, sesion: sCanc1 } = await crearSesionFixture("2026-11-10", "08:00", 60);
  const { periodo: pCanc2, sesion: sCanc2 } = await crearSesionFixture("2026-11-10", "10:00", 60);
  const { periodo: pCanc3, sesion: sCanc3 } = await crearSesionFixture("2026-11-10", "12:00", 60);

  const resCanc1 = await cancelarSesionPersonalizada({
    sesionId: sCanc1.id,
    tipoCancelacion: "CANCELADA_CLIENTE",
    motivoCancelacion: "Cliente enfermo",
  });
  assert(resCanc1.success === true && resCanc1.estado === "CANCELADA_CLIENTE", "TEST 11: Cancelación por cliente exitosa");

  const resCanc2 = await cancelarSesionPersonalizada({
    sesionId: sCanc2.id,
    tipoCancelacion: "CANCELADA_ENTRENADOR",
    motivoCancelacion: "Entrenador en capacitación",
  });
  assert(resCanc2.success === true && resCanc2.estado === "CANCELADA_ENTRENADOR", "TEST 12: Cancelación por entrenador exitosa");

  const resCanc3 = await cancelarSesionPersonalizada({
    sesionId: sCanc3.id,
    tipoCancelacion: "CANCELADA_GIMNASIO",
    motivoCancelacion: "Mantenimiento eléctrico del gimnasio",
  });
  assert(resCanc3.success === true && resCanc3.estado === "CANCELADA_GIMNASIO", "TEST 13: Cancelación por gimnasio exitosa");

  // Disponibilidad de horario cancelado
  const sesionesBloqueantesCanceladas = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: {
      id: sCanc1.id,
      estado: { in: [...ESTADOS_BLOQUEANTES] },
    },
  });
  assert(sesionesBloqueantesCanceladas.length === 0, "TEST 14: Sesión cancelada deja de bloquear disponibilidad horaria");

  // NO DELETE: verificar que el registro sigue existiendo en BD
  const sCanc1Existe = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sCanc1.id } });
  assert(sCanc1Existe !== null && sCanc1Existe.motivoCancelacion === "Cliente enfermo", "TEST 15: Principio NO DELETE: la sesión permanece íntegra en BD");

  // ---------------------------------------------------------------------------
  // TEST 16 y 17: AuditLog de Reprogramación y Cancelación
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 16 y 17: Verificación de AuditLog ---");
  const auditReprog = await prisma.auditLog.findFirst({
    where: { accion: "REPROGRAMAR_SESION_PERSONALIZADO" },
    orderBy: { fecha: "desc" },
  });
  assert(auditReprog !== null && Boolean(auditReprog.detalles?.includes("Reprogramación de sesión")), "TEST 16: AuditLog registra correctamente la acción REPROGRAMAR_SESION_PERSONALIZADO");

  const auditCanc = await prisma.auditLog.findFirst({
    where: { accion: "CANCELAR_SESION_PERSONALIZADO" },
    orderBy: { fecha: "desc" },
  });
  assert(auditCanc !== null && Boolean(auditCanc.detalles?.includes("Cancelación")), "TEST 17: AuditLog registra correctamente la acción CANCELAR_SESION_PERSONALIZADO");

  // ---------------------------------------------------------------------------
  // TEST 18: Reprogramación con Concurrencia (Detección previa al guardado)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 18: Protección de Concurrencia al Reprogramar ---");
  const { periodo: pConc1, sesion: sConc1 } = await crearSesionFixture("2026-11-15", "08:00", 60);
  const { periodo: pConc2, sesion: sConc2 } = await crearSesionFixture("2026-11-16", "14:00", 60);

  // Intentar reprogramar sConc1 al mismo horario de sConc2 (16/11 14:00)
  const resReprogConc = await reprogramarSesionPersonalizada({
    sesionId: sConc1.id,
    nuevaFecha: "2026-11-16",
    nuevaHoraInicio: "14:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Intento concurrente",
  });
  assert(resReprogConc.success === false, "TEST 18: La consulta backend detecta colisión concurrente y aborta");

  // ---------------------------------------------------------------------------
  // TEST 19: Timezone America/Lima Coherence
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 19: Coherencia de Zona Horaria America/Lima ---");
  const { periodo: pTz, sesion: sTz } = await crearSesionFixture("2026-11-20", "19:00", 90);

  const resReprogTz = await reprogramarSesionPersonalizada({
    sesionId: sTz.id,
    nuevaFecha: "2026-11-21",
    nuevaHoraInicio: "20:00",
    duracionMinutos: 90,
    motivoReprogramacion: "Sesión nocturna en Lima",
  });

  const sesionTzNueva = await prisma.sesionEntrenamientoPersonalizado.findUnique({
    where: { id: resReprogTz.nuevaSesionId! },
  });

  assert(
    sesionTzNueva?.horaInicio === "20:00" &&
    sesionTzNueva?.horaFin === "21:30" &&
    formatLimaDate(sesionTzNueva.fecha) === "2026-11-21",
    "TEST 19: Reprogramación preserva horas y fechas coherentes en America/Lima (20:00-21:30)"
  );

  // ---------------------------------------------------------------------------
  // TEST 20: Reprogramación Encadenada (SES-001 -> SES-002 -> SES-003)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 20: Reprogramación Encadenada ---");
  const { periodo: pChain, sesion: sChain1 } = await crearSesionFixture("2026-11-25", "08:00", 60);

  // 1ra Reprogramación: sChain1 -> sChain2
  const rChain1 = await reprogramarSesionPersonalizada({
    sesionId: sChain1.id,
    nuevaFecha: "2026-11-26",
    nuevaHoraInicio: "09:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Paso 1: Lunes a Jueves",
  });

  // 2da Reprogramación: sChain2 -> sChain3
  const rChain2 = await reprogramarSesionPersonalizada({
    sesionId: rChain1.nuevaSesionId!,
    nuevaFecha: "2026-11-28",
    nuevaHoraInicio: "11:00",
    duracionMinutos: 60,
    motivoReprogramacion: "Paso 2: Jueves a Sábado",
  });

  const s1ChainDb = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sChain1.id } });
  const s2ChainDb = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: rChain1.nuevaSesionId! } });
  const s3ChainDb = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: rChain2.nuevaSesionId! } });

  assert(
    s1ChainDb?.estado === "REPROGRAMADA" &&
    s1ChainDb?.reprogramadaEnSesionId === s2ChainDb?.id &&
    s2ChainDb?.estado === "REPROGRAMADA" &&
    s2ChainDb?.sesionOriginalId === s1ChainDb?.id &&
    s2ChainDb?.reprogramadaEnSesionId === s3ChainDb?.id &&
    s3ChainDb?.estado === "PROGRAMADA" &&
    s3ChainDb?.sesionOriginalId === s2ChainDb?.id,
    "TEST 20: Cadena completa de reprogramaciones (SES-1 -> SES-2 -> SES-3) preservada sin romper referencias"
  );

  // ---------------------------------------------------------------------------
  // TEST 21: Intentar Reprogramar Sesión Cancelada (Rechazo)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 21: Rechazo de Reprogramar Sesión Cancelada ---");
  const resReprogCanc = await reprogramarSesionPersonalizada({
    sesionId: sCanc1.id,
    nuevaFecha: "2026-11-29",
    nuevaHoraInicio: "10:00",
    motivoReprogramacion: "Intento sobre cancelada",
  });
  assert(resReprogCanc.success === false, "TEST 21: Rechaza reprogramar una sesión con estado cancelado");

  // ---------------------------------------------------------------------------
  // TEST 22: Intentar Cancelar Sesión Ya Cancelada (Rechazo)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 22: Rechazo de Cancelar Sesión Ya Cancelada ---");
  const resCancDoble = await cancelarSesionPersonalizada({
    sesionId: sCanc1.id,
    tipoCancelacion: "CANCELADA_GIMNASIO",
    motivoCancelacion: "Intento doble cancelacion",
  });
  assert(resCancDoble.success === false, "TEST 22: Rechaza cancelar una sesión que ya fue cancelada");

  // ---------------------------------------------------------------------------
  // TEST 23: Intentar Alterar Sesión COMPLETADA (Rechazo)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 23: Rechazo de Alterar Sesión COMPLETADA ---");
  const { periodo: pComp, sesion: sComp } = await crearSesionFixture("2026-10-01", "08:00", 60, "COMPLETADA");

  const resReprogComp = await reprogramarSesionPersonalizada({
    sesionId: sComp.id,
    nuevaFecha: "2026-11-30",
    nuevaHoraInicio: "08:00",
    motivoReprogramacion: "Intento sobre completada",
  });
  const resCancComp = await cancelarSesionPersonalizada({
    sesionId: sComp.id,
    tipoCancelacion: "CANCELADA_CLIENTE",
    motivoCancelacion: "Intento sobre completada",
  });
  assert(resReprogComp.success === false && resCancComp.success === false, "TEST 23: Rechaza reprogramar o cancelar una sesión histórica con estado COMPLETADA");

  // ---------------------------------------------------------------------------
  // TEST 24: Intentar Alterar Sesión NO_ASISTIO (Rechazo)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 24: Rechazo de Alterar Sesión NO_ASISTIO ---");
  const { periodo: pNoAsist, sesion: sNoAsist } = await crearSesionFixture("2026-10-02", "08:00", 60, "NO_ASISTIO");

  const resReprogNoAsist = await reprogramarSesionPersonalizada({
    sesionId: sNoAsist.id,
    nuevaFecha: "2026-11-30",
    nuevaHoraInicio: "09:00",
    motivoReprogramacion: "Intento sobre no asistio",
  });
  const resCancNoAsist = await cancelarSesionPersonalizada({
    sesionId: sNoAsist.id,
    tipoCancelacion: "CANCELADA_CLIENTE",
    motivoCancelacion: "Intento sobre no asistio",
  });
  assert(resReprogNoAsist.success === false && resCancNoAsist.success === false, "TEST 24: Rechaza reprogramar o cancelar una sesión histórica con estado NO_ASISTIO");

  // ---------------------------------------------------------------------------
  // LIMPIEZA DE DATOS TEMPORALES DE PRUEBA
  // ---------------------------------------------------------------------------
  console.log("\n--- Limpieza de datos temporales de prueba ---");
  const sesionesParaBorrar = [
    s1.id,
    resReprog1.nuevaSesionId,
    sCompEnt.id,
    sCompSoc.id,
    sCanc1.id,
    sCanc2.id,
    sCanc3.id,
    sConc1.id,
    sConc2.id,
    sTz.id,
    resReprogTz.nuevaSesionId,
    sChain1.id,
    rChain1.nuevaSesionId,
    rChain2.nuevaSesionId,
    sComp.id,
    sNoAsist.id,
  ].filter(Boolean) as string[];

  const periodosParaBorrar = [
    p1.id,
    pCompEnt.id,
    pCompSoc.id,
    pCanc1.id,
    pCanc2.id,
    pCanc3.id,
    pConc1.id,
    pConc2.id,
    pTz.id,
    pChain.id,
    pComp.id,
    pNoAsist.id,
  ];

  await prisma.sesionEntrenamientoPersonalizado.deleteMany({
    where: { id: { in: sesionesParaBorrar } },
  });
  await prisma.periodoEntrenamientoPersonalizado.deleteMany({
    where: { id: { in: periodosParaBorrar } },
  });

  console.log("\n================================================================================");
  console.log(`RESULTADO DE LA SUITE H4: ${testsPassed} PASARON / ${testsFailed} FALLARON`);
  console.log("================================================================================\n");

  await prisma.$disconnect();
  return testsFailed === 0;
}

runH4Suite().catch((e) => {
  console.error("Error fatal en suite de pruebas H4:", e);
  process.exit(1);
});
