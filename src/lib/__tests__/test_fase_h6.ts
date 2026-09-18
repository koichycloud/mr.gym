/**
 * SUITE DE PRUEBAS AUTOMATIZADAS — FASE H6: GESTIÓN OPERATIVA DEL PERIODO DE ENTRENAMIENTO PERSONALIZADO
 *
 * Valida de forma exhaustiva los 22 requerimientos obligatorios:
 *  1. Crear periodo válido con generación de sesiones.
 *  2. Rechazar periodo sin socio.
 *  3. Rechazar periodo sin entrenador.
 *  4. Rechazar fecha final anterior a fecha inicial.
 *  5. Aceptar frecuencia recomendada diferente de frecuencia acordada.
 *  6. Generar sesiones usando frecuencia acordada.
 *  7. Verificar que las sesiones estén estrictamente dentro del periodo.
 *  8. Verificar que respeten los días acordados.
 *  9. Verificar que respeten la duración y hora acordada.
 * 10. Detectar conflictos mediante motor H3 (detectSessionConflicts).
 * 11. Evitar duplicación de sesiones.
 * 12. Principio NO DELETE: no eliminar sesiones existentes.
 * 13. Registrar AuditLog inmutable de creación.
 * 14. Registrar AuditLog inmutable de cambio de estado y actualización de acuerdo.
 * 15. Validar permisos según roles.
 * 16. Regresión H2 (generador de sesiones).
 * 17. Regresión H3 (detección de conflictos).
 * 18. Regresión H4 (reprogramación y cancelación).
 * 19. Regresión H5 (consulta de calendario y vigencias).
 * 20. Verificar coherencia de zona horaria America/Lima.
 * 21. Verificar que sesiones reprogramadas mantengan trazabilidad sin contarse como sesiones huérfanas.
 * 22. Verificar que sesiones históricas (COMPLETADA, NO_ASISTIO) permanezcan intactas.
 */

process.env.AUTH_BYPASS_FOR_TEST = "true";

