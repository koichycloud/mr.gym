import { PlanningAIInput, PlanningAIOutput } from "../validations";
import { AIPlanningProvider, AIProviderResponse } from "./types";

export type MockProviderBehavior =
  | "VALID"
  | "INVALID_JSON"
  | "LESS_THAN_6_LEVELS"
  | "MORE_THAN_6_LEVELS"
  | "LESS_THAN_20_RECIPES"
  | "DUPLICATE_RECIPES"
  | "SIMULATED_ERROR"
  | "SIMULATED_TIMEOUT";

export class MockAIPlanningProvider implements AIPlanningProvider {
  public name = "MockAIPlanningProvider";
  private behavior: MockProviderBehavior = "VALID";
  private delayMs = 10;

  constructor(behavior: MockProviderBehavior = "VALID", delayMs: number = 10) {
    this.behavior = behavior;
    this.delayMs = delayMs;
  }

  public setBehavior(behavior: MockProviderBehavior) {
    this.behavior = behavior;
  }

  public async generateStructuredPlan(
    input: PlanningAIInput,
    prompt: { systemPrompt: string; userPrompt: string }
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();

    // Simulación de latencia
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.behavior === "SIMULATED_TIMEOUT") {
      return {
        success: false,
        error: "Timeout: El proveedor no respondió en el tiempo límite establecido (15000ms).",
        isTimeout: true,
        metrics: {
          tiempoGeneracionMs: 15000,
        },
      };
    }

    if (this.behavior === "SIMULATED_ERROR") {
      return {
        success: false,
        error: "API Error (500): Error interno simulado del proveedor de Inteligencia Artificial.",
        metrics: {
          tiempoGeneracionMs: Date.now() - startTime,
        },
      };
    }

    if (this.behavior === "INVALID_JSON") {
      return {
        success: true,
        rawText: "```json\n{ este no es un json valido :::: error \n```",
        metrics: {
          promptTokens: 1200,
          completionTokens: 25,
          tiempoGeneracionMs: Date.now() - startTime,
        },
      };
    }

    // Generar 6 niveles o cantidad según behavior
    let numNiveles = 6;
    if (this.behavior === "LESS_THAN_6_LEVELS") numNiveles = 4;
    if (this.behavior === "MORE_THAN_6_LEVELS") numNiveles = 7;

    const niveles = Array.from({ length: numNiveles }).map((_, idx) => {
      const n = idx + 1;
      return {
        numeroNivel: n,
        nombreNivel: `Nivel ${n}: ${getNivelName(n)}`,
        objetivoEspecifico: `Desarrollo de capacidades físicas y adaptación para fase ${n}`,
        duracionSugeridaSemanas: 4,
        criteriosDeProgreso: `Dominio técnico en ejercicios principales con RPE 7-8 durante 3 semanas`,
        criteriosDeRegresion: `Dolor articular o fatiga neuromuscular persistente`,
        sesiones: [
          {
            nombre: `Sesión 1 - Torso / Empuje`,
            dia: input?.disponibilidad?.diasPreferidos?.[0] || "Lunes",
            calentamiento: "Movilidad articular escapular y activación dinámica con bandas (10 min)",
            ejercicios: [
              {
                nombre: "Press Banca Plano con Barra",
                grupoMuscular: "Pectoral / Tríceps",
                series: 4,
                repeticiones: "8-10",
                descansoSegundos: 90,
                tempo: "3-0-1-0",
                rpe: 8,
                instrucciones: "Pies firmes en el suelo, retracción escapular y trayectoria controlada",
              },
              {
                nombre: "Press Militar con Mancuernas",
                grupoMuscular: "Hombros",
                series: 3,
                repeticiones: "10-12",
                descansoSegundos: 75,
                tempo: "2-0-1-0",
                rpe: 7.5,
                instrucciones: "Posición sentada con respaldo, codos en plano escapular",
              },
            ],
            vueltaALaCalma: "Estiramientos estáticos de pectoral, tríceps y deltoides anterior",
          },
          {
            nombre: `Sesión 2 - Pierna / Tracción`,
            dia: input?.disponibilidad?.diasPreferidos?.[1] || "Miércoles",
            calentamiento: "Movilidad de cadera y tobillo, activación de glúteos (10 min)",
            ejercicios: [
              {
                nombre: "Sentadilla Goblet o Prensa",
                grupoMuscular: "Cuádriceps / Glúteos",
                series: 4,
                repeticiones: "10-12",
                descansoSegundos: 90,
                tempo: "3-1-1-0",
                rpe: 8,
                instrucciones: "Descenso controlado manteniendo columna neutra",
              },
            ],
            vueltaALaCalma: "Descompresión lumbar y estiramiento de isquiosurales",
          },
        ],
      };
    });

