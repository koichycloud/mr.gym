import {
  planAlimentacionJSONSchema,
  recetaSugeridaAISchema,
  validarCoherenciaMacros,
  MacrosPorcion,
  PlanAlimentacionJSON,
} from "../src/lib/validations";
import { MockAIPlanningProvider } from "../src/lib/ai/mock-provider";
import { evaluatePlanningSafety } from "../src/lib/ai/safety-evaluator";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`❌ [FAIL] ${testName} - ${detail || "Assertion failed"}`);
  }
}

async function runTests() {
  console.log("============================================================");
  console.log("INICIANDO PRUEBAS DEL PLAN ALIMENTARIO PERSONALIZADO (FASE 8)");
  console.log("============================================================");

  // --------------------------------------------------------------------------
  // TEST 1: Validación de Receta Estructurada Completa
  // --------------------------------------------------------------------------
  const recetaModernaValida = {
    idReceta: "REC-01",
    nombre: "Pechuga a la plancha con arroz y palta",
    momentoSugerido: "ALMUERZO",
    tiempoPreparacionMinutos: 20,
    porcion: {
      cantidad: 1,
      unidad: "plato",
      descripcion: "1 plato completo (~380 g)",
    },
    ingredientesDetalle: [
      { nombre: "Pechuga de pollo", cantidad: 160, unidad: "g" },
      { nombre: "Arroz integral", cantidad: 120, unidad: "g" },
      { nombre: "Palta / Aguacate", cantidad: 50, unidad: "g" },
    ],
    macrosPorcion: {
      caloriasKcal: 520,
      proteinasG: 44,
      carbohidratosG: 48,
      grasasG: 16,
    },
    ingredientes: ["Pechuga de pollo 160g", "Arroz integral 120g", "Palta 50g"],
    instrucciones: ["Cocinar pechuga", "Servir con arroz y palta"],
    porciones: 1,
    opcionesSustitucion: "Pechuga de pavo o tofu",
    beneficioClave: "Alto en proteína magra",
  };

  const parseReceta1 = recetaSugeridaAISchema.safeParse(recetaModernaValida);
  assert(parseReceta1.success, "1. JSON de receta estructurada nueva es válido");

  // --------------------------------------------------------------------------
  // TEST 2: Validación de Ingredientes Estructurados, Cantidades y Unidades
  // --------------------------------------------------------------------------
  const recetaConCantidadInvalida = {
    ...recetaModernaValida,
    idReceta: "REC-02",
    ingredientesDetalle: [
      { nombre: "Pechuga de pollo", cantidad: -50, unidad: "g" }, // Cantidad negativa
    ],
  };
  const parseRecetaInvalida = recetaSugeridaAISchema.safeParse(recetaConCantidadInvalida);
  assert(!parseRecetaInvalida.success, "2. Rechaza cantidades negativas en ingredientes estructurados");

  // --------------------------------------------------------------------------
  // TEST 3: Validación de Macros por Porción
  // --------------------------------------------------------------------------
  const macrosValidos: MacrosPorcion = {
    caloriasKcal: 520,
    proteinasG: 44,
    carbohidratosG: 48,
    grasasG: 16,
  };
  const esCoherente = validarCoherenciaMacros(macrosValidos, 0.20);
  assert(esCoherente, "3. Coherencia matemática de macronutrientes (P*4 + C*4 + G*9 ~ kcal)");

  const macrosIncoherentes: MacrosPorcion = {
    caloriasKcal: 900, // Demasiado alejado de los macros (44*4 + 48*4 + 16*9 = 512)
    proteinasG: 44,
    carbohidratosG: 48,
    grasasG: 16,
  };
  const esIncoherente = validarCoherenciaMacros(macrosIncoherentes, 0.20);
  assert(!esIncoherente, "4. Detecta macros incoherentes con respecto a las calorías declaradas");

  // --------------------------------------------------------------------------
  // TEST 5 & 6: Plan Alimentario Completo con Objetivos Nutricionales Diarios
  // --------------------------------------------------------------------------
  const recetas20 = Array.from({ length: 20 }).map((_, idx) => ({
    ...recetaModernaValida,
    idReceta: `REC-${idx + 1}`,
    nombre: `Receta #${idx + 1}`,
  }));

  const planModernoValido = {
    titulo: "Plan Nutricional de Hipertrofia",
    descripcionGeneral: "Plan con superávit calórico y distribución equilibrada",
    lineamientosGenerales: ["Comer 4 veces al día", "Priorizar agua"],
    recomendacionHidratacion: "3.0 L/día",
    objetivosNutricionalesDiarios: {
      caloriasObjetivoKcal: 2400,
      proteinasObjetivoG: 160,
      carbohidratosObjetivoG: 280,
      grasasObjetivoG: 70,
      distribucionCaloricaPorcentaje: {
        proteinas: 27,
        carbohidratos: 47,
        grasas: 26,
      },
      resumenEstrategiaNutricional: "Superávit de 300 kcal para ganancia muscular magra",
    },
    recetas: recetas20,
  };

  const parsePlanModerno = planAlimentacionJSONSchema.safeParse(planModernoValido);
  assert(parsePlanModerno.success, "5. Plan alimentario con 20 recetas y objetivos nutricionales diarios es válido");

  // --------------------------------------------------------------------------
  // TEST 7: Compatibilidad Histórica — Receta Antigua (solo ingredientes: string[])
  // --------------------------------------------------------------------------
  const recetaHistorica = {
    idReceta: "REC-OLD-01",
    nombre: "Receta Antigua",
    momentoSugerido: "DESAYUNO",
    tiempoPreparacionMinutos: 15,
    ingredientes: ["2 Huevos", "1 taza de avena", "1 vaso de leche"],
    instrucciones: ["Mezclar y cocinar."],
    porciones: 1,
    // Sin ingredientesDetalle ni macrosPorcion
  };

  const parseRecetaHistorica = recetaSugeridaAISchema.safeParse(recetaHistorica);
  assert(parseRecetaHistorica.success, "6. Compatibilidad histórica: Receta antigua sin ingredientesDetalle es válida");

  // --------------------------------------------------------------------------
  // TEST 8: Compatibilidad Histórica — Plan Antiguo sin Objetivos Diarios
  // --------------------------------------------------------------------------
  const recetasHistoricas20 = Array.from({ length: 20 }).map((_, idx) => ({
    ...recetaHistorica,
    idReceta: `REC-OLD-${idx + 1}`,
  }));

  const planHistorico = {
    titulo: "Plan Nutricional Antiguo",
    descripcionGeneral: "Versión histórica sin desglose de macros",
    lineamientosGenerales: ["Alimentación balanceada"],
    recomendacionHidratacion: "2.0 L/día",
    // Sin objetivosNutricionalesDiarios
    recetas: recetasHistoricas20,
  };

  const parsePlanHistorico = planAlimentacionJSONSchema.safeParse(planHistorico);
  assert(parsePlanHistorico.success, "7. Compatibilidad histórica: Plan antiguo sin objetivos diarios es válido");

  // --------------------------------------------------------------------------
  // TEST 9: Mock Provider genera propuesta completa con el nuevo contrato
  // --------------------------------------------------------------------------
  const mockProvider = new MockAIPlanningProvider("VALID");
  const mockInput = {
    socio: { id: "test-id", codigo: "SOC-01", nombres: "Juan", apellidos: "Pérez", edad: 28, sexo: "M" as const },
    medidasActuales: { pesoKg: 78, tallaCm: 178, imc: 24.6 },
    objetivos: { principal: "HIPERTROFIA", nivel: "INTERMEDIO", tiempoEntrenando: "1 año" },
    disponibilidad: { diasPorSemana: 4, tiempoMinutosPorSesion: 60, diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES", "SABADO"] },
    entrenamiento: { experienciaPrevia: "Gimnasio regular" },
    alimentacionDeclarada: { preferencia: "Omnívoro", comidasPorDia: 4, consumoAguaLitrosPorDia: 3 },
  };

  const mockRes = await mockProvider.generateStructuredPlan(mockInput as any, {
    systemPrompt: "MOCK_SYSTEM",
    userPrompt: "MOCK_USER",
  });
  assert(mockRes.success, "8. Mock Provider ejecuta exitosamente");

  const parsedMockOutput = JSON.parse(mockRes.rawText || "{}");
  const planAlimMock = parsedMockOutput.planAlimentacion;
  assert(
    Boolean(planAlimMock?.objetivosNutricionalesDiarios?.caloriasObjetivoKcal > 0),
    "9. Mock Provider genera objetivos nutricionales diarios calculados científicamente"
  );
  assert(
    planAlimMock?.recetas?.length >= 20 &&
      Boolean(planAlimMock?.recetas[0]?.ingredientesDetalle?.length > 0) &&
      Boolean(planAlimMock?.recetas[0]?.macrosPorcion?.caloriasKcal > 0),
    "10. Mock Provider genera 20+ recetas con ingredientes estructurados y macros por porción"
  );

  // --------------------------------------------------------------------------
  // TEST 10: Safety Evaluator detecta alérgenos en ingredientesDetalle
  // --------------------------------------------------------------------------
  const inputConAlergia = {
    ...mockInput,
    alimentacionDeclarada: {
      ...mockInput.alimentacionDeclarada,
      alergiasIntolerancias: "cacahuate, maní",
    },
  };

  const outputConAlergeno = {
    ...parsedMockOutput,
    planAlimentacion: {
      ...parsedMockOutput.planAlimentacion,
      recetas: [
        {
          ...recetaModernaValida,
          idReceta: "REC-ALERGIA-01",
          nombre: "Tostada con crema de cacahuate",
          ingredientesDetalle: [
            { nombre: "Crema de cacahuate natural", cantidad: 30, unidad: "g" },
          ],
        },
        ...recetas20.slice(1),
      ],
    },
  };

  const safetyResult = evaluatePlanningSafety(inputConAlergia as any, outputConAlergeno as any);
  assert(
    safetyResult.requiresHumanReview &&
      safetyResult.banderasAdvertencia.some((b) => b.toLowerCase().includes("cacahuate") || b.toLowerCase().includes("maní")),
    "11. Safety Evaluator detecta alérgeno en ingredientesDetalle y activa requiresHumanReview"
  );

  console.log("============================================================");
  console.log(`RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASADAS`);
  if (failedTests > 0) {
    console.error(`❌ ${failedTests} PRUEBAS FALLIDAS`);
    process.exit(1);
  } else {
    console.log("🎉 TODAS LAS PRUEBAS DE NUTRICIÓN PERSONALIZADA PASARON EXITOSAMENTE.");
  }
}

runTests().catch((err) => {
  console.error("Error no controlado en pruebas:", err);
  process.exit(1);
});
