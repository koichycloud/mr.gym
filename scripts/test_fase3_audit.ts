import prisma from "@/lib/prisma";
import { validarDatosParaGeneracionIA } from "@/app/actions/validacion-ia";
import { solicitarGeneracionPlanIA, aprobarGeneracionIA } from "@/app/actions/planes-ia";
import { getMiPlanSocio } from "@/app/actions/portal-socio";
import { collectPlanningData } from "@/lib/ai/data-collector";
import { sanitizePlanningAIInput } from "@/lib/ai/sanitizer";
import { evaluatePlanningSafety } from "@/lib/ai/safety-evaluator";
import { MockAIPlanningProvider } from "@/lib/ai/mock-provider";
import { setTestAuthContext } from "@/lib/auth-utils";

async function runFase3AuditTests() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("MR-GYM — FASE 3: AUDITORÍA DE PRUEBAS FUNCIONALES (A a J)");
  console.log("══════════════════════════════════════════════════════════════════\n");

  process.env.AUTH_BYPASS_FOR_TEST = "true";
  setTestAuthContext({
    userId: "test-admin-audit",
    name: "Admin Audit",
    role: "ADMIN",
    permissions: ["PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  const results: Record<string, { passed: boolean; details: string }> = {};

  // Setup test user con UUID válido
  const trainer = await prisma.personal.findFirst();
  if (!trainer) throw new Error("No hay personal para las pruebas");

  const { randomUUID } = await import("crypto");
  const testSocioId = randomUUID();
  const testSocio = await prisma.socio.create({
    data: {
      id: testSocioId,
      codigo: "F3-" + Math.floor(1000 + Math.random() * 9000),
      nombres: "Test",
      apellidos: "Fase3",
      tipoDocumento: "DNI",
      numeroDocumento: "999" + Math.floor(10000 + Math.random() * 90000),
      sexo: "M",
      fechaNacimiento: new Date("1995-05-15"),
      estado: "ACTIVO",
    },
  });

  try {
    // -------------------------------------------------------------------------
    // ESCENARIO A: Socio sin sexo
    // -------------------------------------------------------------------------
    console.log("▶ [ESCENARIO A] Socio sin sexo...");
    await prisma.socio.update({ where: { id: testSocioId }, data: { sexo: "" } });
    const valA = await validarDatosParaGeneracionIA(testSocioId);
    const genA = await solicitarGeneracionPlanIA(testSocioId, { provider: new MockAIPlanningProvider(), bypassLock: true });
    
    if (!valA.data?.puedeGenerar && genA.success === false && genA.error?.includes("Sexo")) {
      results["ESCENARIO_A"] = { passed: true, details: `Bloqueado correctamente: ${genA.error}` };
      console.log("  ✅ ESCENARIO A APROBADO: Generación bloqueada por falta de sexo.");
    } else {
      results["ESCENARIO_A"] = { passed: false, details: `Fallo: se permitió o mensaje incorrecto. ${JSON.stringify(genA)}` };
      console.log("  ❌ ESCENARIO A FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO B: Socio sin fecha de nacimiento válida (edad < 10 años)
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO B] Socio sin fecha de nacimiento válida...");
    await prisma.socio.update({ where: { id: testSocioId }, data: { sexo: "M", fechaNacimiento: new Date() } });
    const valB = await validarDatosParaGeneracionIA(testSocioId);
    const genB = await solicitarGeneracionPlanIA(testSocioId, { provider: new MockAIPlanningProvider(), bypassLock: true });

    if (!valB.data?.puedeGenerar && genB.success === false && genB.error?.includes("nacimiento")) {
      results["ESCENARIO_B"] = { passed: true, details: `Bloqueado correctamente: ${genB.error}` };
      console.log("  ✅ ESCENARIO B APROBADO: Generación bloqueada por falta de fecha de nacimiento.");
    } else {
      results["ESCENARIO_B"] = { passed: false, details: `Fallo: ${JSON.stringify(genB)}` };
      console.log("  ❌ ESCENARIO B FALLÓ.");
    }

    // Restaurar datos válidos del socio para siguientes pruebas
    await prisma.socio.update({
      where: { id: testSocioId },
      data: { sexo: "M", fechaNacimiento: new Date("1995-05-15") },
    });

    // -------------------------------------------------------------------------
    // ESCENARIO C: Socio sin objetivo principal
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO C] Socio sin objetivo principal...");
    const perfilC = await prisma.perfilPlanificacion.create({
      data: {
        socioId: testSocioId,
        entrenadorId: trainer.id,
        version: 1,
        activo: true,
        objetivoPrincipal: "",
        nivel: "PRINCIPIANTE",
        diasPorSemana: 3,
        duracionMinutos: 60,
      },
    });

    const valC = await validarDatosParaGeneracionIA(testSocioId);
    const genC = await solicitarGeneracionPlanIA(testSocioId, { provider: new MockAIPlanningProvider(), bypassLock: true });

    if (!valC.data?.puedeGenerar && genC.success === false && genC.error?.includes("Objetivo")) {
      results["ESCENARIO_C"] = { passed: true, details: `Bloqueado correctamente: ${genC.error}` };
      console.log("  ✅ ESCENARIO C APROBADO: Generación bloqueada por falta de objetivo principal.");
    } else {
      results["ESCENARIO_C"] = { passed: false, details: `Fallo: ${JSON.stringify(genC)}` };
      console.log("  ❌ ESCENARIO C FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO D: Socio con todos los datos mínimos
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO D] Socio con todos los datos mínimos...");
    await prisma.perfilPlanificacion.update({
      where: { id: perfilC.id },
      data: {
        objetivoPrincipal: "HIPERTROFIA",
        nivel: "INTERMEDIO",
        diasPorSemana: 4,
        duracionMinutos: 60,
        preferenciaAlimenticia: "OMNIVORO",
      },
    });

    const valD = await validarDatosParaGeneracionIA(testSocioId);
    const genD = await solicitarGeneracionPlanIA(testSocioId, { provider: new MockAIPlanningProvider(), bypassLock: true });

    if (valD.data?.puedeGenerar && genD.success && genD.generacionId) {
      results["ESCENARIO_D"] = { passed: true, details: `Generación exitosa con ID: ${genD.generacionId}` };
      console.log("  ✅ ESCENARIO D APROBADO: Generación permitida con datos mínimos.");
    } else {
      results["ESCENARIO_D"] = { passed: false, details: `Fallo: ${JSON.stringify(genD)}` };
      console.log("  ❌ ESCENARIO D FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO E: Socio con alergia declarada
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO E] Socio con alergia declarada...");
    await prisma.perfilPlanificacion.update({
      where: { id: perfilC.id },
      data: { alergiasDeclaradas: "Mani, Frutos secos" },
    });

    const rawE = await collectPlanningData(testSocioId);
    const sanitizedE = sanitizePlanningAIInput(rawE);
    const safetyE = evaluatePlanningSafety(sanitizedE);

    if (
      sanitizedE.alimentacionDeclarada.alergiasIntolerancias?.includes("Mani") &&
      safetyE.requiresHumanReview &&
      safetyE.alergiasDetectadasYMitigadas.some((a) => a.includes("Mani"))
    ) {
      results["ESCENARIO_E"] = { passed: true, details: "Alergia presente en contexto y evaluador de seguridad activado." };
      console.log("  ✅ ESCENARIO E APROBADO: Alergia llega al contexto y dispara revisión de seguridad.");
    } else {
      results["ESCENARIO_E"] = { passed: false, details: "Fallo en procesamiento de alergia." };
      console.log("  ❌ ESCENARIO E FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO F: Socio con lesión declarada
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO F] Socio con lesión declarada...");
    await prisma.perfilPlanificacion.update({
      where: { id: perfilC.id },
      data: { lesionesReportadas: "Tendinitis en hombro derecho" },
    });

    const rawF = await collectPlanningData(testSocioId);
    const sanitizedF = sanitizePlanningAIInput(rawF);
    const safetyF = evaluatePlanningSafety(sanitizedF);

    if (
      sanitizedF.entrenamiento.lesionesDeclaradas?.includes("Tendinitis") &&
      safetyF.requiresHumanReview &&
      safetyF.banderasAdvertencia.some((b) => b.includes("Tendinitis"))
    ) {
      results["ESCENARIO_F"] = { passed: true, details: "Lesión presente en contexto y evaluador de seguridad activado." };
      console.log("  ✅ ESCENARIO F APROBADO: Lesión llega al contexto y dispara revisión de seguridad.");
    } else {
      results["ESCENARIO_F"] = { passed: false, details: "Fallo en procesamiento de lesión." };
      console.log("  ❌ ESCENARIO F FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO G: Propuesta generada no es plan activo
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO G] Propuesta generada (Human-in-the-loop)...");
    const genG = await solicitarGeneracionPlanIA(testSocioId, { provider: new MockAIPlanningProvider(), bypassLock: true });
    const planesG = await prisma.planEntrenamiento.findMany({ where: { socioId: testSocioId, activo: true } });

    if (genG.success && genG.generacionId && planesG.length === 0) {
      results["ESCENARIO_G"] = { passed: true, details: "Propuesta en estado GENERADO sin activar planes automáticamente." };
      console.log("  ✅ ESCENARIO G APROBADO: La propuesta no se convirtió automáticamente en plan activo.");
    } else {
      results["ESCENARIO_G"] = { passed: false, details: `Fallo: se activaron ${planesG.length} planes sin aprobación.` };
      console.log("  ❌ ESCENARIO G FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO H: Entrenador aprueba propuesta
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO H] Entrenador aprueba propuesta...");
    const apH = await aprobarGeneracionIA({
      generacionId: genG.generacionId!,
      confirmacionRevisionHumana: true,
      observacionesEntrenador: "Aprobado por entrenador en auditoría Fase 3",
    });

    const planesH = await prisma.planEntrenamiento.findFirst({ where: { socioId: testSocioId, activo: true } });
    const alimentacionH = await prisma.planAlimentacion.findFirst({ where: { socioId: testSocioId, activo: true } });

    if (apH.success && planesH && alimentacionH) {
      results["ESCENARIO_H"] = { passed: true, details: `Planes materializados: Entrenamiento=${planesH.id}, Alimentacion=${alimentacionH.id}` };
      console.log("  ✅ ESCENARIO H APROBADO: Propuesta aprobada y materializada en planes activos.");
    } else {
      results["ESCENARIO_H"] = { passed: false, details: `Fallo: ${JSON.stringify(apH)}` };
      console.log("  ❌ ESCENARIO H FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO I: Socio consulta /mi-plan
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO I] Socio consulta /mi-plan...");
    setTestAuthContext({ userId: testSocioId, name: "Test Socio", role: "SOCIO", permissions: [] });
    const portalI = await getMiPlanSocio();

    if (
      portalI.success &&
      portalI.data?.planEntrenamiento?.id === planesH?.id &&
      portalI.data?.planAlimentacion?.id === alimentacionH?.id
    ) {
      results["ESCENARIO_I"] = { passed: true, details: "Portal del socio muestra exclusivamente los planes activos aprobados." };
      console.log("  ✅ ESCENARIO I APROBADO: El socio ve solo su plan activo aprobado.");
    } else {
      results["ESCENARIO_I"] = { passed: false, details: `Fallo: ${JSON.stringify(portalI)}` };
      console.log("  ❌ ESCENARIO I FALLÓ.");
    }

    // -------------------------------------------------------------------------
    // ESCENARIO J: Medida 'muslos' registrada llega al contexto
    // -------------------------------------------------------------------------
    console.log("\n▶ [ESCENARIO J] Medida 'muslos' registrada...");
    setTestAuthContext({ userId: "test-admin", name: "Admin", role: "ADMIN", permissions: ["PLANES_PERSONALIZADOS_GESTIONAR"] });

    await prisma.medidaFisica.create({
      data: {
        socioId: testSocioId,
        fecha: new Date(),
        peso: 78.5,
        altura: 175,
        porcentajeGrasa: 16.2,
        porcentajeMusculo: 42.0,
        pecho: 102,
        cintura: 84,
        muslos: 58.5,
        cuadriceps: 57.0,
        pantorrillas: 38.0,
      },
    });

    const rawJ = await collectPlanningData(testSocioId);
    const sanitizedJ = sanitizePlanningAIInput(rawJ);

    if (
      rawJ.medidaActual?.muslos === 58.5 &&
      sanitizedJ.medidasActuales?.perimetrosCm?.muslos === 58.5
    ) {
      results["ESCENARIO_J"] = { passed: true, details: `muslos=58.5cm presente en data-collector y en sanitized.medidasActuales.perimetrosCm` };
      console.log("  ✅ ESCENARIO J APROBADO: 'muslos' registrado llega íntegramente al contexto IA.");
    } else {
      results["ESCENARIO_J"] = { passed: false, details: `Fallo: muslos no presente o incorrecto: ${JSON.stringify(sanitizedJ.medidasActuales?.perimetrosCm)}` };
      console.log("  ❌ ESCENARIO J FALLÓ.");
    }

  } finally {
    // Limpieza de datos de prueba temporales
    await prisma.planEntrenamiento.deleteMany({ where: { socioId: testSocioId } });
    await prisma.planAlimentacion.deleteMany({ where: { socioId: testSocioId } });
    await prisma.generacionIA.deleteMany({ where: { socioId: testSocioId } });
    await prisma.medidaFisica.deleteMany({ where: { socioId: testSocioId } });
    await prisma.perfilPlanificacion.deleteMany({ where: { socioId: testSocioId } });
    await prisma.socio.delete({ where: { id: testSocioId } });
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("RESUMEN DE AUDITORÍA FASE 3:");
  console.log("══════════════════════════════════════════════════════════════════");
  for (const [k, v] of Object.entries(results)) {
    console.log(`${v.passed ? "✅" : "❌"} ${k}: ${v.details}`);
  }
}

runFase3AuditTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