    // Generar 20 recetas estructuradas con ingredientes, cantidades y macros
    let numRecetas = 20;
    if (this.behavior === "LESS_THAN_20_RECIPES") numRecetas = 12;

    const pesoSocio = input?.medidasActuales?.pesoKg || 70;
    const tallaSocio = input?.medidasActuales?.tallaCm || 170;
    const edadSocio = input?.socio?.edad || 25;
    const sexoSocio = input?.socio?.sexo || "M";
    const objetivoSocio = input?.objetivos?.principal || "HIPERTROFIA";

    // Estimación nutricional científica (Mifflin-St Jeor + factor de actividad + objetivo)
    const bmr = sexoSocio === "F"
      ? (10 * pesoSocio) + (6.25 * tallaSocio) - (5 * edadSocio) - 161
      : (10 * pesoSocio) + (6.25 * tallaSocio) - (5 * edadSocio) + 5;
    const tdee = Math.round(bmr * 1.45);

    let caloriasObjetivo = tdee;
    let factorProt = 1.8;
    if (objetivoSocio === "HIPERTROFIA" || objetivoSocio === "FUERZA") {
      caloriasObjetivo = Math.round(tdee + 300);
      factorProt = 2.0;
    } else if (objetivoSocio === "PERDIDA_GRASA" || objetivoSocio === "RECOMPOSICION") {
      caloriasObjetivo = Math.round(tdee - 350);
      factorProt = 2.2;
    }

    const proteinasObjetivo = Math.round(pesoSocio * factorProt);
    const grasasObjetivo = Math.round((caloriasObjetivo * 0.25) / 9);
    const carbohidratosObjetivo = Math.round((caloriasObjetivo - (proteinasObjetivo * 4) - (grasasObjetivo * 9)) / 4);

    const momentos = [
      "DESAYUNO",
      "ALMUERZO",
      "CENA",
      "SNACK_PRE",
      "SNACK_POST",
      "SNACK_MEDIA_MANANA",
      "SNACK_MEDIA_TARDE",
    ] as const;

