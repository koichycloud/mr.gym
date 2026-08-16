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

    // Generar 20 recetas o cantidad según behavior
    let numRecetas = 20;
    if (this.behavior === "LESS_THAN_20_RECIPES") numRecetas = 12;

    const momentos = ["DESAYUNO", "ALMUERZO", "CENA", "SNACK_PRE", "SNACK_POST"] as const;
    const recetas = Array.from({ length: numRecetas }).map((_, idx) => {
      const id = this.behavior === "DUPLICATE_RECIPES" && idx > 5 ? "REC-DUPLICADA" : `REC-${idx + 1}`;
      const momento = momentos[idx % momentos.length];
      return {
        idReceta: id,
        nombre: `Receta Saludable #${idx + 1} (${momento})`,
        momentoSugerido: momento,
        tiempoPreparacionMinutos: 15,
        ingredientes: [
          `Ingrediente principal balanceado 150g`,
          `Vegetales o guarnición fresca 100g`,
          `Grasa saludable (aceite de oliva / aguacate) 10g`,
        ],
        instrucciones: [
          "Paso 1: Lavar y cortar los ingredientes frescos.",
          "Paso 2: Cocinar a la plancha o vapor a fuego medio durante 8-10 minutos.",
          "Paso 3: Servir tibio y acompañar con agua fresca.",
        ],
        porciones: 1,
        opcionesSustitucion: "Puede sustituir la proteína por pechuga de pollo, tofu o claras de huevo",
        beneficioClave: "Aporte óptimo de macronutrientes y micronutrientes para el objetivo declarado",
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
        titulo: `Plan Alimentario Sugerido — 20+ Recetas Equilibradas`,
        descripcionGeneral: `Guía alimentaria orientativa adaptada a preferencia ${input?.alimentacionDeclarada?.preferencia || "Omnívoro"}.`,
        lineamientosGenerales: [
          "Priorizar alimentos enteros y no ultraprocesados.",
          "Distribuir la ingesta proteica a lo largo de las comidas del día.",
          "Consumir variedad de vegetales y frutas de temporada.",
        ],
        recomendacionHidratacion: `Consumir aproximadamente ${input?.alimentacionDeclarada?.consumoAguaLitrosPorDia || 2.5} litros de agua al día.`,
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
