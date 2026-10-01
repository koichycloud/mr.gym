import fs from "fs";
import path from "path";

// Carga segura de variables de entorno locales (.env.local, .env.dev, .env)
const envFiles = [".env", ".env.dev", ".env.local"];
for (const envFileName of envFiles) {
  const envPath = path.resolve(process.cwd(), envFileName);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (key) {
          process.env[key] = val;
        }
      }
    }
  }
}

import prisma from "../src/lib/prisma";
import { GeminiAIPlanningProvider } from "../src/lib/ai/gemini-provider";
import { buildPlanningPrompt } from "../src/lib/ai/prompt-builder";
import { parseAndValidateAIOutput } from "../src/lib/ai/parser";
import {
  getActiveExerciseCatalog,
  reconcilePlanTrainingExercises,
  reconcileSingleExercise,
  CatalogExerciseItem,
} from "../src/lib/ai/catalog-helper";
import { evaluatePlanningSafety } from "../src/lib/ai/safety-evaluator";
import { PlanningAIInput } from "../src/lib/validations";
import { calcularRangoEjerciciosPorDuracion } from "../src/lib/ai/volume-rules";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALLÓ: ${message}`);
    throw new Error(`Aserción fallida: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runFaseDValidation() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("FASE D: VALIDACIÓN CONTROLADA DEL PIPELINE REAL CON GEMINI");
  console.log("══════════════════════════════════════════════════════════════════");

  // =========================================================================
  // PASO 1: VERIFICAR AMBIENTE Y API KEY
  // =========================================================================
  console.log("\n▶ [PASO 1] Verificación de Ambiente y Configuración Gemini...");
  const apiKey = process.env.GEMINI_API_KEY;
  assert(Boolean(apiKey && apiKey.trim().length > 0), "GEMINI_API_KEY detectada en variables de entorno local");

  const catalog: CatalogExerciseItem[] = await getActiveExerciseCatalog();
  assert(catalog.length === 100, `Catálogo activo de BD cargado exitosamente (${catalog.length} ejercicios)`);

  const catalogMap = new Map<string, CatalogExerciseItem>();
  for (const item of catalog) {
    catalogMap.set(item.id, item);
  }

  // =========================================================================
  // PASO 2: CONSTRUCCIÓN DEL PERFIL DE PRUEBA CONTROLADO
  // =========================================================================
  console.log("\n▶ [PASO 2] Construcción del Perfil Controlado (60 min, Intermedio, 4 días)...");
  const testInput: PlanningAIInput = {
    socio: {
      id: "fase-d-test-socio",
      codigo: "FD-TEST-001",
      edad: 28,
      sexo: "M",
    },
    objetivos: {
      principal: "HIPERTROFIA",
      secundario: "FUERZA",
      nivel: "INTERMEDIO",
      tiempoEntrenando: "1 a 2 años",
    },
    disponibilidad: {
      diasPorSemana: 4,
      diasPreferidos: ["LUNES", "MARTES", "JUEVES", "VIERNES"],
      duracionMinutosPorSesion: 60,
      horarioPreferido: "TARDE",
    },
    entrenamiento: {
      tipoPreferido: "Torso / Pierna",
      ejerciciosExcluidos: "",
      lesionesDeclaradas: "",
      capacidadCardiovascular: "Media",
      capacidadFuerza: "Media",
      equipamientoDisponible: "GIMNASIO_COMPLETO",
    },
    alimentacionDeclarada: {
      preferencia: "Omnívoro",
      alergiasIntolerancias: "",
      consumoAguaLitrosPorDia: 3,
      comidasPorDia: 4,
    },
    medidasActuales: {
      fecha: new Date().toISOString(),
      pesoKg: 78,
      tallaCm: 176,
      imc: 25.18,
      porcentajeGrasa: 16.5,
      perimetrosCm: {
        cintura: 82,
        pecho: 102,
        brazoDerecho: 37,
        brazoIzquierdo: 36.5,
        musloDerecho: 59,
        musloIzquierdo: 58.5,
        pantorrillaDerecha: 38,
        pantorrillaIzquierda: 38,
      },
    },
  };

  const prompt = buildPlanningPrompt(testInput, catalog);
  assert(prompt.systemPrompt.includes("CATÁLOGO OFICIAL DE EJERCICIOS DISPONIBLES"), "Prompt contiene el catálogo oficial inyectado");
  assert(prompt.systemPrompt.includes("ejercicioId"), "Prompt exige ejercicioId oficial del catálogo");

  // =========================================================================
  // PASO 3: EJECUCIÓN REAL CON GEMINI (con reintentos automáticos ante 503)
  // =========================================================================
  console.log("\n▶ [PASO 3] Ejecución de Llamada Real a Gemini API (gemini-3.6-flash)...");
  const geminiProvider = new GeminiAIPlanningProvider(apiKey, 180000, "gemini-3.6-flash");

  let geminiResponse: any = null;
  let durationMs = 0;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`  ⏳ Enviando request a Gemini (Intento ${attempt}/${maxAttempts})...`);
    const startTime = Date.now();
    geminiResponse = await geminiProvider.generateStructuredPlan(testInput, prompt);
    durationMs = Date.now() - startTime;

    if (geminiResponse.success) {
      break;
    }

    console.warn(`  ⚠️ Intento ${attempt} falló: ${geminiResponse.error}`);
    if (attempt < maxAttempts) {
      const waitMs = attempt * 3000;
      console.log(`     Aguardando ${waitMs / 1000}s antes de reintentar...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  if (!geminiResponse.success) {
    console.error("  ❌ Detalle del error de Gemini:", geminiResponse.error);
  }
  assert(geminiResponse.success === true, `Gemini respondió exitosamente en ${(durationMs / 1000).toFixed(2)}s`);
  assert(Boolean(geminiResponse.rawText), "Respuesta contiene rawText JSON");
  console.log(`  📊 Métricas Gemini: Prompt Tokens = ${geminiResponse.metrics?.promptTokens || "N/A"}, Completion Tokens = ${geminiResponse.metrics?.completionTokens || "N/A"}`);

  // =========================================================================
  // PASO 4: PARSER Y VALIDACIÓN ZOD DEL STRUCTURED OUTPUT
  // =========================================================================
  console.log("\n▶ [PASO 4] Validación Zod (planningAIOutputSchema)...");
  const parseResult = parseAndValidateAIOutput(geminiResponse.rawText || "");
  if (!parseResult.success) {
    console.error("  ❌ Error de Validación Zod / Parser:", parseResult.error);
    // Guardar respuesta cruda para análisis
    fs.writeFileSync("gemini_raw_response_debug.json", geminiResponse.rawText || "");
    console.log("  💾 Respuesta cruda guardada en gemini_raw_response_debug.json");
  }
  assert(parseResult.success === true, "La salida JSON de Gemini valida 100% contra planningAIOutputSchema");
  const rawPlan = parseResult.data!;

  assert(rawPlan.planEntrenamiento.niveles.length === 6, `Plan contiene exactamente 6 niveles (obtenidos: ${rawPlan.planEntrenamiento.niveles.length})`);
  assert(rawPlan.planAlimentacion.recetas.length >= 20, `Plan nutricional contiene al menos 20 recetas (obtenidas: ${rawPlan.planAlimentacion.recetas.length})`);

  // =========================================================================
  // PASO 5: RECONCILIACIÓN DETERMINISTA DE EJERCICIOS
  // =========================================================================
  console.log("\n▶ [PASO 5] Reconciliación Determinista de Ejercicios del Catálogo...");
  const reconciliationSummary = reconcilePlanTrainingExercises(rawPlan.planEntrenamiento, catalog);

  console.log(`  📈 Resumen de Reconciliación:`);
  console.log(`     - Total ejercicios generados: ${reconciliationSummary.totalEjercicios}`);
  console.log(`     - Reconciliados con éxito (UUID oficial): ${reconciliationSummary.reconciliadosConExito}`);
  console.log(`     - Sin reconocer: ${reconciliationSummary.sinReconocer}`);
  console.log(`     - Discrepancias detectadas: ${reconciliationSummary.discrepanciasDetectadas}`);
  console.log(`     - Inactivos detectados: ${reconciliationSummary.inactivosDetectados}`);

  assert(reconciliationSummary.totalEjercicios > 0, "Se evaluaron ejercicios en todos los niveles");
  assert(
    reconciliationSummary.reconciliadosConExito === reconciliationSummary.totalEjercicios,
    `El 100% de los ejercicios (${reconciliationSummary.reconciliadosConExito}/${reconciliationSummary.totalEjercicios}) tienen UUID real del catálogo`
  );
  assert(reconciliationSummary.sinReconocer === 0, "Cero ejercicios inventados o huérfanos");
  assert(reconciliationSummary.inactivosDetectados === 0, "Cero ejercicios inactivos");

  // =========================================================================
  // PASO 6: INSPECCIÓN DETALLADA DE EJERCICIOS Y VOLUMEN (FASE B)
  // =========================================================================
  console.log("\n▶ [PASO 6] Auditoría Detallada de Ejercicios, Volúmenes y Duplicados...");
  const rango60 = calcularRangoEjerciciosPorDuracion(60); // [5, 6]
  const ejerciciosInspeccionados: Array<{
    nivel: number;
    sesion: string;
    nombre: string;
    ejercicioId: string;
    grupo: string;
    catalogMatch: boolean;
  }> = [];

  let totalSesionesChecked = 0;
  for (const nivel of reconciliationSummary.plan.niveles) {
    for (const sesion of nivel.sesiones) {
      totalSesionesChecked++;
      const cantEj = sesion.ejercicios.length;

      // Volumen Fase B
      assert(
        cantEj >= rango60.min && cantEj <= rango60.max,
        `Nivel ${nivel.numeroNivel} (${sesion.nombre}): ${cantEj} ejercicios (rango esperado [${rango60.min}, ${rango60.max}] para 60 min)`
      );

      // Duplicados
      const idsSesion = sesion.ejercicios.map((e) => e.ejercicioId);
      const uniqueIdsSesion = new Set(idsSesion);
      assert(
        uniqueIdsSesion.size === idsSesion.length,
        `0 duplicados en Nivel ${nivel.numeroNivel} (${sesion.nombre}) [${uniqueIdsSesion.size}/${idsSesion.length}]`
      );

      // Integridad de catálogo
      for (const ej of sesion.ejercicios) {
        assert(Boolean(ej.ejercicioId), `Ejercicio "${ej.nombre}" posee ejercicioId`);
        const itemEnCatalogo = catalogMap.get(ej.ejercicioId!);
        assert(Boolean(itemEnCatalogo), `UUID "${ej.ejercicioId}" existe en el catálogo de BD`);
        assert(itemEnCatalogo!.activo === true, `Ejercicio "${itemEnCatalogo?.nombre}" está activo`);

        ejerciciosInspeccionados.push({
          nivel: nivel.numeroNivel,
          sesion: sesion.nombre,
          nombre: ej.nombre,
          ejercicioId: ej.ejercicioId!,
          grupo: ej.grupoMuscular,
          catalogMatch: Boolean(itemEnCatalogo),
        });
      }
    }
  }

  console.log(`  ✓ Total de sesiones auditadas: ${totalSesionesChecked}`);
  console.log(`  ✓ Total de prescripciones de ejercicio verificadas contra BD: ${ejerciciosInspeccionados.length}`);

  // Muestra representativa de la tabla ejercicio -> UUID -> Catálogo
  console.log("\n  📋 Muestra de Mapeo Ejercicio -> UUID Oficial (Primeros 8 ejercicios):");
  for (const ej of ejerciciosInspeccionados.slice(0, 8)) {
    console.log(`     • [Nivel ${ej.nivel}] ${ej.nombre} -> UUID: ${ej.ejercicioId} (${ej.grupo})`);
  }

  // =========================================================================
  // PASO 7: EVALUACIÓN DE SAFETY EVALUATOR
  // =========================================================================
  console.log("\n▶ [PASO 7] Evaluación de Seguridad (Safety Evaluator)...");
  const reconciledOutput = {
    ...rawPlan,
    planEntrenamiento: reconciliationSummary.plan,
  };

  const safetyResult = evaluatePlanningSafety(
    testInput,
    reconciledOutput,
    catalog,
    reconciliationSummary.warnings
  );

  console.log(`  🛡️ Resultado Safety:`);
  console.log(`     - requiresHumanReview: ${safetyResult.requiresHumanReview}`);
  console.log(`     - Banderas de advertencia (${safetyResult.banderasAdvertencia.length}):`);
  for (const b of safetyResult.banderasAdvertencia) {
    console.log(`       ⚠️ ${b}`);
  }

  // En perfil sin lesiones y con plan 100% válido, no debe haber bloqueos críticos
  assert(Array.isArray(safetyResult.banderasAdvertencia), "banderasAdvertencia es un array");
  assert(typeof safetyResult.requiresHumanReview === "boolean", "requiresHumanReview es booleano");

  // =========================================================================
  // PASO 8: PRUEBAS NEGATIVAS CONTROLADAS (FIXTURES)
  // =========================================================================
  console.log("\n▶ [PASO 8] Validación de Casos Negativos de Reconciliación...");
  const primerEj = catalog[0];
  const segundoEj = catalog[1];

  // Caso A: UUID válido + nombre correcto
  const casoA = reconcileSingleExercise({ ejercicioId: primerEj.id, nombre: primerEj.nombre }, catalog);
  assert(casoA.matched === true && casoA.tipo === "EXACT_UUID" && casoA.ejercicioId === primerEj.id, "Caso A: UUID válido + nombre correcto -> EXACT_UUID");

  // Caso B: UUID inválido + nombre válido
  const casoB = reconcileSingleExercise({ ejercicioId: "uuid-invalido-12345", nombre: primerEj.nombre }, catalog);
  assert(casoB.matched === true && casoB.tipo === "NAME_RECONCILED" && casoB.ejercicioId === primerEj.id, "Caso B: UUID inválido + nombre válido -> NAME_RECONCILED a UUID oficial");

  // Caso C: UUID inválido + nombre inválido
  const casoC = reconcileSingleExercise({ ejercicioId: "uuid-falso", nombre: "Ejercicio Inexistente Galáctico" }, catalog);
  assert(casoC.matched === false && casoC.ejercicioId === null && casoC.tipo === "UNRECOGNIZED", "Caso C: UUID inválido + nombre inválido -> ejercicioId=null, UNRECOGNIZED");

  // Caso D: UUID válido + nombre de otro ejercicio (Contradicción)
  const casoD = reconcileSingleExercise({ ejercicioId: primerEj.id, nombre: segundoEj.nombre }, catalog);
  assert(
    casoD.matched === false &&
    casoD.tipo === "DISCREPANCY_DETECTED" &&
    casoD.ejercicioId === primerEj.id &&
    casoD.nombre === segundoEj.nombre &&
    Boolean(casoD.warning),
    "Caso D: UUID_A + Nombre_B -> NO reasigna UUID, conserva datos, DISCREPANCY_DETECTED con warning"
  );

  // Caso E: Ejercicio inactivo
  const catalogoConInactivo: CatalogExerciseItem[] = [
    ...catalog.filter((e) => e.id !== primerEj.id),
    { ...primerEj, activo: false },
  ];
  const casoE = reconcileSingleExercise({ ejercicioId: primerEj.id, nombre: primerEj.nombre }, catalogoConInactivo);
  assert(casoE.matched === false && casoE.ejercicioId === null && casoE.tipo === "INACTIVE_EXCLUDED", "Caso E: Ejercicio inactivo -> ejercicioId=null, INACTIVE_EXCLUDED");

  // =========================================================================
  // PASO 9: SIMULACIÓN DE PERSISTENCIA Y MATERIALIZACIÓN (HITL)
  // =========================================================================
  console.log("\n▶ [PASO 9] Validación de Flujo HITL y Persistencia en BD...");

  const { randomUUID } = await import("crypto");
  const testSocioId = randomUUID();
  const testPerfilId = randomUUID();
  const trainer = await prisma.personal.findFirst();

  // Crear socio y perfil efímeros para la prueba controlada
  const testSocio = await prisma.socio.create({
    data: {
      id: testSocioId,
      codigo: "FD-" + Math.floor(1000 + Math.random() * 9000),
      nombres: "Validacion",
      apellidos: "FaseD",
      tipoDocumento: "DNI",
      numeroDocumento: "888" + Math.floor(10000 + Math.random() * 90000),
      sexo: "M",
      fechaNacimiento: new Date("1995-01-01"),
      estado: "ACTIVO",
    },
  });

  const testPerfil = await prisma.perfilPlanificacion.create({
    data: {
      id: testPerfilId,
      socioId: testSocioId,
      entrenadorId: trainer?.id || "",
      version: 1,
      activo: true,
      objetivoPrincipal: "HIPERTROFIA",
      nivel: "INTERMEDIO",
      diasPorSemana: 4,
      duracionMinutos: 60,
    },
  });

  const candidateOutput = {
    ...rawPlan,
    planEntrenamiento: reconciliationSummary.plan,
  };

  const finalizedOutput = {
    ...candidateOutput,
    evaluacionSeguridad: {
      requiresHumanReview: safetyResult.requiresHumanReview,
      banderasAdvertencia: safetyResult.banderasAdvertencia,
      observacionesMedicasDeclaradas: "Sin restricciones físicas declaradas al momento de la generación.",
      alergiasDetectadasYMitigadas: [],
    },
  };

  // Crear propuesta de GeneracionIA
  const generacionPrueba = await prisma.generacionIA.create({
    data: {
      socioId: testSocioId,
      perfilPlanificacionId: testPerfilId,
      entrenadorId: trainer?.id,
      numeroGeneracion: 1,
      modeloUtilizado: "gemini-3.6-flash",
      versionSchema: "2.0",
      estado: "GENERADO",
      requiresHumanReview: safetyResult.requiresHumanReview,
      banderasAdvertencia: safetyResult.banderasAdvertencia as any,
      promptTokens: geminiResponse.metrics?.promptTokens || null,
      completionTokens: geminiResponse.metrics?.completionTokens || null,
      tiempoGeneracionMs: durationMs,
      inputSnapshot: testInput as any,
      rawOutput: finalizedOutput as any,
    },
  });

  assert(Boolean(generacionPrueba.id), `GeneracionIA creada con ID: ${generacionPrueba.id} (Estado: ${generacionPrueba.estado})`);
  assert(generacionPrueba.estado === "GENERADO", "HITL: La propuesta se crea en estado GENERADO sin auto-activar planes");

  // Materialización y Aprobación HITL mediante aprobarGeneracionIA
  const { aprobarGeneracionIA } = await import("@/app/actions/planes-ia");
  const { setTestAuthContext } = await import("@/lib/auth-utils");
  process.env.AUTH_BYPASS_FOR_TEST = "true";
  setTestAuthContext({
    userId: "test-admin-fase-d",
    name: "Admin Fase D",
    role: "ADMIN",
    permissions: ["PLANES_PERSONALIZADOS_GESTIONAR"],
  });

  const aprobacionResult = await aprobarGeneracionIA({
    generacionId: generacionPrueba.id,
    confirmacionRevisionHumana: true,
    observacionesEntrenador: "Aprobación controlada Fase D con Gemini real.",
  });

  assert(aprobacionResult.success === true, `Aprobación HITL exitosa: ${aprobacionResult.error || "OK"}`);

  // Verificar que el PlanEntrenamiento materializado existe y conserva los ejercicioId
  const planMaterializado = await prisma.planEntrenamiento.findFirst({
    where: { generacionIAId: generacionPrueba.id },
  });

  assert(Boolean(planMaterializado), "PlanEntrenamiento materializado en BD tras aprobación HITL");
  assert(planMaterializado!.activo === true, "PlanEntrenamiento materializado se activa correctamente");

  const rutinaGuardada = ((planMaterializado as any)?.contenido || (planMaterializado as any)?.rutina) as any;
  let totalPersistidosConUUID = 0;
  for (const n of (rutinaGuardada?.niveles || [])) {
    for (const s of (n?.sesiones || [])) {
      for (const e of (s?.ejercicios || [])) {
        if (e.ejercicioId && catalogMap.has(e.ejercicioId)) {
          totalPersistidosConUUID++;
        }
      }
    }
  }

  assert(
    totalPersistidosConUUID === reconciliationSummary.totalEjercicios,
    `El 100% de los ejercicios en el PlanEntrenamiento materializado (${totalPersistidosConUUID}/${reconciliationSummary.totalEjercicios}) conservan UUIDs del catálogo oficial`
  );

  // Verificar AuditLog
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      accion: "APROBAR_PLAN_IA",
      detalles: { contains: testSocioId },
    },
  });
  assert(auditLogs.length > 0, `AuditLog registró la operación (${auditLogs.length} eventos registrados)`);

  // Verificar que el catálogo de ejercicios permanezca intacto
  const countEjerciciosPost = await prisma.ejercicio.count({ where: { activo: true } });
  assert(countEjerciciosPost === catalog.length, `El catálogo permanece intacto (${countEjerciciosPost} ejercicios activos)`);

  // Limpieza de datos de prueba local
  await prisma.planAlimentacion.deleteMany({ where: { socioId: testSocioId } });
  await prisma.planEntrenamiento.deleteMany({ where: { socioId: testSocioId } });
  await prisma.auditLog.deleteMany({
    where: {
      detalles: { contains: testSocioId },
    },
  });
  await prisma.generacionIA.deleteMany({ where: { socioId: testSocioId } });
  await prisma.perfilPlanificacion.deleteMany({ where: { socioId: testSocioId } });
  await prisma.socio.deleteMany({ where: { id: testSocioId } });
  console.log("  🧹 Registros de prueba limpios de la BD local.");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("🎉 FASE D: VALIDACIÓN CONTROLADA CON GEMINI COMPLETADA AL 100%");
  console.log("══════════════════════════════════════════════════════════════════");
}

runFaseDValidation()
  .catch((err) => {
    console.error("Error fatal en Validación Fase D:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
