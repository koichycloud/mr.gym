import { calcularRangoEjerciciosPorDuracion } from "../src/lib/ai/volume-rules";
import { MockAIPlanningProvider } from "../src/lib/ai/mock-provider";
import { buildPlanningPrompt } from "../src/lib/ai/prompt-builder";
import { evaluatePlanningSafety } from "../src/lib/ai/safety-evaluator";
import { parseAndValidateAIOutput } from "../src/lib/ai/parser";
import { PlanningAIInput } from "../src/lib/validations";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALLÓ ASERCIÓN: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

function crearInputTest(duracionMinutos: number): PlanningAIInput {
  return {
    socio: {
      id: "test-socio-id",
      codigo: "SOC-9999",
      edad: 28,
      sexo: "M",
    },
    medidasActuales: {
      fecha: "2026-09-28",
      pesoKg: 78.5,
      tallaCm: 178,
      porcentajeGrasa: 16.5,
      porcentajeMusculo: 42.0,
      imc: 24.8,
      perimetrosCm: {},
    },
    evolucionHistorica: null,
    objetivos: {
      principal: "HIPERTROFIA",
      secundario: "Definición y fuerza funcional",
      nivel: "INTERMEDIO",
      tiempoEntrenando: "2 años",
      experienciaPrevia: "Entrenamiento de fuerza en gimnasio",
    },
    disponibilidad: {
      diasPorSemana: 3,
      diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
      duracionMinutosPorSesion: duracionMinutos,
      horarioPreferido: "Tarde",
    },
    entrenamiento: {
      tipoPreferido: "Hipertrofia / Torso-Pierna",
      ejerciciosExcluidos: null,
      lesionesDeclaradas: null,
      capacidadCardiovascular: "Media",
      capacidadFuerza: "Intermedia",
      equipamientoDisponible: "Gimnasio Completo",
    },
    alimentacionDeclarada: {
      preferencia: "Omnívoro",
      alergiasIntolerancias: null,
      alimentosEvitados: null,
      comidasPorDia: 4,
      consumoAguaLitrosPorDia: 3,
    },
    criterioEntrenador: {
      observaciones: "Enfoque en progresión de cargas.",
      motivoVersion: "Inicio de periodización",
    },
  };
}