    const recetasPlantillas = [
      {
        nombre: "Omelette de claras con avena y palta",
        momento: "DESAYUNO" as const,
        minutos: 15,
        porcion: { cantidad: 1, unidad: "plato", descripcion: "1 porción completa (~320 g)" },
        ingredientesDetalle: [
          { nombre: "Claras de huevo pasteurizadas", cantidad: 150, unidad: "ml" },
          { nombre: "Huevo entero", cantidad: 1, unidad: "unidad" },
          { nombre: "Avena en hojuelas", cantidad: 45, unidad: "g" },
          { nombre: "Palta / Aguacate fresco", cantidad: 40, unidad: "g" },
          { nombre: "Espinacas baby", cantidad: 50, unidad: "g" },
        ],
        macros: { caloriasKcal: 410, proteinasG: 32, carbohidratosG: 34, grasasG: 16 },
      },
      {
        nombre: "Pechuga de pollo a la plancha con arroz integral y brócoli",
        momento: "ALMUERZO" as const,
        minutos: 25,
        porcion: { cantidad: 1, unidad: "plato", descripcion: "1 plato balanceado (~420 g)" },
        ingredientesDetalle: [
          { nombre: "Pechuga de pollo magra", cantidad: 160, unidad: "g" },
          { nombre: "Arroz integral cocido", cantidad: 130, unidad: "g" },
          { nombre: "Brócoli al vapor", cantidad: 100, unidad: "g" },
          { nombre: "Aceite de oliva virgen extra", cantidad: 8, unidad: "ml" },
        ],
        macros: { caloriasKcal: 535, proteinasG: 46, carbohidratosG: 45, grasasG: 17 },
      },
      {
        nombre: "Filete de pescado blanco al horno con camote y ensalada",
        momento: "CENA" as const,
        minutos: 25,
        porcion: { cantidad: 1, unidad: "plato", descripcion: "1 plato ligero (~380 g)" },
        ingredientesDetalle: [
          { nombre: "Filete de pescado blanco (tilapia o corvina)", cantidad: 170, unidad: "g" },
          { nombre: "Camote / Batata horneada", cantidad: 100, unidad: "g" },
          { nombre: "Ensalada verde mixta", cantidad: 80, unidad: "g" },
          { nombre: "Aceite de oliva", cantidad: 6, unidad: "ml" },
        ],
        macros: { caloriasKcal: 430, proteinasG: 40, carbohidratosG: 35, grasasG: 14 },
      },
      {
        nombre: "Batido proteico con plátano y crema de maní",
        momento: "SNACK_PRE" as const,
        minutos: 5,
        porcion: { cantidad: 1, unidad: "vaso", descripcion: "1 vaso grande (~350 ml)" },
        ingredientesDetalle: [
          { nombre: "Proteína de suero (Whey)", cantidad: 30, unidad: "g" },
          { nombre: "Plátano maduro", cantidad: 1, unidad: "unidad" },
          { nombre: "Crema de maní natural", cantidad: 15, unidad: "g" },
          { nombre: "Bebida vegetal de almendras sin azúcar", cantidad: 200, unidad: "ml" },
        ],
        macros: { caloriasKcal: 340, proteinasG: 28, carbohidratosG: 35, grasasG: 10 },
      },
      {
        nombre: "Yogurt griego natural con frutos rojos y nueces",
        momento: "SNACK_POST" as const,
        minutos: 5,
        porcion: { cantidad: 1, unidad: "bowl", descripcion: "1 bowl mediano (~250 g)" },
        ingredientesDetalle: [
          { nombre: "Yogurt griego natural sin azúcar", cantidad: 180, unidad: "g" },
          { nombre: "Arándanos y fresas frescas", cantidad: 60, unidad: "g" },
          { nombre: "Nueces picadas", cantidad: 15, unidad: "g" },
        ],
        macros: { caloriasKcal: 260, proteinasG: 20, carbohidratosG: 18, grasasG: 12 },
      },
    ];

    const recetas = Array.from({ length: numRecetas }).map((_, idx) => {
      const id = this.behavior === "DUPLICATE_RECIPES" && idx > 5 ? "REC-DUPLICADA" : `REC-${idx + 1}`;
      const plantilla = recetasPlantillas[idx % recetasPlantillas.length];
      const momento = momentos[idx % momentos.length];

      const ingredientesResumen = plantilla.ingredientesDetalle.map(
        (ing) => `${ing.nombre} ${ing.cantidad} ${ing.unidad}`
      );

      return {
        idReceta: id,
        nombre: `${plantilla.nombre} #${idx + 1}`,
        momentoSugerido: momento,
        tiempoPreparacionMinutos: plantilla.minutos,
        porcion: plantilla.porcion,
        ingredientesDetalle: plantilla.ingredientesDetalle,
        macrosPorcion: plantilla.macros,
        ingredientes: ingredientesResumen,
        instrucciones: [
          "Paso 1: Lavar y preparar los ingredientes frescos pesando las porciones exactas indicadas.",
          "Paso 2: Cocinar a la plancha, horno o vapor a fuego medio controlando los tiempos.",
          "Paso 3: Servir en plato según la porción indicada y consumir caliente o fresco.",
        ],
        porciones: plantilla.porcion.cantidad,
        opcionesSustitucion: "Puede sustituir la fuente proteica por otra opción magra equivalente respetando el gramaje indicado.",
        beneficioClave: "Aporte óptimo y balanceado de macronutrientes adaptado a los requerimientos calóricos del socio.",
      };
    });

