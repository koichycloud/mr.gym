import { GoogleGenAI, Type } from "@google/genai";
import { AIPlanningProvider, AIProviderResponse, AIProviderMetrics } from "./types";
import { PlanningAIInput } from "../validations";

/**
 * Esquema JSON OpenAPI 3.0 para Structured Output oficial en Gemini.
 * Mapea 1:1 el contrato estricto de planningAIOutputSchema (6 niveles y 20+ recetas).
 */
export const PLANNING_AI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    metadataGeneracion: {
      type: Type.OBJECT,
      properties: {
        versionSchema: { type: Type.STRING },
        timestamp: { type: Type.STRING },
        resumenEstrategia: { type: Type.STRING },
        nivelInicialRecomendado: { type: Type.INTEGER },
        justificacionNivelInicial: { type: Type.STRING },
      },
      required: [
        "versionSchema",
        "timestamp",
        "resumenEstrategia",
        "nivelInicialRecomendado",
        "justificacionNivelInicial",
      ],
    },
    planEntrenamiento: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING },
        descripcionGeneral: { type: Type.STRING },
        splitSugerido: { type: Type.STRING },
        frecuenciaSemanal: { type: Type.INTEGER },
        niveles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              numeroNivel: { type: Type.INTEGER },
              nombreNivel: { type: Type.STRING },
              objetivoEspecifico: { type: Type.STRING },
              duracionSugeridaSemanas: { type: Type.INTEGER },
              criteriosDeProgreso: { type: Type.STRING },
              criteriosDeRegresion: { type: Type.STRING },
              sesiones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING },
                    dia: { type: Type.STRING },
                    calentamiento: { type: Type.STRING },
                    ejercicios: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nombre: { type: Type.STRING },
                          grupoMuscular: { type: Type.STRING },
                          series: { type: Type.INTEGER },
                          repeticiones: { type: Type.STRING },
                          descansoSegundos: { type: Type.INTEGER },
                          tempo: { type: Type.STRING },
                          rpe: { type: Type.NUMBER },
                          instrucciones: { type: Type.STRING },
                        },
                        required: [
                          "nombre",
                          "grupoMuscular",
                          "series",
                          "repeticiones",
                          "descansoSegundos",
                        ],
                      },
                    },
                    vueltaALaCalma: { type: Type.STRING },
                  },
                  required: ["nombre", "calentamiento", "ejercicios"],
                },
              },
            },
            required: [
              "numeroNivel",
              "nombreNivel",
              "objetivoEspecifico",
              "duracionSugeridaSemanas",
              "criteriosDeProgreso",
              "criteriosDeRegresion",
              "sesiones",
            ],
          },
        },
      },
      required: [
        "titulo",
        "descripcionGeneral",
        "frecuenciaSemanal",
        "niveles",
      ],
    },
    planAlimentacion: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING },
        descripcionGeneral: { type: Type.STRING },
        lineamientosGenerales: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        recomendacionHidratacion: { type: Type.STRING },
        recetas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              idReceta: { type: Type.STRING },
              nombre: { type: Type.STRING },
              momentoSugerido: { type: Type.STRING },
              tiempoPreparacionMinutos: { type: Type.INTEGER },
              ingredientes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              instrucciones: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              porciones: { type: Type.INTEGER },
              opcionesSustitucion: { type: Type.STRING },
              beneficioClave: { type: Type.STRING },
            },
            required: [
              "idReceta",
              "nombre",
              "momentoSugerido",
              "tiempoPreparacionMinutos",
              "ingredientes",
              "instrucciones",
              "porciones",
            ],
          },
        },
      },
      required: [
        "titulo",
        "descripcionGeneral",
        "lineamientosGenerales",
        "recomendacionHidratacion",
        "recetas",
      ],
    },
    evaluacionSeguridad: {
      type: Type.OBJECT,
      properties: {
        requiresHumanReview: { type: Type.BOOLEAN },
        banderasAdvertencia: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        observacionesMedicasDeclaradas: { type: Type.STRING },
        alergiasDetectadasYMitigadas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "requiresHumanReview",
        "banderasAdvertencia",
        "observacionesMedicasDeclaradas",
        "alergiasDetectadasYMitigadas",
      ],
    },
  },
  required: [
    "metadataGeneracion",
    "planEntrenamiento",
    "planAlimentacion",
    "evaluacionSeguridad",
  ],
};