async function runAllVolumeTests() {
  console.log("==================================================================");
  console.log("SUITE DE PRUEBAS AUTOMATIZADAS — FASE B1: CONTROL DE VOLUMEN");
  console.log("==================================================================\n");

  let totalTests = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Helper calcularRangoEjerciciosPorDuracion
  // --------------------------------------------------------------------------
  console.log("1. PRUEBA DEL HELPER: calcularRangoEjerciciosPorDuracion");
  
  const r15 = calcularRangoEjerciciosPorDuracion(15);
  assert(r15.min === 4 && r15.max === 5 && r15.sugerido === 4, "15 min -> min: 4, max: 5, sugerido: 4 (cota mínima segura)");
  totalTests++;

  const r45 = calcularRangoEjerciciosPorDuracion(45);
  assert(r45.min === 4 && r45.max === 5 && r45.sugerido === 5, "45 min -> min: 4, max: 5, sugerido: 5");
  totalTests++;

  const r60 = calcularRangoEjerciciosPorDuracion(60);
  assert(r60.min === 5 && r60.max === 6 && r60.sugerido === 6, "60 min -> min: 5, max: 6, sugerido: 6");
  totalTests++;

  const r75 = calcularRangoEjerciciosPorDuracion(75);
  assert(r75.min === 7 && r75.max === 8 && r75.sugerido === 7, "75 min -> min: 7, max: 8, sugerido: 7");
  totalTests++;

  const r90 = calcularRangoEjerciciosPorDuracion(90);
  assert(r90.min === 7 && r90.max === 8 && r90.sugerido === 8, "90 min -> min: 7, max: 8, sugerido: 8");
  totalTests++;

  const r120 = calcularRangoEjerciciosPorDuracion(120);
  assert(r120.min === 8 && r120.max === 10 && r120.sugerido === 9, "120 min -> min: 8, max: 10, sugerido: 9");
  totalTests++;

  const r180 = calcularRangoEjerciciosPorDuracion(180);
  assert(r180.min === 8 && r180.max === 10 && r180.sugerido === 9, "180 min -> min: 8, max: 10, sugerido: 9 (cota máxima segura)");
  totalTests++;

  // --------------------------------------------------------------------------
  // TEST 2: Prompt Builder contiene las directrices de duración y volumen
  // --------------------------------------------------------------------------
  console.log("\n2. PRUEBA DE PROMPT-BUILDER");
  const input60 = crearInputTest(60);
  const prompt60 = buildPlanningPrompt(input60);
  assert(prompt60.systemPrompt.includes("60 minutos"), "systemPrompt incluye la duración de 60 minutos");
  assert(prompt60.systemPrompt.includes("5 y 6 ejercicios"), "systemPrompt incluye el rango de 5 y 6 ejercicios");
  assert(prompt60.userPrompt.includes("60 min -> OBLIGATORIAMENTE entre 5 y 6 ejercicios"), "userPrompt incluye la directriz obligatoria de volumen");
  totalTests += 3;

  const input90 = crearInputTest(90);
  const prompt90 = buildPlanningPrompt(input90);
  assert(prompt90.systemPrompt.includes("90 minutos"), "systemPrompt incluye la duración de 90 minutos");
  assert(prompt90.systemPrompt.includes("7 y 8 ejercicios"), "systemPrompt incluye el rango de 7 y 8 ejercicios para 90 min");
  totalTests += 2;

  // --------------------------------------------------------------------------
  // TEST 3: Mock Provider Dinámico en todas las duraciones oficiales
  // --------------------------------------------------------------------------
  console.log("\n3. PRUEBA DE MOCK PROVIDER DINÁMICO (45, 60, 75, 90, 120 min)");
  const mockProvider = new MockAIPlanningProvider("VALID");

  const duracionesObjetivo = [
    { duracion: 45, minEsperado: 4, maxEsperado: 5 },
    { duracion: 60, minEsperado: 5, maxEsperado: 6 },
    { duracion: 75, minEsperado: 7, maxEsperado: 8 },
    { duracion: 90, minEsperado: 7, maxEsperado: 8 },
    { duracion: 120, minEsperado: 8, maxEsperado: 10 },
  ];

  for (const { duracion, minEsperado, maxEsperado } of duracionesObjetivo) {
    const input = crearInputTest(duracion);
    const prompt = buildPlanningPrompt(input);
    const response = await mockProvider.generateStructuredPlan(input, prompt);

    assert(response.success && Boolean(response.rawText), `MockProvider respondió con éxito para ${duracion} min`);
    totalTests++;

    const parsed = parseAndValidateAIOutput(response.rawText!);
    assert(parsed.success && Boolean(parsed.data), `Respuesta JSON de ${duracion} min valida contra planningAIOutputSchema (Zod)`);
    totalTests++;

    const plan = parsed.data!.planEntrenamiento;
    assert(plan.niveles.length === 6, `Plan contiene exactamente 6 niveles para ${duracion} min`);
    totalTests++;

    for (const nivel of plan.niveles) {
      assert(nivel.sesiones.length >= 2, `Nivel ${nivel.numeroNivel} contiene múltiples sesiones`);
      totalTests++;

      for (const sesion of nivel.sesiones) {
        const numEj = sesion.ejercicios.length;
        assert(
          numEj >= minEsperado && numEj <= maxEsperado,
          `Nivel ${nivel.numeroNivel} (${sesion.nombre}) tiene ${numEj} ejercicios (Rango esperado [${minEsperado}, ${maxEsperado}] para ${duracion} min)`
        );
        totalTests++;

        // Aserción específica contra regresión de 1-2 ejercicios
        if (duracion >= 60) {
          assert(numEj > 2, `Verificación anti-regresión: ${duracion} min produjo ${numEj} ejercicios (NO se redujo a 1-2)`);
          totalTests++;
        }

        // Aserción de 0 duplicados dentro de la sesión
        const nombres = sesion.ejercicios.map((e) => e.nombre.trim());
        const setNombres = new Set(nombres);
        assert(setNombres.size === nombres.length, `0 duplicados en Nivel ${nivel.numeroNivel} (${sesion.nombre}): ${nombres.length} ejercicios únicos`);
        totalTests++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Safety Evaluator - Detección defensiva de volumen
  // --------------------------------------------------------------------------
  console.log("\n4. PRUEBA DE SAFETY EVALUATOR — AUDITORÍA DEFENSIVA DE VOLUMEN");
  const inputTest60 = crearInputTest(60);
  
  // Caso A: Plan conforme (6 ejercicios para 60 min)
  const promptTest60 = buildPlanningPrompt(inputTest60);
  const respOk = await mockProvider.generateStructuredPlan(inputTest60, promptTest60);
  const parsedOk = parseAndValidateAIOutput(respOk.rawText!);
  const evalOk = evaluatePlanningSafety(inputTest60, parsedOk.data);
  const tieneWarningVolumenOk = evalOk.banderasAdvertencia.some((b) => b.includes("Volumen reducido"));
  assert(!tieneWarningVolumenOk, "Safety Evaluator NO emite advertencia de volumen cuando el plan cumple el rango");
  totalTests++;

  // Caso B: Plan histórico o anómalo con 1 solo ejercicio en sesión para 60 min
  const mockOutputAnomalo = JSON.parse(respOk.rawText!);
  mockOutputAnomalo.planEntrenamiento.niveles[0].sesiones[0].ejercicios = [
    mockOutputAnomalo.planEntrenamiento.niveles[0].sesiones[0].ejercicios[0],
  ];
  const evalAnomalo = evaluatePlanningSafety(inputTest60, mockOutputAnomalo);
  const tieneWarningVolumenAnomalo = evalAnomalo.banderasAdvertencia.some((b) => b.includes("Volumen reducido"));
  assert(tieneWarningVolumenAnomalo, "Safety Evaluator detecta defensivamente sesión con volumen inferior y emite advertencia");
  totalTests++;

  console.log(`\n==================================================================`);
  console.log(`TODAS LAS PRUEBAS DE VOLUMEN PASARON EXITOSAMENTE (${totalTests} aserciones).`);
  console.log(`==================================================================\n`);
}

runAllVolumeTests().catch((e) => {
  console.error("Fallo crítico en suite de pruebas de volumen:", e);
  process.exit(1);
});