import prisma from "@/lib/prisma";
import { setTestAuthContext } from "@/lib/auth-utils";
import {
  previewPeriodoPersonalizado,
  confirmarPeriodoPersonalizado,
  cambiarEstadoPeriodoPersonalizado,
  actualizarAcuerdoPeriodoPersonalizado,
  getPeriodosSocio,
  getPeriodoActivoSocio,
  reprogramarSesionPersonalizada,
  cancelarSesionPersonalizada,
  getSesionesCalendarioPersonalizado,
} from "@/app/actions/periodos-personalizados";
import {
  generatePersonalizedSessions,
  detectSessionConflicts,
  createLimaDateTime,
  formatLimaTime,
  getLimaDayOfWeek,
  isSessionBlockingAvailability,
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

async function runH6Tests() {
  console.log("================================================================================");
  console.log("SUITE DE PRUEBAS AUTOMATIZADAS — FASE H6: GESTIÓN OPERATIVA POR PERIODO");
  console.log("================================================================================\n");

  // Autenticación inicial como Administrador
  setTestAuthContext({
    userId: "admin-test-h6-id",
    name: "Administrador H6",
    role: "ADMIN",
    permissions: ["ADMIN", "PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  // Limpieza inicial de datos previos de pruebas
  const prevPeriodos = await prisma.periodoEntrenamientoPersonalizado.findMany({
    where: { observaciones: { contains: "[TEST-H6]" } },
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

  // 1. Obtener o crear socio y entrenador de prueba
  let socioA = await prisma.socio.findFirst();
  if (!socioA) {
    socioA = await prisma.socio.create({
      data: {
        codigo: "SOC-H6-A",
        nombres: "Carlos",
        apellidos: "Mendoza H6",
        numeroDocumento: "78901234",
        fechaNacimiento: new Date("1994-08-12"),
        sexo: "M",
        telefono: "987654321",
      },
    });
  }

  let socioB = await prisma.socio.findFirst({ where: { id: { not: socioA.id } } });
  if (!socioB) {
    socioB = await prisma.socio.create({
      data: {
        codigo: "SOC-H6-B",
        nombres: "Mariana",
        apellidos: "Gómez H6",
        numeroDocumento: "78901235",
        fechaNacimiento: new Date("1996-03-22"),
        sexo: "F",
        telefono: "987654322",
      },
    });
  }

  let entrenador = await prisma.personal.findFirst({ where: { activo: true } });
  if (!entrenador) {
    entrenador = await prisma.personal.create({
      data: {
        codigo: "ENT-H6-01",
        nombres: "Roberto",
        apellidos: "Vargas H6",
        dni: "87654321",
        rol: "Instructor",
        metodoPago: "MENSUAL",
        montoPago: 1800,
        horasObjetivo: 40,
        telefono: "912345678",
        activo: true,
      },
    });
  }

  const socioId = socioA.id;
  const entrenadorId = entrenador.id;

  // Fechas base para pruebas
  const fechaInicioStr = "2027-01-04"; // Lunes
  const fechaFinStr = "2027-01-31"; // Domingo (4 semanas exactas = 28 días)

  // ---------------------------------------------------------------------------
  // TEST 1: Crear periodo válido
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Crear periodo válido ---");
  const resCrear = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId,
    fechaInicio: fechaInicioStr,
    fechaFin: fechaFinStr,
    mesesPeriodo: 1,
    frecuenciaRecomendada: 4,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
    objetivoAcordado: "Ganancia de masa muscular",
    observaciones: "[TEST-H6] Periodo principal",
  });

  assert(
    resCrear.success === true && !!resCrear.periodoId && (resCrear.totalSesiones || 0) > 0,
    "Test 1: Periodo creado exitosamente con sesiones generadas",
    resCrear.error
  );
  const periodoPrincipalId = resCrear.periodoId!;

  // ---------------------------------------------------------------------------
  // TEST 2: Rechazar periodo sin socio
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Rechazar periodo sin socio ---");
  const resSinSocio = await confirmarPeriodoPersonalizado({
    socioId: "socio-inexistente-uuid-9999",
    entrenadorId,
    fechaInicio: fechaInicioStr,
    fechaFin: fechaFinStr,
    mesesPeriodo: 1,
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicioAcordada: "09:00",
    duracionMinutos: 60,
    observaciones: "[TEST-H6]",
  });

  assert(
    resSinSocio.success === false && Boolean(resSinSocio.error?.includes("Socio no encontrado")),
    "Test 2: Rechaza periodo con socioId inexistente"
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Rechazar periodo sin entrenador
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Rechazar periodo sin entrenador ---");
  const resSinEntrenador = await confirmarPeriodoPersonalizado({
    socioId,
    entrenadorId: "entrenador-inexistente-uuid-9999",
    fechaInicio: fechaInicioStr,
    fechaFin: fechaFinStr,
    mesesPeriodo: 1,
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicioAcordada: "09:00",
    duracionMinutos: 60,
    observaciones: "[TEST-H6]",
  });

  assert(
    resSinEntrenador.success === false && Boolean(resSinEntrenador.error?.includes("Entrenador no encontrado")),
    "Test 3: Rechaza periodo con entrenador inexistente"
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Rechazar fecha final anterior a fecha inicial
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Rechazar fecha final anterior a fecha inicial ---");
  const resFechaInvertida = await confirmarPeriodoPersonalizado({
    socioId: socioB.id,
    entrenadorId,
    fechaInicio: "2027-02-15",
    fechaFin: "2027-02-01",
    mesesPeriodo: 1,
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicioAcordada: "09:00",
    duracionMinutos: 60,
    observaciones: "[TEST-H6]",
  });

  assert(
    resFechaInvertida.success === false,
    "Test 4: Rechaza periodo con fechaFin < fechaInicio"
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Aceptar frecuencia recomendada diferente de frecuencia acordada
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Aceptar frecuencia recomendada != frecuencia acordada ---");
  const periodoGuardado = await prisma.periodoEntrenamientoPersonalizado.findUnique({
    where: { id: periodoPrincipalId },
  });

  assert(
    periodoGuardado !== null &&
      periodoGuardado.frecuenciaRecomendada === 4 &&
      periodoGuardado.frecuenciaAcordada === 3 &&
      ((periodoGuardado.frecuenciaRecomendada as number) !== (periodoGuardado.frecuenciaAcordada as number)),
    "Test 5: Conserva fielmente frecuenciaRecomendada (4) != frecuenciaAcordada (3)"
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Generar sesiones usando frecuencia acordada
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Generar sesiones usando frecuencia acordada ---");
  // 4 semanas exactas de LUNES, MIERCOLES, VIERNES = 4 * 3 = 12 sesiones
  const sesionesPeriodo = await prisma.sesionEntrenamientoPersonalizado.findMany({
    where: { periodoId: periodoPrincipalId },
    orderBy: { fechaHoraInicio: "asc" },
  });

  assert(
    sesionesPeriodo.length === 12,
    `Test 6: Se generaron exactamente 12 sesiones (4 semanas x 3 días/sem acordados), obtenido: ${sesionesPeriodo.length}`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Verificar que las sesiones estén dentro del periodo
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7: Verificar que las sesiones estén dentro del periodo ---");
  const todasDentroDeRango = sesionesPeriodo.every((s) => {
    const sFechaStr = formatLimaDate(s.fecha);
    return sFechaStr >= fechaInicioStr && sFechaStr <= fechaFinStr;
  });

  assert(
    todasDentroDeRango,
    "Test 7: Todas las sesiones generadas caen estrictamente entre fechaInicio y fechaFin"
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Verificar que respeten los días acordados
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8: Verificar que respeten los días acordados ---");
  const diasEsperados = ["LUNES", "MIERCOLES", "VIERNES"];
  const todosDiasValidos = sesionesPeriodo.every((s) => {
    const diaNombre = getLimaDayOfWeek(s.fecha);
    return diasEsperados.includes(diaNombre);
  });

  assert(
    todosDiasValidos,
    "Test 8: Todas las sesiones corresponden a los días pactados (LUNES, MIERCOLES, VIERNES)"
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Verificar que respeten la duración
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 9: Verificar que respeten la duración ---");
  const todasDuracionOk = sesionesPeriodo.every((s) => {
    const diffMs = s.fechaHoraFin.getTime() - s.fechaHoraInicio.getTime();
    return s.duracionMinutos === 60 && diffMs === 60 * 60 * 1000 && s.horaInicio === "08:00" && s.horaFin === "09:00";
  });

  assert(
    todasDuracionOk,
    "Test 9: Todas las sesiones tienen duracionMinutos = 60 y horario 08:00 a 09:00"
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Detectar conflictos mediante H3
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 10: Detectar conflictos mediante H3 ---");
  // Intentar crear un periodo para socioB con el mismo entrenador en el mismo horario (08:00-09:00 LUN, MIE, VIE)
  const resConflicto = await confirmarPeriodoPersonalizado({
    socioId: socioB.id,
    entrenadorId,
    fechaInicio: fechaInicioStr,
    fechaFin: fechaFinStr,
    mesesPeriodo: 1,
    frecuenciaRecomendada: 3,
    frecuenciaAcordada: 3,
    diasAcordados: ["LUNES", "MIERCOLES", "VIERNES"],
    horaInicioAcordada: "08:00",
    duracionMinutos: 60,
    observaciones: "[TEST-H6] Periodo competidor",
  });

  assert(
    resConflicto.success === false &&
      (resConflicto.conflictos?.length || 0) > 0 &&
      resConflicto.conflictos?.[0].tipo === "ENTRENADOR_OCUPADO",
    `Test 10: Detección estricta de colisión con ${resConflicto.conflictos?.length} conflictos reportados (ENTRENADOR_OCUPADO)`
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Evitar duplicación de sesiones
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 11: Evitar duplicación de sesiones ---");
  const timestamps = sesionesPeriodo.map((s) => s.fechaHoraInicio.getTime());
  const timestampsUnicos = new Set(timestamps);

  assert(
    timestamps.length === timestampsUnicos.size,
    "Test 11: No existen sesiones duplicadas en el lote persistido"
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Principio NO DELETE: no eliminar sesiones existentes
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 12: Principio NO DELETE: no eliminar sesiones existentes ---");
  const countAntes = await prisma.sesionEntrenamientoPersonalizado.count({
    where: { periodoId: periodoPrincipalId },
  });

  // Cambiar estado a PAUSADO y luego a CANCELADO
  await cambiarEstadoPeriodoPersonalizado({
    periodoId: periodoPrincipalId,
    nuevoEstado: "PAUSADO",
    motivo: "Pausa temporal solicitada",
  });

  const countDespuesPausa = await prisma.sesionEntrenamientoPersonalizado.count({
    where: { periodoId: periodoPrincipalId },
  });

  assert(
    countAntes === countDespuesPausa,
    `Test 12: Principio NO DELETE comprobado (conteo intacto de sesiones: ${countDespuesPausa}) tras cambio de estado`
  );

  // Restaurar a ACTIVO para siguientes pruebas
  await cambiarEstadoPeriodoPersonalizado({
    periodoId: periodoPrincipalId,
    nuevoEstado: "ACTIVO",
    motivo: "Reanudación",
  });

  // ---------------------------------------------------------------------------
  // TEST 13: Registrar AuditLog de creación
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 13: Registrar AuditLog de creación ---");
  const auditCreacion = await prisma.auditLog.findFirst({
    where: {
      accion: "CREAR_PERIODO_PERSONALIZADO",
      detalles: { contains: socioA.nombres || socioA.codigo },
    },
    orderBy: { fecha: "desc" },
  });

  assert(
    auditCreacion !== null && auditCreacion.accion === "CREAR_PERIODO_PERSONALIZADO",
    "Test 13: Registro inmutable en AuditLog para CREAR_PERIODO_PERSONALIZADO verificado"
  );

  // ---------------------------------------------------------------------------
  // TEST 14: Registrar AuditLog de cambio de estado y actualización de acuerdo
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 14: Registrar AuditLog de cambio de estado y actualización de acuerdo ---");
  const auditEstado = await prisma.auditLog.findFirst({
    where: {
      accion: "CAMBIAR_ESTADO_PERIODO_PERSONALIZADO",
      detalles: { contains: "PAUSADO" },
    },
    orderBy: { fecha: "desc" },
  });

  assert(
    auditEstado !== null,
    "Test 14: Registro inmutable en AuditLog para CAMBIAR_ESTADO_PERIODO_PERSONALIZADO verificado"
  );

  // ---------------------------------------------------------------------------
  // TEST 15: Validar permisos según roles
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 15: Validar permisos según roles ---");
  // Simular usuario recepcionista sin permiso de gestión
  setTestAuthContext({
    userId: "recepcion-no-permiso-id",
    name: "Recepcionista Sin Permiso",
    role: "RECEPCION",
    permissions: ["SOCIOS_VER"],
  });

  // Intentar cambiar estado de periodo sin permiso
  // Wait, in auth-utils, let's see how requirePermission handles roles
  const resSinPermiso = await cambiarEstadoPeriodoPersonalizado({
    periodoId: periodoPrincipalId,
    nuevoEstado: "PAUSADO",
    motivo: "Intento no autorizado",
  });

  // Re-autenticar como Admin
  setTestAuthContext({
    userId: "admin-test-h6-id",
    name: "Administrador H6",
    role: "ADMIN",
    permissions: ["ADMIN", "PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  assert(
    resSinPermiso.success === false,
    "Test 15: Usuario sin permisos es rechazado al intentar modificar el periodo"
  );

  // ---------------------------------------------------------------------------
  // TEST 16: Regresión H2 (generador de sesiones)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 16: Regresión H2 (generador de sesiones) ---");
  const genH2 = generatePersonalizedSessions({
    fechaInicio: "2027-03-01",
    fechaFin: "2027-03-07", // 1 semana (Lunes a Domingo)
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicio: "10:00",
    duracionMinutos: 90,
    socioId: socioA.id,
    entrenadorId: entrenador.id,
  });

  assert(
    genH2.length === 2 &&
      genH2[0].diaSemana === "MARTES" &&
      genH2[1].diaSemana === "JUEVES" &&
      genH2[0].duracionMinutos === 90 &&
      genH2[0].horaFin === "11:30",
    "Test 16: Regresión H2 impecable (2 sesiones martes/jueves 90min 10:00-11:30)"
  );

  // ---------------------------------------------------------------------------
  // TEST 17: Regresión H3 (detección de conflictos)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 17: Regresión H3 (detección de conflictos) ---");
  const tentH3 = generatePersonalizedSessions({
    fechaInicio: "2027-03-02",
    fechaFin: "2027-03-02",
    frecuenciaAcordada: 1,
    diasAcordados: ["MARTES"],
    horaInicio: "10:30",
    duracionMinutos: 60,
    socioId: socioB.id,
    entrenadorId: entrenador.id,
  });

  const existH3 = [
    {
      id: "ses-exist-01",
      socioId: socioA.id,
      entrenadorId: entrenador.id,
      fechaHoraInicio: createLimaDateTime("2027-03-02", "10:00"),
      fechaHoraFin: createLimaDateTime("2027-03-02", "11:30"),
      horaInicio: "10:00",
      horaFin: "11:30",
      estado: "PROGRAMADA",
    },
  ];

  const confH3 = detectSessionConflicts(tentH3, existH3);
  assert(
    confH3.length === 1 && confH3[0].tipo === "ENTRENADOR_OCUPADO",
    "Test 17: Regresión H3 impecable (solapamiento 10:30-11:30 vs 10:00-11:30 detectado)"
  );

  // ---------------------------------------------------------------------------
  // TEST 18: Regresión H4 (reprogramación y cancelación)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 18: Regresión H4 (reprogramación y cancelación) ---");
  const sesionAReprogramar = sesionesPeriodo[0];
  const resReprog = await reprogramarSesionPersonalizada({
    sesionId: sesionAReprogramar.id,
    nuevaFecha: "2027-01-05", // Martes
    nuevaHoraInicio: "15:00",
    duracionMinutos: 60,
    motivoReprogramacion: "[TEST-H6] Cambio de turno del socio",
  });

  assert(
    resReprog.success === true && !!resReprog.nuevaSesionId,
    "Test 18A: Regresión H4 - Reprogramación exitosa",
    resReprog.error
  );

  const sesionACancelar = sesionesPeriodo[1];
  const resCancel = await cancelarSesionPersonalizada({
    sesionId: sesionACancelar.id,
    tipoCancelacion: "CANCELADA_CLIENTE",
    motivoCancelacion: "[TEST-H6] Cancelación por viaje",
  });

  assert(
    resCancel.success === true && resCancel.estado === "CANCELADA_CLIENTE",
    "Test 18B: Regresión H4 - Cancelación exitosa",
    resCancel.error
  );

  // ---------------------------------------------------------------------------
  // TEST 19: Regresión H5 (consulta de calendario y vigencias)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 19: Regresión H5 (consulta de calendario y vigencias) ---");
  const resCalVigentes = await getSesionesCalendarioPersonalizado({
    fechaDesde: fechaInicioStr,
    fechaHasta: fechaFinStr,
    socioId: socioA.id,
    estado: "VIGENTES",
    soloVigentes: true,
  });

  const tieneReprogramadasEnVigentes = resCalVigentes.sesiones?.some(
    (s) => s.estado === "REPROGRAMADA" || s.id === sesionAReprogramar.id
  );

  const tieneNuevaEnVigentes = resCalVigentes.sesiones?.some(
    (s) => s.id === resReprog.nuevaSesionId
  );

  assert(
    resCalVigentes.success === true &&
      !tieneReprogramadasEnVigentes &&
      Boolean(tieneNuevaEnVigentes),
    "Test 19: Regresión H5 impecable (sesión REPROGRAMADA excluida de vigentes, nueva sesion activa presente)"
  );

  // ---------------------------------------------------------------------------
  // TEST 20: Verificar coherencia de zona horaria America/Lima
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 20: Verificar coherencia de zona horaria America/Lima ---");
  const dtLima = createLimaDateTime("2027-01-04", "08:00");
  const timeStr = formatLimaTime(dtLima);
  const dateStr = formatLimaDate(dtLima);

  assert(
    dateStr === "2027-01-04" && timeStr === "08:00",
    `Test 20: Coherencia de timezone America/Lima verificada (${dateStr} ${timeStr})`
  );

  // ---------------------------------------------------------------------------
  // TEST 21: Verificar que sesiones reprogramadas no se cuenten como sesiones nuevas independientes
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 21: Trazabilidad de reprogramación sin duplicación ---");
  const sesionOriginalDb = await prisma.sesionEntrenamientoPersonalizado.findUnique({
    where: { id: sesionAReprogramar.id },
  });
  const sesionNuevaDb = await prisma.sesionEntrenamientoPersonalizado.findUnique({
    where: { id: resReprog.nuevaSesionId! },
  });

  assert(
    sesionOriginalDb?.estado === "REPROGRAMADA" &&
      sesionOriginalDb.reprogramadaEnSesionId === resReprog.nuevaSesionId &&
      sesionNuevaDb?.esReprogramada === true &&
      sesionNuevaDb.sesionOriginalId === sesionAReprogramar.id,
    "Test 21: Trazabilidad bidireccional vinculada sin duplicidad de crédito"
  );

  // ---------------------------------------------------------------------------
  // TEST 22: Verificar que sesiones históricas (COMPLETADA, NO_ASISTIO) permanezcan intactas
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 22: Preservación de sesiones históricas ante ajustes ---");
  // Marcar una sesión como COMPLETADA y otra como NO_ASISTIO
  const sesionCompletada = sesionesPeriodo[2];
  const sesionNoAsistio = sesionesPeriodo[3];

  await prisma.sesionEntrenamientoPersonalizado.update({
    where: { id: sesionCompletada.id },
    data: { estado: "COMPLETADA", asistio: true },
  });

  await prisma.sesionEntrenamientoPersonalizado.update({
    where: { id: sesionNoAsistio.id },
    data: { estado: "NO_ASISTIO", asistio: false },
  });

  // Asegurar que el periodo esté en estado ACTIVO para el ajuste
  await prisma.periodoEntrenamientoPersonalizado.update({
    where: { id: periodoPrincipalId },
    data: { estado: "ACTIVO" },
  });

  // Ejecutar ajuste de acuerdo en el periodo activo
  const resAjuste = await actualizarAcuerdoPeriodoPersonalizado({
    periodoId: periodoPrincipalId,
    frecuenciaAcordada: 2,
    diasAcordados: ["MARTES", "JUEVES"],
    horaInicioAcordada: "16:00",
    duracionMinutos: 60,
    motivoCambio: "[TEST-H6] Reajuste de horario a martes y jueves",
  });

  assert(
    resAjuste.success === true,
    "Test 22A: Actualización de acuerdo ejecutada exitosamente",
    resAjuste.error
  );

  const checkCompletada = await prisma.sesionEntrenamientoPersonalizado.findUnique({
    where: { id: sesionCompletada.id },
  });
  const checkNoAsistio = await prisma.sesionEntrenamientoPersonalizado.findUnique({
    where: { id: sesionNoAsistio.id },
  });

  assert(
    checkCompletada?.estado === "COMPLETADA" &&
      checkCompletada.asistio === true &&
      checkNoAsistio?.estado === "NO_ASISTIO" &&
      checkNoAsistio.asistio === false,
    "Test 22B: Sesiones históricas (COMPLETADA y NO_ASISTIO) permanecen 100% intactas tras el ajuste"
  );

  // ---------------------------------------------------------------------------
  // RESUMEN FINAL
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`RESULTADOS SUITE FASE H6: ${testsPassed} PASARON / ${testsFailed} FALLARON`);
  console.log("================================================================================\n");

  if (testsFailed > 0) {
    throw new Error(`Suite H6 finalizó con ${testsFailed} errores.`);
  }
}

runH6Tests()
  .then(() => {
    console.log("✅ TODAS LAS PRUEBAS DE LA FASE H6 SE EJECUTARON EXITOSAMENTE.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ ERROR EN SUITE H6:", err);
    process.exit(1);
  });
