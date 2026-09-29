import prisma from "../src/lib/prisma";
import {
  getActiveExerciseCatalog,
  formatCatalogForPrompt,
  reconcileSingleExercise,
  reconcilePlanTrainingExercises,
  CatalogExerciseItem,
} from "../src/lib/ai/catalog-helper";
import { MockAIPlanningProvider } from "../src/lib/ai/mock-provider";
import { buildPlanningPrompt } from "../src/lib/ai/prompt-builder";
import { evaluatePlanningSafety } from "../src/lib/ai/safety-evaluator";
import { parseAndValidateAIOutput } from "../src/lib/ai/parser";
import { calcularRangoEjerciciosPorDuracion } from "../src/lib/ai/volume-rules";
import { PlanningAIInput, planningAIOutputSchema } from "../src/lib/validations";

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ❌ FALLÓ: ${message}`);
    throw new Error(`Aserción fallida: ${message}`);
  }
}

function createBaseInput(overrides: Partial<PlanningAIInput> = {}): PlanningAIInput {
  return {
    socio: {
      id: "socio-fase-c-test",
      codigo: "SOC-FC01",
      edad: 28,
      sexo: "M",
    },
    medidasActuales: {
      fecha: "2026-09-28",
      pesoKg: 78.5,
      tallaCm: 178,
      porcentajeGrasa: 15.2,
      porcentajeMusculo: 42.1,
      imc: 24.8,
      perimetrosCm: {
        pecho: 102,
        cintura: 82,
        vientreBajo: 84,
        gluteos: 98,
        cuello: 38,
        hombros: 118,
        biceps: 36,
        antebrazos: 30,
        muslos: 58,
        cuadriceps: 56,
        pantorrillas: 38,
      },
    },
    evolucionHistorica: null,
    objetivos: {
      principal: "HIPERTROFIA",
      secundario: "Aumento de masa muscular magra",
      nivel: "INTERMEDIO",
      tiempoEntrenando: "2 años",
      experienciaPrevia: "Entrenamiento de fuerza y pesas",
    },
    disponibilidad: {
      diasPorSemana: 3,
      diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
      duracionMinutosPorSesion: 60,
      horarioPreferido: "Mañana",
    },
    entrenamiento: {
      tipoPreferido: "Torso / Pierna / Full Body",
      ejerciciosExcluidos: null,
      lesionesDeclaradas: null,
      capacidadCardiovascular: "Buena",
      capacidadFuerza: "Media-Alta",
      equipamientoDisponible: "GIMNASIO_COMPLETO",
    },
    alimentacionDeclarada: {
      preferencia: "Omnívoro",
      alergiasIntolerancias: null,
      alimentosEvitados: null,
      comidasPorDia: 4,
      consumoAguaLitrosPorDia: 3.0,
    },
    criterioEntrenador: {
      observaciones: "Priorizar progresión en cargas y técnica en básicos",
      motivoVersion: "Inicio Fase C Integración",
    },
    ...overrides,
  };
}

async function runIntegrationSuite() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("SUITE DE INTEGRACIÓN FASE C: CATÁLOGO DE 100 EJERCICIOS + IA");
  console.log("══════════════════════════════════════════════════════════════════\n");

  // =========================================================================
  // BLOQUE 1: VERIFICACIÓN DEL CATÁLOGO DE 100 EJERCICIOS EN BASE DE DATOS
  // =========================================================================
  console.log("▶ [BLOQUE 1] Catálogo de 100 Ejercicios en BD...");
  const catalog = await getActiveExerciseCatalog();
  assert(catalog.length === 100, `El catálogo activo contiene exactamente 100 ejercicios (obtenidos: ${catalog.length})`);

  const allActive = catalog.every((e) => e.activo === true);
  assert(allActive, "El 100% de los ejercicios obtenidos tienen activo = true");

  const uniqueIds = new Set(catalog.map((e) => e.id));
  assert(uniqueIds.size === 100, "Los 100 ejercicios poseen UUIDs únicos sin colisiones");

  const uniqueNames = new Set(catalog.map((e) => e.nombre.trim().toLowerCase()));
  assert(uniqueNames.size === 100, "Los 100 ejercicios poseen nombres únicos sin duplicados");

  const catalogFormatted = formatCatalogForPrompt(catalog);
  assert(catalogFormatted.length > 500, "La representación compacta del catálogo se generó correctamente");
  assert(catalogFormatted.includes("[") && catalogFormatted.includes("]"), "El formato incluye los delimitadores de UUID [id]");

  // =========================================================================
  // BLOQUE 2: GENERACIÓN CON MOCK Y PROMPT CON CATÁLOGO
  // =========================================================================
  console.log("\n▶ [BLOQUE 2] Inyección en Prompt y Generación Mock con UUIDs Reales...");
  const mockProvider = new MockAIPlanningProvider();
  const input60 = createBaseInput({ disponibilidad: { diasPorSemana: 3, diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"], duracionMinutosPorSesion: 60 } });
  const prompt60 = buildPlanningPrompt(input60, catalog);

  assert(prompt60.systemPrompt.includes("CATÁLOGO OFICIAL DE EJERCICIOS DISPONIBLES"), "El systemPrompt contiene la sección del catálogo oficial");
  assert(prompt60.systemPrompt.includes("ejercicioId"), "El systemPrompt instruye explícitamente el uso de ejercicioId");

  const response60 = await mockProvider.generateStructuredPlan(input60, prompt60);
  assert(response60.success === true, "MockProvider ejecutó exitosamente");

  const parsed60 = parseAndValidateAIOutput(response60.rawText || "");
  assert(parsed60.success === true, "La salida del Mock valida contra planningAIOutputSchema (Zod)");

  // Reconciliación determinista de ejercicios
  const rec60 = reconcilePlanTrainingExercises(parsed60.data!.planEntrenamiento, catalog);
  assert(rec60.totalEjercicios > 0, `Total de ejercicios generados evaluados: ${rec60.totalEjercicios}`);
  assert(rec60.reconciliadosConExito === rec60.totalEjercicios, `El 100% de los ejercicios (${rec60.reconciliadosConExito}/${rec60.totalEjercicios}) conservan UUIDs reales del catálogo`);
  assert(rec60.sinReconocer === 0, "Cero ejercicios huérfanos o sin reconocer en generación estándar");

  // =========================================================================
  // BLOQUE 3: VOLUMEN DE EJERCICIOS POR DURACIÓN (45, 60, 75, 90, 120 MIN)
  // =========================================================================
  console.log("\n▶ [BLOQUE 3] Validación de Volúmenes Oficiales de Fase B + UUIDs...");
  const duraciones = [45, 60, 75, 90, 120];

  for (const duracion of duraciones) {
    const inputDur = createBaseInput({
      disponibilidad: {
        diasPorSemana: 3,
        diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
        duracionMinutosPorSesion: duracion,
      },
    });
    const promptDur = buildPlanningPrompt(inputDur, catalog);
    const respDur = await mockProvider.generateStructuredPlan(inputDur, promptDur);
    const parsedDur = parseAndValidateAIOutput(respDur.rawText || "");
    const recDur = reconcilePlanTrainingExercises(parsedDur.data!.planEntrenamiento, catalog);

    const rango = calcularRangoEjerciciosPorDuracion(duracion);
    const niveles = recDur.plan.niveles;

    for (const nivel of niveles) {
      for (const sesion of nivel.sesiones) {
        const totalEj = sesion.ejercicios.length;
        assert(
          totalEj >= rango.min && totalEj <= rango.max,
          `Duración ${duracion} min -> Nivel ${nivel.numeroNivel} (${sesion.nombre}): ${totalEj} ejercicios (esperado [${rango.min}, ${rango.max}])`
        );

        // Validar que cada ejercicio tenga su UUID real
        for (const ej of sesion.ejercicios) {
          assert(Boolean(ej.ejercicioId && uniqueIds.has(ej.ejercicioId)), `Ejercicio "${ej.nombre}" tiene UUID real válido: ${ej.ejercicioId}`);
        }

        // Validar ausencia de duplicados dentro de la sesión
        const nombres = sesion.ejercicios.map((e) => e.nombre.toLowerCase().trim());
        const setNombres = new Set(nombres);
        assert(setNombres.size === nombres.length, `0 duplicados en ${sesion.nombre} (${setNombres.size}/${nombres.length})`);
      }
    }
  }

  // =========================================================================
  // BLOQUE 4: CASOS NEGATIVOS Y RECONCILIACIÓN DETERMINISTA
  // =========================================================================
  console.log("\n▶ [BLOQUE 4] Casos Negativos de Reconciliación y Seguridad...");

  const primerEj = catalog[0];
  const segundoEj = catalog[1];

  // Caso 1: UUID válido y coincidente
  const casoExacto = reconcileSingleExercise(
    { ejercicioId: primerEj.id, nombre: primerEj.nombre },
    catalog
  );
  assert(casoExacto.matched === true, "Caso 1: UUID válido coincide con catálogo");
  assert(casoExacto.ejercicioId === primerEj.id, "Caso 1: Conserva UUID exacto");
  assert(casoExacto.tipo === "EXACT_UUID", "Caso 1: Clasificado como EXACT_UUID");

  // Caso 2: UUID ausente pero nombre válido en catálogo
  const casoSinId = reconcileSingleExercise(
    { ejercicioId: null, nombre: segundoEj.nombre },
    catalog
  );
  assert(casoSinId.matched === true, "Caso 2: Nombre válido sin UUID es reconciliado");
  assert(casoSinId.ejercicioId === segundoEj.id, "Caso 2: Asigna el UUID oficial del catálogo");
  assert(casoSinId.tipo === "NAME_RECONCILED", "Caso 2: Clasificado como NAME_RECONCILED");

  // Caso 3: UUID inventado / falso pero nombre válido en catálogo
  const casoIdInvalido = reconcileSingleExercise(
    { ejercicioId: "00000000-0000-0000-0000-000000000000", nombre: segundoEj.nombre },
    catalog
  );
  assert(casoIdInvalido.matched === true, "Caso 3: UUID inventado pero nombre válido es reconciliado al UUID oficial");
  assert(casoIdInvalido.ejercicioId === segundoEj.id, "Caso 3: Sustituye UUID falso por UUID real");

  // Caso 4: UUID inventado + nombre inexistente
  const casoTotalmenteFalso = reconcileSingleExercise(
    { ejercicioId: "99999999-9999-9999-9999-999999999999", nombre: "Vuelo Espacial Anti-Gravedad" },
    catalog
  );
  assert(casoTotalmenteFalso.matched === false, "Caso 4: Ejercicio totalmente desconocido no se reconcilia");
  assert(casoTotalmenteFalso.ejercicioId === null, "Caso 4: ejercicioId queda como null (no inventa UUID)");
  assert(casoTotalmenteFalso.tipo === "UNRECOGNIZED", "Caso 4: Clasificado como UNRECOGNIZED");

  // Caso 5: Discrepancia UUID vs Nombre (UUID_A de primerEj pero Nombre de segundoEj)
  // REGLA DEFINITIVA: NO sustituir UUID_A por UUID_B. Conservar datos para HITL y emitir warning explícito.
  const casoDiscrepancia = reconcileSingleExercise(
    { ejercicioId: primerEj.id, nombre: segundoEj.nombre },
    catalog
  );
  assert(casoDiscrepancia.matched === false, "Caso 5: Discrepancia detectada y marcada para revisión");
  assert(casoDiscrepancia.tipo === "DISCREPANCY_DETECTED", "Caso 5: Clasificado como DISCREPANCY_DETECTED");
  assert(casoDiscrepancia.ejercicioId === primerEj.id, "Caso 5: NO se sustituye UUID_A por UUID_B; conserva UUID_A original");
  assert(casoDiscrepancia.nombre === segundoEj.nombre, "Caso 5: NO se normaliza silenciosamente el nombre; conserva nombre original");
  assert(Boolean(casoDiscrepancia.warning), "Caso 5: Emite warning explícito de discrepancia");
  assert(casoDiscrepancia.warning!.includes("Discrepancia"), "Caso 5: El warning menciona explícitamente la discrepancia");

  // Verificar que un plan con discrepancia active requiresHumanReview en Safety Evaluator
  const planConDiscrepancia = JSON.parse(JSON.stringify(parsed60.data!));
  planConDiscrepancia.planEntrenamiento.niveles[0].sesiones[0].ejercicios[0].ejercicioId = primerEj.id;
  planConDiscrepancia.planEntrenamiento.niveles[0].sesiones[0].ejercicios[0].nombre = segundoEj.nombre;
  const safetyDiscrepancia = evaluatePlanningSafety(input60, planConDiscrepancia, catalog);
  assert(safetyDiscrepancia.requiresHumanReview === true, "Caso 5: Safety Evaluator marca requiresHumanReview ante discrepancia UUID/nombre");
  assert(
    safetyDiscrepancia.banderasAdvertencia.some((b) => b.includes("Discrepancia detectada")),
    "Caso 5: Safety Evaluator incluye bandera explícita de discrepancia"
  );

  // Caso 6: Ejercicio Inactivo en Catálogo
  const catalogoConInactivo: CatalogExerciseItem[] = [
    ...catalog.filter((e) => e.id !== primerEj.id),
    { ...primerEj, activo: false },
  ];
  const casoInactivo = reconcileSingleExercise(
    { ejercicioId: primerEj.id, nombre: primerEj.nombre },
    catalogoConInactivo
  );
  assert(casoInactivo.matched === false, "Caso 6: Ejercicio inactivo no es aceptado como válido");
  assert(casoInactivo.ejercicioId === null, "Caso 6: ejercicioId es anulado");
  assert(casoInactivo.tipo === "INACTIVE_EXCLUDED", "Caso 6: Clasificado como INACTIVE_EXCLUDED");

  // =========================================================================
  // BLOQUE 5: SAFETY EVALUATOR CON REGLAS DE CATÁLOGO Y RETROCOMPATIBILIDAD
  // =========================================================================
  console.log("\n▶ [BLOQUE 5] Safety Evaluator con Catálogo y Planes Históricos...");

  // Plan con ejercicio excluido declarado por el socio
  const inputConExclusion = createBaseInput({
    entrenamiento: {
      tipoPreferido: "Torso / Pierna",
      ejerciciosExcluidos: "Press de Banca Plano con Barra",
      lesionesDeclaradas: "Molestia en hombro izquierdo",
      capacidadCardiovascular: "Media",
      capacidadFuerza: "Media",
      equipamientoDisponible: "GIMNASIO_COMPLETO",
    },
  });

  const safetyConExclusion = evaluatePlanningSafety(inputConExclusion, parsed60.data!, catalog);
  assert(safetyConExclusion.requiresHumanReview === true, "Safety Evaluator activa requiresHumanReview por lesión/exclusión");
  assert(
    safetyConExclusion.banderasAdvertencia.some((b) => b.includes("Press de Banca Plano con Barra")),
    "Safety Evaluator detecta y bandera la presencia de un ejercicio excluido"
  );

  // Retrocompatibilidad con planes históricos sin ejercicioId
  const planHistoricoRaw = JSON.parse(JSON.stringify(parsed60.data!));
  // Remover ejercicioId de todos los ejercicios para simular plan histórico
  for (const n of planHistoricoRaw.planEntrenamiento.niveles) {
    for (const s of n.sesiones) {
      for (const e of s.ejercicios) {
        delete e.ejercicioId;
      }
    }
  }

  const validacionHistorico = planningAIOutputSchema.safeParse(planHistoricoRaw);
  assert(validacionHistorico.success === true, "Plan histórico sin ejercicioId valida 100% contra planningAIOutputSchema");

  const safetyHistorico = evaluatePlanningSafety(input60, planHistoricoRaw, catalog);
  assert(safetyHistorico.banderasAdvertencia.some((b) => b.includes("sin vincular al catálogo")), "Plan histórico genera warning informativo sin romper la evaluación");

  // =========================================================================
  // BLOQUE 6: NUTRICIÓN Y ESQUEMAS INTACTOS
  // =========================================================================
  console.log("\n▶ [BLOQUE 6] Integridad de Nutrición y Recetas...");
  assert(parsed60.data!.planAlimentacion.recetas.length >= 20, "Plan alimentario contiene al menos 20 recetas");
  assert(Boolean(parsed60.data!.planAlimentacion.objetivosNutricionalesDiarios), "Plan alimentario incluye objetivos nutricionales diarios calculados");

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(`TOTAL DE ASERCIONES DE INTEGRACIÓN FASE C: ${passedAssertions}/${totalAssertions} PASADAS`);
  console.log("🎉 SUITE DE INTEGRACIÓN FASE C COMPLETADA EXITOSAMENTE.");
  console.log("══════════════════════════════════════════════════════════════════");
}

runIntegrationSuite()
  .catch((err) => {
    console.error("Error fatal en suite de integración Fase C:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
