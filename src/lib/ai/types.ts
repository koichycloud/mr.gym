import { PlanningAIInput, PlanningAIOutput } from "../validations";

export interface AIProviderMetrics {
  promptTokens?: number;
  completionTokens?: number;
  tiempoGeneracionMs?: number;
}

export interface AIProviderResponse {
  success: boolean;
  rawText?: string;
  metrics?: AIProviderMetrics;
  error?: string;
  isTimeout?: boolean;
}

export interface AIPlanningProvider {
  name: string;
  generateStructuredPlan(
    input: PlanningAIInput,
    prompt: { systemPrompt: string; userPrompt: string }
  ): Promise<AIProviderResponse>;
}

export interface PlanningEngineOptions {
  userId?: string;
  provider?: AIPlanningProvider;
  customSnapshotNote?: string;
}

export interface PlanningEngineResult {
  success: boolean;
  generacionId?: string;
  perfilId?: string;
  socioId?: string;
  output?: PlanningAIOutput;
  requiresHumanReview: boolean;
  banderasAdvertencia: string[];
  metrics?: AIProviderMetrics;
  error?: string;
}
