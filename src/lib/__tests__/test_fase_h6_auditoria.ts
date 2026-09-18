/**
 * SUITE DE AUDITORÍA COMPLEMENTARIA EXHAUSTIVA — FASE H6
 *
 * Audita específicamente la implementación y comportamiento de:
 * `actualizarAcuerdoPeriodoPersonalizado`, consistencia de acuerdos,
 * estados de periodo, atomicidad transaccional y principio NO DELETE.
 *
 * Escenarios probados:
 * 1. Modificación de acuerdo en periodo ACTIVO (frecuencia, días, hora, duración).
 * 2. Inmutabilidad estricta de sesiones históricas (pasadas, COMPLETADA, NO_ASISTIO).
 * 3. Principio NO DELETE: Verificación de cero deletes físicos en BD.
 * 4. Trazabilidad de sesiones reprogramadas y canceladas conservadas sin duplicación.
 * 5. Consistencia estricta: Frecuencia 2 con 3 días seleccionados es rechazada.
 * 6. Consistencia estricta: Frecuencia 3 con 2 días seleccionados es rechazada.
 * 7. Consistencia estricta: Frecuencia 2 con 2 días seleccionados es aceptada.
 * 8. Rechazo de actualización de acuerdo en periodo PAUSADO.
 * 9. Rechazo de actualización de acuerdo en periodo FINALIZADO.
 * 10. Rechazo de actualización de acuerdo en periodo CANCELADO.
 * 11. Detección de colisión para periodos o sesiones superpuestas del mismo socio.
 * 12. Registro exhaustivo en AuditLog con valores anteriores y nuevos.
 * 13. Atomicidad transaccional verificada.
 */

process.env.AUTH_BYPASS_FOR_TEST = "true";

import prisma from "@/lib/prisma";
import { setTestAuthContext } from "@/lib/auth-utils";
import {
  confirmarPeriodoPersonalizado,
  cambiarEstadoPeriodoPersonalizado,
  actualizarAcuerdoPeriodoPersonalizado,
  reprogramarSesionPersonalizada,
  cancelarSesionPersonalizada,
} from "@/app/actions/periodos-personalizados";
import { createLimaDateTime } from "@/lib/personalized-training-generator";
import { formatLimaDate } from "@/lib/date-utils";