    const mockOutput: PlanningAIOutput = {
      metadataGeneracion: {
        versionSchema: "2.0",
        timestamp: new Date().toISOString(),
        resumenEstrategia: `Planificación personalizada orientada a ${input?.objetivos?.principal || "HIPERTROFIA"} con enfoque en nivel ${input?.objetivos?.nivel || "INTERMEDIO"}.`,
        nivelInicialRecomendado: input?.objetivos?.nivel === "PRINCIPIANTE" ? 1 : input?.objetivos?.nivel === "INTERMEDIO" ? 2 : 3,
        justificacionNivelInicial: `Recomendado según tiempo entrenando (${input?.objetivos?.tiempoEntrenando || "No declarado"}) y experiencia previa.`,
      },
      planEntrenamiento: {
        titulo: `Plan de Entrenamiento Personalizado — ${input?.objetivos?.principal || "HIPERTROFIA"}`,
        descripcionGeneral: `Programa progresivo de 6 niveles con frecuencia de ${input?.disponibilidad?.diasPorSemana || 3} días por semana.`,
        splitSugerido: (input?.disponibilidad?.diasPorSemana || 3) >= 4 ? "Torso / Pierna" : "Full Body",
        frecuenciaSemanal: input?.disponibilidad?.diasPorSemana || 3,
        niveles,
      },
      planAlimentacion: {
        titulo: `Plan Alimentario Sugerido — 20+ Recetas Personalizadas`,
        descripcionGeneral: `Guía alimentaria orientativa adaptada a preferencia ${input?.alimentacionDeclarada?.preferencia || "Omnívoro"} y objetivo ${objetivoSocio}.`,
        lineamientosGenerales: [
          "Priorizar alimentos enteros, magros y no ultraprocesados.",
          "Distribuir la ingesta proteica en 3 a 5 tomas diarias para optimizar la síntesis muscular.",
          "Ajustar la ingesta hídrica según la intensidad del entrenamiento diario.",
        ],
        recomendacionHidratacion: `Consumir aproximadamente ${input?.alimentacionDeclarada?.consumoAguaLitrosPorDia || 2.5} litros de agua al día.`,
        objetivosNutricionalesDiarios: {
          caloriasObjetivoKcal: caloriasObjetivo,
          proteinasObjetivoG: proteinasObjetivo,
          carbohidratosObjetivoG: carbohidratosObjetivo,
          grasasObjetivoG: grasasObjetivo,
          distribucionCaloricaPorcentaje: {
            proteinas: Math.round((proteinasObjetivo * 4 / caloriasObjetivo) * 100),
            carbohidratos: Math.round((carbohidratosObjetivo * 4 / caloriasObjetivo) * 100),
            grasas: Math.round((grasasObjetivo * 9 / caloriasObjetivo) * 100),
          },
          resumenEstrategiaNutricional: `Estrategia nutricional estimada para socio de ${pesoSocio} kg con meta de ${objetivoSocio}.`,
        },
        recetas,
      },
      evaluacionSeguridad: {
        requiresHumanReview: Boolean(input?.entrenamiento?.lesionesDeclaradas || input?.alimentacionDeclarada?.alergiasIntolerancias),
        banderasAdvertencia: input?.entrenamiento?.lesionesDeclaradas
          ? [`Lesión o molestia declarada: ${input.entrenamiento.lesionesDeclaradas}`]
          : [],
        observacionesMedicasDeclaradas: input?.entrenamiento?.lesionesDeclaradas || "Ninguna lesión declarada",
        alergiasDetectadasYMitigadas: input?.alimentacionDeclarada?.alergiasIntolerancias
          ? [input.alimentacionDeclarada.alergiasIntolerancias]
          : [],
      },
    };

    return {
      success: true,
      rawText: JSON.stringify(mockOutput, null, 2),
      metrics: {
        promptTokens: 1850,
        completionTokens: 2450,
        tiempoGeneracionMs: Date.now() - startTime,
      },
    };
  }
}

function getNivelName(n: number): string {
  const names = [
    "Adaptación Anatómica y Aprendizaje Técnico",
    "Acondicionamiento y Capacidad de Trabajo",
    "Sobrecarga Progresiva Fundamental",
    "Especialización e Intensificación",
    "Consolidación y Máximo Estímulo",
    "Rendimiento Avanzado y Periodización",
  ];
  return names[n - 1] || `Fase ${n}`;
}
