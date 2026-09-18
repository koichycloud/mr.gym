import prisma from "@/lib/prisma";
import {
  createEjercicio,
  updateEjercicio,
  toggleEjercicioActivo,
  getEjercicios,
  getEjercicioById,
} from "@/app/actions/ejercicios";
import { ajustarOperativamentePlanEntrenamiento } from "@/app/actions/operaciones-planes";
import { getMiPlanSocio } from "@/app/actions/portal-socio";
import { setTestAuthContext } from "@/lib/auth-utils";
import { randomUUID } from "crypto";

async function runFase6Tests() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("MR-GYM — FASE 6: PRUEBAS DE BIBLIOTECA DE EJERCICIOS Y NIVELES");
  console.log("══════════════════════════════════════════════════════════════════\n");

  process.env.AUTH_BYPASS_FOR_TEST = "true";
  setTestAuthContext({
    userId: "test-admin-fase6",
    name: "Admin Fase 6",
    role: "ADMIN",
    permissions: ["PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  const testExerciseName = "Press Militar con Mancuernas Test-" + Date.now();
  let createdExerciseId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 1. CREAR EJERCICIO EN EL CATÁLOGO
    // -------------------------------------------------------------------------
    console.log("▶ [PRUEBA 1] Creación de ejercicio en la biblioteca...");
    const createRes = await createEjercicio({
      nombre: testExerciseName,
      descripcion: "Ejercicio fundamental para el desarrollo del deltoides anterior y lateral.",
      instrucciones: "Sentado en banco a 75-80 grados, empujar mancuernas verticalmente sin bloquear codos.",
      grupoMuscular: "HOMBROS",
      grupoMuscularSecundario: "BRAZOS",
      nivel: "INTERMEDIO",
      tipoEjercicio: "FUERZA",
      equipamientoRequerido: "MANCUERNAS_BANCOS",
      restricciones: "Evitar en caso de pinzamiento subacromial agudo.",
      activo: true,
    });

    if (createRes.success && createRes.ejercicio) {
      createdExerciseId = createRes.ejercicio.id;
      console.log(`  ✅ PRUEBA 1 APROBADA: Ejercicio creado con ID: ${createdExerciseId}`);
    } else {
      throw new Error("Fallo al crear ejercicio: " + createRes.error);
    }

    // -------------------------------------------------------------------------
    // 2. MODIFICAR EJERCICIO
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 2] Modificación de ejercicio...");
    const updateRes = await updateEjercicio({
      id: createdExerciseId!,
      nombre: testExerciseName + " (Modificado)",
      descripcion: "Descripción actualizada con recomendaciones de tempo.",
      nivel: "AVANZADO",
    });

    if (updateRes.success && updateRes.ejercicio?.nivel === "AVANZADO") {
      console.log("  ✅ PRUEBA 2 APROBADA: Ejercicio actualizado a nivel AVANZADO.");
    } else {
      throw new Error("Fallo al actualizar ejercicio: " + updateRes.error);
    }

    // -------------------------------------------------------------------------
    // 3. SOFT TOGGLE (ACTIVAR / DESACTIVAR SIN DELETE FÍSICO)
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 3] Desactivación lógica (Soft Toggle)...");
    const deactRes = await toggleEjercicioActivo(createdExerciseId!, false);
    const checkDeact = await getEjercicioById(createdExerciseId!);

    if (deactRes.success && checkDeact.ejercicio?.activo === false) {
      console.log("  ✅ PRUEBA 3 APROBADA: Ejercicio desactivado lógicamente sin DELETE físico.");
    } else {
      throw new Error("Fallo en soft deactivate: " + deactRes.error);
    }

    // Reactivar para siguientes pruebas
    await toggleEjercicioActivo(createdExerciseId!, true);

    // -------------------------------------------------------------------------
    // 4. CONSULTA Y FILTRADO AVANZADO
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 4] Filtrado de biblioteca por Grupo Muscular y Nivel...");
    const filterRes = await getEjercicios({
      grupoMuscular: "HOMBROS",
      nivel: "AVANZADO",
      activo: true,
    });

    const found = filterRes.ejercicios?.some((e) => e.id === createdExerciseId);
    if (filterRes.success && found) {
      console.log(`  ✅ PRUEBA 4 APROBADA: Ejercicio encontrado mediante filtros (Total coincidentes: ${filterRes.ejercicios?.length}).`);
    } else {
      throw new Error("Fallo en filtrado de ejercicios.");
    }

    // -------------------------------------------------------------------------
    // 5. VINCULACIÓN Y AJUSTE OPERATIVO EN RUTINA DE 6 NIVELES
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 5] Ajuste operativo de rutina con ejercicio de catálogo...");
    const trainer = await prisma.personal.findFirst({ where: { activo: true } });
    if (!trainer) throw new Error("No hay personal");

    const socioTestId = randomUUID();
    const socioTest = await prisma.socio.create({
      data: {
        id: socioTestId,
        codigo: "F6-" + Math.floor(1000 + Math.random() * 9000),
        nombres: "Atleta",
        apellidos: "Fase Seis",
        tipoDocumento: "DNI",
        numeroDocumento: "777" + Math.floor(10000 + Math.random() * 90000),
        sexo: "M",
        fechaNacimiento: new Date("1993-08-12"),
        estado: "ACTIVO",
      },
    });

    const perfilTest = await prisma.perfilPlanificacion.create({
      data: {
        socioId: socioTestId,
        entrenadorId: trainer.id,
        version: 1,
        activo: true,
        objetivoPrincipal: "HIPERTROFIA",
        nivel: "INTERMEDIO",
        diasPorSemana: 3,
        duracionMinutos: 60,
      },
    });

    const planTest = await prisma.planEntrenamiento.create({
      data: {
        socioId: socioTestId,
        perfilPlanificacionId: perfilTest.id,
        entrenadorId: trainer.id,
        version: 1,
        activo: true,
        estado: "APROBADO",
        titulo: "Plan Periodizado 6 Niveles Test",
        contenido: {
          nivelesProgresivos: [
            {
              numeroNivel: 1,
              nombre: "Nivel 1 - Adaptación",
              rutinas: [
                {
                  dia: "LUNES",
                  nombreSesion: "Torso Fuerza",
                  ejercicios: [
                    {
                      nombre: "Press Militar Convencional",
                      series: 3,
                      repeticiones: "10-12",
                      descansoSegundos: 90,
                      observaciones: "Controlar bajada en 2 segundos",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    // Ajustar operativamente el ejercicio de la rutina
    const adjustRes = await ajustarOperativamentePlanEntrenamiento({
      socioId: socioTestId,
      planId: planTest.id,
      nivelIdx: 0,
      rutinaIdx: 0,
      ejercicioIdx: 0,
      nombre: testExerciseName + " (Modificado)",
      ejercicioId: createdExerciseId!,
      series: 4,
      repeticiones: "8-10",
      descansoSegundos: 120,
      observaciones: "Subir carga progresiva RPE 8",
    });

    const planModificado = await prisma.planEntrenamiento.findUnique({ where: { id: planTest.id } });
    const ejEnPlan = (planModificado?.contenido as any)?.nivelesProgresivos?.[0]?.rutinas?.[0]?.ejercicios?.[0];

    if (
      adjustRes.success &&
      ejEnPlan?.nombre.includes("Modificado") &&
      ejEnPlan?.ejercicioId === createdExerciseId &&
      ejEnPlan?.series === 4 &&
      ejEnPlan?.descansoSegundos === 120
    ) {
      console.log("  ✅ PRUEBA 5 APROBADA: Ejercicio de biblioteca vinculado y ajustado en la rutina del plan.");
    } else {
      throw new Error("Fallo al ajustar ejercicio en rutina: " + JSON.stringify(adjustRes));
    }

    // -------------------------------------------------------------------------
    // 6. VERIFICACIÓN DE AUDITLOG
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 6] Verificación de eventos inmutables en AuditLog...");
    const logs = await prisma.auditLog.findMany({
      where: {
        accion: { in: ["CREAR_EJERCICIO", "MODIFICAR_EJERCICIO", "DESACTIVAR_EJERCICIO", "ACTIVAR_EJERCICIO"] },
      },
      orderBy: { fecha: "desc" },
      take: 4,
    });

    if (logs.length >= 3) {
      console.log(`  ✅ PRUEBA 6 APROBADA: AuditLogs registrados correctamente (${logs.length} eventos).`);
    } else {
      throw new Error("No se registraron los eventos esperados en AuditLog.");
    }

    // -------------------------------------------------------------------------
    // 7. COMPATIBILIDAD CON PORTAL DEL SOCIO
    // -------------------------------------------------------------------------
    console.log("\n▶ [PRUEBA 7] Consulta de rutina desde el portal del socio (/mi-plan)...");
    setTestAuthContext({ userId: socioTestId, name: "Atleta Test", role: "SOCIO", permissions: [] });
    const portalRes = await getMiPlanSocio();

    if (portalRes.success && portalRes.data?.planEntrenamiento?.id === planTest.id) {
      console.log("  ✅ PRUEBA 7 APROBADA: El portal del socio lee la rutina actualizada sin alteraciones.");
    } else {
      throw new Error("Fallo al consultar /mi-plan: " + JSON.stringify(portalRes));
    }

    // Limpieza de datos temporales
    await prisma.planEntrenamiento.delete({ where: { id: planTest.id } });
    await prisma.perfilPlanificacion.delete({ where: { id: perfilTest.id } });
    await prisma.socio.delete({ where: { id: socioTestId } });

  } finally {
    if (createdExerciseId) {
      // Desactivar ejercicio de prueba (no DELETE físico)
      await prisma.ejercicio.update({
        where: { id: createdExerciseId },
        data: { activo: false },
      });
    }
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("RESUMEN DE PRUEBAS FASE 6: TODAS APROBADAS AL 100%");
  console.log("══════════════════════════════════════════════════════════════════");
}

runFase6Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