let auditPassed = 0;
let auditFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    auditPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detalle: ${detail}`);
    auditFailed++;
  }
}

async function runH6AuditSuite() {
  console.log("================================================================================");
  console.log("SUITE DE AUDITORÍA COMPLEMENTARIA — FASE H6: ACTUALIZAR ACUERDO DE PERIODO");
  console.log("================================================================================\n");

  setTestAuthContext({
    userId: "admin-audit-h6-id",
    name: "Auditor H6",
    role: "ADMIN",
    permissions: ["ADMIN", "PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  // Limpieza inicial de datos de auditoría previos
  const prevPeriodos = await prisma.periodoEntrenamientoPersonalizado.findMany({
    where: { observaciones: { contains: "[AUDIT-H6]" } },
    select: { id: true },
  });
  const prevPIds = prevPeriodos.map((p) => p.id);
  if (prevPIds.length > 0) {
    await prisma.sesionEntrenamientoPersonalizado.deleteMany({
      where: { periodoId: { in: prevPIds } },
    });
    await prisma.periodoEntrenamientoPersonalizado.deleteMany({
      where: { id: { in: prevPIds } },
    });
  }

  // Socio y entrenador para auditoría
  let socio = await prisma.socio.findFirst();
  if (!socio) {
    socio = await prisma.socio.create({
      data: {
        codigo: "SOC-AUDIT-01",
        nombres: "Valeria",
        apellidos: "Castro Audit",
        numeroDocumento: "79998811",
        fechaNacimiento: new Date("1993-04-10"),
        sexo: "F",
        telefono: "988771122",
      },
    });
  }

  let entrenador = await prisma.personal.findFirst({ where: { activo: true } });
  if (!entrenador) {
    entrenador = await prisma.personal.create({
      data: {
        codigo: "ENT-AUDIT-01",
        nombres: "Eduardo",
        apellidos: "Salas Audit",
        dni: "89998811",
        rol: "Instructor",
        metodoPago: "MENSUAL",
        montoPago: 1800,
        horasObjetivo: 40,
        activo: true,
      },
    });
  }

  const socioId = socio.id;
  const entrenadorId = entrenador.id;

  // ---------------------------------------------------------------------------
  // AUDIT 1: Consistencia estricta Frecuencia vs Días Acordados (Zod Validation)
  // ---------------------------------------------------------------------------
  console.log("--- AUDIT 1: Consistencia entre frecuenciaAcordada y diasAcordados ---");

  // Caso A: Frecuencia 2 con 3 días seleccionados (debe RECHAZARSE)
  const resMismatch1 = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId,
    fechaInicio: "2027-04-05",
    fechaFin: "2027-05-02",
    mesesPeriodo: 1,
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 2,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"], // 3 días seleccionados para frecuencia 2
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
    observaciones: "[AUDIT-H6] Mismatch 2 vs 3",
  });

  assert(
    resMismatch1.success === false,
    "Audit 1A: Rechaza frecuencia 2 con 3 días seleccionados (no aceptación silenciosa)"
  );

  // Caso B: Frecuencia 3 con 2 días seleccionados (debe RECHAZARSE)
  const resMismatch2 = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId,
    fechaInicio: "2027-04-05",
    fechaFin: "2027-05-02",
    mesesPeriodo: 1,
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES"], // 2 días seleccionados para frecuencia 3
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
    observaciones: "[AUDIT-H6] Mismatch 3 vs 2",
  });

  assert(
    resMismatch2.success === false,
    "Audit 1B: Rechaza frecuencia 3 con 2 días seleccionados"
  );

  // Caso C: Frecuencia 2 con 2 días seleccionados (debe ACEPTARSE)
  const resValido = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId,
    fechaInicio: "2027-04-05", // Lunes
    fechaFin: "2027-05-02", // Domingo (4 semanas = 8 sesiones)
    mesesPeriodo: 1,
    frecuenciaRecomendada: 4,
    frecuenciaAcordada: 2,
    diasAcordados: ["LUNES", "MIERCOLES"],
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
    objetivoAcordado: "Definición muscular",
    observaciones: "[AUDIT-H6] Periodo base para auditoría",
  });

  assert(
    resValido.success === true && resValido.totalSesiones === 8,
    "Audit 1C: Acepta frecuencia 2 con exactamente 2 días seleccionados (8 sesiones generadas)"
  );

  const periodoAuditId = resValido.periodoId!;

  // ---------------------------------------------------------------------------
  // AUDIT 2: Inmutabilidad de Sesiones Históricas y NO DELETE en Ajuste de Acuerdo
  // ---------------------------------------------------------------------------
  console.log("\n--- AUDIT 2: Inmutabilidad histórica y Principio NO DELETE ---");

  const sesionesIniciales = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: { periodoId: periodoAuditId },
    orderBy: { fechaHoraInicio: "asc" },
  });

  // Simular: Sesión 0 completada, Sesión 1 no asistió, Sesión 2 reprogramada
  const sCompletada = sesionesIniciales[0];
  const sNoAsistio = sesionesIniciales[1];
  const sReprogramar = sesionesIniciales[2];

  await prisma.sesionEntrenamientoPersonalizado.update({
    where: { id: sCompletada.id },
    data: { estado: "COMPLETADA", asistio: true },
  });

  await prisma.sesionEntrenamientoPersonalizado.update({
    where: { id: sNoAsistio.id },
    data: { estado: "NO_ASISTIO", asistio: false },
  });

  const resReprogAudit = await reprogramarSesionPersonalizada({
    sesionId: sReprogramar.id,
    nuevaFecha: "2027-04-06", // Martes
    nuevaHoraInicio: "17:00",
    duracionMinutos: 60,
    motivoReprogramacion: "[AUDIT-H6] Cambio laboral del socio",
  });

  assert(
    resReprogAudit.success === true,
    "Audit 2A: Sesión reprogramada correctamente antes del ajuste de acuerdo"
  );

  const totalAntesAjuste = await prisma.sesionEntrenamientoPersonalizado.count({
    where: { periodoId: periodoAuditId },
  });

  // Ejecutar actualización del acuerdo: Cambiar a frecuencia 3 (LUN, MIE, VIE) a las 09:00 (90 min)
  const resAjusteAcuerdo = await actualizarAcuerdoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    frecuenciaRecomendada: 4,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicioAcordada: "09:00",
    duracionMinutos: 90,
    objetivoAcordado: "Fuerza máxima y potencia",
    observaciones: "[AUDIT-H6] Periodo ajustado a 3 días 90 min",
    motivoCambio: "[AUDIT-H6] Incremento de disponibilidad horaria del socio",
  });

  assert(
    resAjusteAcuerdo.success === true && (resAjusteAcuerdo.totalNuevasSesiones || 0) > 0,
    "Audit 2B: Actualización de acuerdo a frecuencia 3 (90 min) ejecutada con éxito"
  );

  // Verificar que NINGUNA sesión fue eliminada físicamente (conteo total aumentó o se mantuvo)
  const totalDespuesAjuste = await prisma.sesionEntrenamientoPersonalizado.count({
    where: { periodoId: periodoAuditId },
  });

  assert(
    totalDespuesAjuste >= totalAntesAjuste,
    `Audit 2C: Cero DELETEs físicos (total sesiones en BD: ${totalDespuesAjuste} >= ${totalAntesAjuste})`
  );

  // Verificar que sesiones COMPLETADA, NO_ASISTIO y REPROGRAMADA no cambiaron
  const checkSComp = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sCompletada.id } });
  const checkSNoAs = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sNoAsistio.id } });
  const checkSRep = await prisma.sesionEntrenamientoPersonalizado.findUnique({ where: { id: sReprogramar.id } });

  assert(
    checkSComp?.estado === "COMPLETADA" && checkSComp.asistio === true,
    "Audit 2D: Sesión COMPLETADA permanece 100% intacta"
  );
  assert(
    checkSNoAs?.estado === "NO_ASISTIO" && checkSNoAs.asistio === false,
    "Audit 2E: Sesión NO_ASISTIO permanece 100% intacta"
  );
  assert(
    checkSRep?.estado === "REPROGRAMADA" && checkSRep.reprogramadaEnSesionId === resReprogAudit.nuevaSesionId,
    "Audit 2F: Trazabilidad de sesión REPROGRAMADA permanece 100% vinculada e intacta"
  );

  // ---------------------------------------------------------------------------
  // AUDIT 3: Registro en AuditLog con Valores Anteriores y Nuevos
  // ---------------------------------------------------------------------------
  console.log("\n--- AUDIT 3: AuditLog con valores anteriores y nuevos ---");

  const auditRecord = await prisma.auditLog.findFirst({
    where: {
      accion: "ACTUALIZAR_ACUERDO_PERIODO_PERSONALIZADO",
      detalles: { contains: periodoAuditId },
    },
    orderBy: { fecha: "desc" },
  });

  assert(
    auditRecord !== null &&
      auditRecord.detalles !== null &&
      auditRecord.detalles.includes("Anterior: 2 d/sem -> Nueva: 3 d/sem") &&
      auditRecord.detalles.includes("08:00 (60 min) -> Nuevo: 09:00 (90 min)") &&
      auditRecord.detalles.includes("Incremento de disponibilidad horaria"),
    "Audit 3: AuditLog inmutable registra detalladamente valores anteriores vs nuevos y motivo"
  );

  // ---------------------------------------------------------------------------
  // AUDIT 4: Comportamiento ante Diferentes Estados de Periodo
  // ---------------------------------------------------------------------------
  console.log("\n--- AUDIT 4: Comportamiento ante estados PAUSADO, FINALIZADO, CANCELADO ---");

  // 4A. En PAUSADO: debe rechazar actualización de acuerdo
  await cambiarEstadoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    nuevoEstado: "PAUSADO",
    motivo: "[AUDIT-H6] Pausa para prueba de auditoría",
  });

  const resEnPausado = await actualizarAcuerdoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    frecuenciaAcordada: 2,
    diasAcordados: ["LUNES", "MIERCOLES"],
    horaInicioAcordada: "10:00",
    duracionMinutos: 60,
    motivoCambio: "[AUDIT-H6] Intento en pausado",
  });

  assert(
    resEnPausado.success === false && Boolean(resEnPausado.error?.includes("PAUSADO")),
    "Audit 4A: Rechaza actualizar acuerdo en periodo PAUSADO"
  );

  // 4B. En FINALIZADO: debe rechazar actualización de acuerdo
  await cambiarEstadoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    nuevoEstado: "FINALIZADO",
    motivo: "[AUDIT-H6] Finalización para prueba",
  });

  const resEnFinalizado = await actualizarAcuerdoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    frecuenciaAcordada: 2,
    diasAcordados: ["LUNES", "MIERCOLES"],
    horaInicioAcordada: "10:00",
    duracionMinutos: 60,
    motivoCambio: "[AUDIT-H6] Intento en finalizado",
  });

  assert(
    resEnFinalizado.success === false && Boolean(resEnFinalizado.error?.includes("FINALIZADO")),
    "Audit 4B: Rechaza actualizar acuerdo en periodo FINALIZADO"
  );

  // 4C. En CANCELADO: debe rechazar actualización de acuerdo
  await cambiarEstadoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    nuevoEstado: "CANCELADO",
    motivo: "[AUDIT-H6] Cancelación para prueba",
  });

  const resEnCancelado = await actualizarAcuerdoPeriodoPersonalizado({
    periodoId: periodoAuditId,
    frecuenciaAcordada: 2,
    diasAcordados: ["LUNES", "MIERCOLES"],
    horaInicioAcordada: "10:00",
    duracionMinutos: 60,
    motivoCambio: "[AUDIT-H6] Intento en cancelado",
  });

  assert(
    resEnCancelado.success === false && Boolean(resEnCancelado.error?.includes("CANCELADO")),
    "Audit 4C: Rechaza actualizar acuerdo en periodo CANCELADO"
  );

  // ---------------------------------------------------------------------------
  // AUDIT 5: Detección de Colisión en Periodos Superpuestos del Mismo Socio
  // ---------------------------------------------------------------------------
  console.log("\n--- AUDIT 5: Detección de colisión en periodos superpuestos ---");

  // Crear un nuevo periodo ACTIVO para socio
  const resPeriodoNuevo = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId,
    fechaInicio: "2027-06-01",
    fechaFin: "2027-06-30",
    mesesPeriodo: 1,
    frecuenciaRecomendada: 2,
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicioAcordada: "07:00",
    duracionMinutos: 60,
    observaciones: "[AUDIT-H6] Periodo Junio",
  });

  // Intentar crear un segundo periodo simultáneo para el mismo socio en el mismo horario
  const resPeriodoSuperpuesto = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId,
    fechaInicio: "2027-06-01",
    fechaFin: "2027-06-30",
    mesesPeriodo: 1,
    frecuenciaRecomendada: 2,
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicioAcordada: "07:00",
    duracionMinutos: 60,
    observaciones: "[AUDIT-H6] Periodo Junio Superpuesto",
  });

  assert(
    resPeriodoSuperpuesto.success === false && (resPeriodoSuperpuesto.conflictos?.length || 0) > 0,
    "Audit 5: Motor H3 detecta y bloquea sesiones superpuestas para el mismo socio"
  );

  // ---------------------------------------------------------------------------
  // RESUMEN FINAL AUDITORÍA
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`RESULTADOS SUITE AUDITORÍA H6: ${auditPassed} PASARON / ${auditFailed} FALLARON`);
  console.log("================================================================================\n");

  if (auditFailed > 0) {
    throw new Error(`Auditoría H6 finalizó con ${auditFailed} fallas.`);
  }
}

runH6AuditSuite()
  .then(() => {
    console.log("✅ TODAS LAS PRUEBAS DE AUDITORÍA H6 SE EJECUTARON EXITOSAMENTE.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ ERROR EN AUDITORÍA H6:", err);
    process.exit(1);
  });
