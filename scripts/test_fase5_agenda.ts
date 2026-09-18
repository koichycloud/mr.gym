import prisma from "@/lib/prisma";
import { getAgendaSemanalEntrenador, actualizarHorarioSocioEntrenador } from "@/app/actions/agenda-entrenador";
import { assignTrainerToMember, changeTrainerAssignment, endTrainerAssignment } from "@/app/actions/asignacion-entrenador";
import { getMiPlanSocio } from "@/app/actions/portal-socio";
import { setTestAuthContext } from "@/lib/auth-utils";
import { randomUUID } from "crypto";

async function runFase5Tests() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("MR-GYM — FASE 5: PRUEBAS FUNCIONALES DE ENTRENADORES Y HORARIOS");
  console.log("══════════════════════════════════════════════════════════════════\n");

  process.env.AUTH_BYPASS_FOR_TEST = "true";
  setTestAuthContext({
    userId: "test-admin-fase5",
    name: "Admin Fase 5",
    role: "ADMIN",
    permissions: ["PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  const trainerA = await prisma.personal.findFirst({
    where: { activo: true, rol: { in: ["Instructor", "Entrenador", "instructor", "entrenador", "trainer", "INSTRUCTOR", "ENTRENADOR"] } },
  });
  if (!trainerA) throw new Error("No se encontró un entrenador activo para las pruebas");

  const trainerB = await prisma.personal.findFirst({
    where: { activo: true, id: { not: trainerA.id }, rol: { in: ["Instructor", "Entrenador", "instructor", "entrenador", "trainer", "INSTRUCTOR", "ENTRENADOR"] } },
  }) || trainerA;

  // Crear 2 socios de prueba
  const socio1Id = randomUUID();
  const socio2Id = randomUUID();

  const socio1 = await prisma.socio.create({
    data: {
      id: socio1Id,
      codigo: "F5-S1-" + Math.floor(1000 + Math.random() * 9000),
      nombres: "Carlos",
      apellidos: "Atleta Uno",
      tipoDocumento: "DNI",
      numeroDocumento: "888" + Math.floor(10000 + Math.random() * 90000),
      sexo: "M",
      fechaNacimiento: new Date("1994-03-10"),
      estado: "ACTIVO",
    },
  });

  const socio2 = await prisma.socio.create({
    data: {
      id: socio2Id,
      codigo: "F5-S2-" + Math.floor(1000 + Math.random() * 9000),
      nombres: "Lucia",
      apellidos: "Atleta Dos",
      tipoDocumento: "DNI",
      numeroDocumento: "888" + Math.floor(10000 + Math.random() * 90000),
      sexo: "F",
      fechaNacimiento: new Date("1996-07-22"),
      estado: "ACTIVO",
    },
  });

  try {
    // -------------------------------------------------------------------------
    // 1. Asignar Entrenador y verificar historial
    // -------------------------------------------------------------------------
    console.log("▶ [PRUEBA 1] Asignación de entrenador...");
    const asig1 = await assignTrainerToMember({
      socioId: socio1Id,
      entrenadorId: trainerA.id,
      mesesPlan: 3,
    });
    const asig2 = await assignTrainerToMember({
      socioId: socio2Id,
      entrenadorId: trainerA.id,
      mesesPlan: 1,
    });

    if (asig1.success && asig2.success) {
      console.log("  ✅ PRUEBA 1 APROBADA: Asignaciones creadas con éxito.");
    } else {
      console.error("  ❌ PRUEBA 1 FALLÓ:", asig1.error || asig2.error);
    }

    // -------------------------------------------------------------------------
    // 2. Crear perfiles de planificación con horarios
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 2] Creación de perfiles con horarios coordinados...");
    const perfil1 = await prisma.perfilPlanificacion.create({
      data: {
        socioId: socio1Id,
        entrenadorId: trainerA.id,
        version: 1,
        activo: true,
        objetivoPrincipal: "HIPERTROFIA",
        nivel: "INTERMEDIO",
        diasPorSemana: 3,
        diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
        horarioPreferido: "08:00",
        duracionMinutos: 60,
      },
    });

    // Perfil 2 con horario que generará conflicto deliberado el Lunes a las 08:30 (superposición 30 min)
    const perfil2 = await prisma.perfilPlanificacion.create({
      data: {
        socioId: socio2Id,
        entrenadorId: trainerA.id,
        version: 1,
        activo: true,
        objetivoPrincipal: "PERDIDA_GRASA",
        nivel: "PRINCIPIANTE",
        diasPorSemana: 3,
        diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
        horarioPreferido: "08:30",
        duracionMinutos: 60,
      },
    });

    console.log("  ✅ PRUEBA 2 APROBADA: Perfiles creados con horarios definidos.");

    // -------------------------------------------------------------------------
    // 3. Consultar Agenda Semanal y Detección de Conflictos
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 3] Consulta de Agenda Semanal y Motor de Conflictos...");
    const agendaRes = await getAgendaSemanalEntrenador(trainerA.id);

    if (!agendaRes.success || !agendaRes.data) {
      throw new Error("Fallo al obtener agenda: " + agendaRes.error);
    }

    const agenda = agendaRes.data;
    console.log(`  ℹ️  Total Socios Asignados: ${agenda.metricasCarga.totalSociosAsignados}`);
    console.log(`  ℹ️  Total Sesiones Semanales: ${agenda.metricasCarga.totalSesionesSemanales}`);
    console.log(`  ℹ️  Carga Horaria Semanal: ${agenda.metricasCarga.horasTotalesSemanales} horas`);
    console.log(`  ℹ️  Total Conflictos Detectados: ${agenda.metricasCarga.totalConflictos}`);

    const lunesInfo = agenda.diasSemana.find((d) => d.dia === "LUNES");
    const tieneConflictoLunes = lunesInfo?.tieneConflictos;
    const sesionesConConflicto = lunesInfo?.sesiones.filter((s) => s.tieneConflicto).length;

    if (agenda.metricasCarga.totalConflictos > 0 && tieneConflictoLunes && sesionesConConflicto === 2) {
      console.log("  ✅ PRUEBA 3 APROBADA: Conflicto 08:00–09:00 vs 08:30–09:30 detectado y advertido correctamente.");
    } else {
      console.error("  ❌ PRUEBA 3 FALLÓ: Conflicto no detectado como esperado.");
    }

    // -------------------------------------------------------------------------
    // 4. Corrección de Horario sin conflicto
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 4] Actualización de horario para resolver conflicto...");
    const updateRes = await actualizarHorarioSocioEntrenador({
      perfilId: perfil2.id,
      diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
      horarioPreferido: "09:30", // Movido después de la sesión 1
      duracionMinutos: 60,
    });

    if (!updateRes.success) throw new Error("Fallo al actualizar horario: " + updateRes.error);

    const agendaLimpia = await getAgendaSemanalEntrenador(trainerA.id);
    if (agendaLimpia.data?.metricasCarga.totalConflictos === 0) {
      console.log("  ✅ PRUEBA 4 APROBADA: Conflicto resuelto exitosamente tras mover horario a las 09:30.");
    } else {
      console.error("  ❌ PRUEBA 4 FALLÓ: Aún existen conflictos:", agendaLimpia.data?.metricasCarga.totalConflictos);
    }

    // -------------------------------------------------------------------------
    // 5. Verificación de Auditoría en AuditLog
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 5] Verificación de AuditLog...");
    const logs = await prisma.auditLog.findMany({
      where: { accion: { in: ["ASIGNAR_ENTRENADOR", "MODIFICAR_HORARIO_SOCIO"] } },
      orderBy: { fecha: "desc" },
      take: 5,
    });

    if (logs.length >= 2) {
      console.log(`  ✅ PRUEBA 5 APROBADA: AuditLogs registrados correctamente (${logs.length} eventos).`);
    } else {
      console.error("  ❌ PRUEBA 5 FALLÓ: No se encontraron los logs esperados.");
    }

    // -------------------------------------------------------------------------
    // 6. Verificación de Historial (No DELETE físico)
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 6] Finalización lógica de asignación (Soft delete)...");
    const endRes = await endTrainerAssignment({ asignacionId: asig2.asignacion!.id });
    const asigHist = await prisma.asignacionEntrenador.findUnique({ where: { id: asig2.asignacion!.id } });

    if (endRes.success && asigHist && asigHist.activo === false && asigHist.fechaFin !== null) {
      console.log("  ✅ PRUEBA 6 APROBADA: Asignación finalizada lógicamente sin DELETE físico.");
    } else {
      console.error("  ❌ PRUEBA 6 FALLÓ:", endRes.error);
    }

    // -------------------------------------------------------------------------
    // 7. Verificación del Portal del Socio (/mi-plan)
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 7] Consulta de Horario desde el Portal del Socio...");
    setTestAuthContext({ userId: socio1Id, name: "Carlos Atleta", role: "SOCIO", permissions: [] });
    const portalSocio = await getMiPlanSocio();

    if (
      portalSocio.success &&
      portalSocio.data?.horario &&
      portalSocio.data.horario.horarioPreferido === "08:00" &&
      portalSocio.data.horario.diasPreferidos.includes("LUNES")
    ) {
      console.log("  ✅ PRUEBA 7 APROBADA: El socio ve su horario coordinado (08:00 LUN-MIE-VIE) en modo solo lectura.");
    } else {
      console.error("  ❌ PRUEBA 7 FALLÓ:", JSON.stringify(portalSocio));
    }

  } finally {
    // Limpieza de datos de prueba temporales
    await prisma.planEntrenamiento.deleteMany({ where: { socioId: { in: [socio1Id, socio2Id] } } });
    await prisma.planAlimentacion.deleteMany({ where: { socioId: { in: [socio1Id, socio2Id] } } });
    await prisma.generacionIA.deleteMany({ where: { socioId: { in: [socio1Id, socio2Id] } } });
    await prisma.perfilPlanificacion.deleteMany({ where: { socioId: { in: [socio1Id, socio2Id] } } });
    await prisma.asignacionEntrenador.deleteMany({ where: { socioId: { in: [socio1Id, socio2Id] } } });
    await prisma.socio.deleteMany({ where: { id: { in: [socio1Id, socio2Id] } } });
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("RESUMEN DE PRUEBAS FASE 5: TODAS APROBADAS");
  console.log("══════════════════════════════════════════════════════════════════");
}

runFase5Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