import { isLocalDevEnvironment, getAIConfig } from "./config";

/**
 * Proveedor real de planificación personalizada utilizando el SDK oficial @google/genai
 * y el modelo gemini-3.6-flash con Structured Output oficial JSON Schema.
 */
export class GeminiAIPlanningProvider implements AIPlanningProvider {
  public readonly name: string;
  private readonly apiKey: string | null;
  private readonly timeoutMs: number;

  constructor(apiKey?: string, timeoutMs?: number, modelName?: string) {
    const config = getAIConfig();
    // Sanitización defensiva: eliminar CR/LF y espacios que puedan contaminar el nombre del modelo
    this.name = (modelName || config.model || "gemini-3.6-flash").trim();
    this.apiKey = apiKey !== undefined ? apiKey : (process.env.GEMINI_API_KEY || null);
    this.timeoutMs = typeof timeoutMs === "number" ? timeoutMs : config.timeoutMs;
  }

  async generateStructuredPlan(
    input: PlanningAIInput,
    prompt: { systemPrompt: string; userPrompt: string }
  ): Promise<AIProviderResponse> {
    // 1. Verificación de API Key
    if (!this.apiKey || this.apiKey.trim() === "") {
      return {
        success: false,
        error: "Falta configuración de GEMINI_API_KEY. Configure la clave privada en las variables de entorno para habilitar llamadas reales.",
      };
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const ai = new GoogleGenAI({ apiKey: this.apiKey });

      // Llamada oficial client.models.generateContent con Structured Output y cancelación real
      const response = await ai.models.generateContent({
        model: this.name,
        contents: prompt.userPrompt,
        config: {
          systemInstruction: prompt.systemPrompt,
          responseMimeType: "application/json",
          responseSchema: PLANNING_AI_RESPONSE_SCHEMA,
          abortSignal: controller.signal,
        },
      });

      clearTimeout(timeoutId);
      const elapsedTime = Date.now() - startTime;

      const rawText = response.text;
      if (!rawText) {
        return {
          success: false,
          error: "El proveedor Gemini no devolvió contenido en la respuesta.",
          metrics: {
            tiempoGeneracionMs: elapsedTime,
          },
        };
      }

      const metrics: AIProviderMetrics = {
        promptTokens: response.usageMetadata?.promptTokenCount || undefined,
        completionTokens: response.usageMetadata?.candidatesTokenCount || undefined,
        tiempoGeneracionMs: elapsedTime,
      };

      return {
        success: true,
        rawText,
        metrics,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      const elapsedTime = Date.now() - startTime;
      const errorMsg = error?.message || error?.name || "Error desconocido en el proveedor Gemini.";
      const isTimeout =
        error?.name === "AbortError" ||
        errorMsg.includes("abort") ||
        errorMsg.includes("Timeout");

      // Sanitizar mensaje de error para no exponer credenciales ni stack traces
      let sanitizedError = "Error al comunicarse con Gemini.";
      if (isTimeout) {
        sanitizedError = `Tiempo de espera agotado (${this.timeoutMs / 1000}s) comunicándose con Gemini.`;
      } else if (
        errorMsg.includes("API key not valid") ||
        errorMsg.includes("API_KEY_INVALID") ||
        errorMsg.includes("401") ||
        errorMsg.includes("403")
      ) {
        sanitizedError = "La clave GEMINI_API_KEY configurada localmente no es válida o carece de permisos.";
      } else if (
        errorMsg.includes("429") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("Quota")
      ) {
        sanitizedError = "Límite de cuota o tasa (Rate Limit) alcanzado en la API de Gemini.";
      } else if (errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) {
        sanitizedError = "El servicio de Gemini se encuentra temporalmente no disponible (503).";
      } else {
        sanitizedError = `Fallo en el servicio Gemini: ${errorMsg.slice(0, 150)}`;
      }

      return {
        success: false,
        error: sanitizedError,
        isTimeout,
        metrics: {
          tiempoGeneracionMs: elapsedTime,
        },
      };
    }
  }
}
