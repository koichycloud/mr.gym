import { AIPlanningProvider } from "./types";
import { MockAIPlanningProvider } from "./mock-provider";
import { GeminiAIPlanningProvider } from "./gemini-provider";
import { getAIConfig } from "./config";

/**
 * Retorna la instancia del proveedor IA configurado para el entorno.
 * Por defecto retorna MockAIPlanningProvider a menos que AI_PROVIDER esté explícitamente configurado como 'gemini'.
 */
export function getAIPlanningProvider(): AIPlanningProvider {
  const config = getAIConfig();

  if (config.provider === "gemini") {
    return new GeminiAIPlanningProvider(undefined, config.timeoutMs, config.model);
  }

  // Proveedor por defecto: Mock seguro y controlado para desarrollo y testing
  return new MockAIPlanningProvider("VALID");
}
