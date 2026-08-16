import { z } from "zod";

/**
 * Esquema de validación estricta para la configuración operativa del motor de IA.
 */
export const aiConfigSchema = z.object({
  provider: z.enum(["mock", "gemini"]).default("mock"),
  model: z.string().min(1).default("gemini-2.5-flash"),
  timeoutMs: z.coerce.number().int().min(1000).max(120000).default(90000),
  cooldownMsPerSocio: z.coerce.number().int().min(0).max(60000).default(3000),
  maxRequestsPerMinutePerSocio: z.coerce.number().int().min(1).max(60).default(10),
});

export type AIConfig = z.infer<typeof aiConfigSchema> & {
  isGeminiKeyConfigured: boolean;
  isLocalDev: boolean;
};

/**
 * Verifica si el entorno actual es desarrollo local aislado.
 * Impide cualquier llamada real a APIs externas en producción.
 */
export function isLocalDevEnvironment(): boolean {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (isProduction) return false;

  const dbUrl = process.env.DATABASE_URL || "";
  const isLocalDb =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("mr_gym_dev");

  return isLocalDb;
}

/**
 * Obtiene la configuración consolidada y validada del motor de IA.
 */
export function getAIConfig(): AIConfig {
  const rawProvider = (process.env.AI_PROVIDER || "mock").toLowerCase().trim();
  const provider = rawProvider === "gemini" ? "gemini" : "mock";

  const rawConfig = {
    provider,
    model: process.env.AI_MODEL || "gemini-2.5-flash",
    timeoutMs: process.env.AI_REQUEST_TIMEOUT_MS || 90000,
    cooldownMsPerSocio: process.env.AI_COOLDOWN_MS || 3000,
    maxRequestsPerMinutePerSocio: process.env.AI_MAX_RPM || 10,
  };

  const parsed = aiConfigSchema.safeParse(rawConfig);
  const validated = parsed.success
    ? parsed.data
    : {
        provider: "mock" as const,
        model: "gemini-3.5-flash",
        timeoutMs: 90000,
        cooldownMsPerSocio: 3000,
        maxRequestsPerMinutePerSocio: 10,
      };

  const apiKey = process.env.GEMINI_API_KEY;
  const isGeminiKeyConfigured = Boolean(apiKey && apiKey.trim().length > 0);
  const isLocalDev = isLocalDevEnvironment();

  return {
    ...validated,
    isGeminiKeyConfigured,
    isLocalDev,
  };
}

/**
 * Valida la consistencia de la configuración operativa antes de ejecutar llamadas.
 */
export function validateAIEnvironment(): { valid: boolean; error?: string } {
  const config = getAIConfig();

  if (config.provider === "gemini") {
    if (!config.isGeminiKeyConfigured) {
      return {
        valid: false,
        error: "Falta configuración de GEMINI_API_KEY. Configure la clave privada en las variables de entorno para habilitar llamadas reales.",
      };
    }
  }

  return { valid: true };
}

export interface AIDiagnosticReport {
  activeProvider: "mock" | "gemini";
  model: string;
  timeoutMs: number;
  isKeyConfigured: boolean;
  environmentAllowed: boolean;
  environmentType: "local_dev" | "production" | "other";
  status: "READY_FOR_MOCK" | "READY_FOR_REAL" | "BLOCKED_PRODUCTION" | "MISSING_KEY";
  readinessMessage: string;
}

/**
 * Retorna un reporte de diagnóstico seguro y observable sin exponer claves ni datos confidenciales.
 */
export function getAIDiagnostics(): AIDiagnosticReport {
  const config = getAIConfig();
  const envType = isLocalDevEnvironment()
    ? "local_dev"
    : process.env.NODE_ENV === "production"
    ? "production"
    : "other";

  let status: AIDiagnosticReport["status"] = "READY_FOR_MOCK";
  let readinessMessage = "Motor de IA listo y operando en modo MOCK seguro.";

  if (config.provider === "gemini") {
    if (!config.isGeminiKeyConfigured) {
      status = "MISSING_KEY";
      readinessMessage = "Proveedor Gemini configurado pero GEMINI_API_KEY no detectada. Configure su credencial para activar llamadas reales.";
    } else {
      status = "READY_FOR_REAL";
      readinessMessage = "Motor de IA configurado y listo para ejecución real con Gemini.";
    }
  }

  return {
    activeProvider: config.provider,
    model: config.model,
    timeoutMs: config.timeoutMs,
    isKeyConfigured: config.isGeminiKeyConfigured,
    environmentAllowed: true,
    environmentType: envType,
    status,
    readinessMessage,
  };
}
