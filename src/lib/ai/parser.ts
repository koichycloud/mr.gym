import { PlanningAIOutput, planningAIOutputSchema } from "../validations";

export interface ParseResult {
  success: boolean;
  data?: PlanningAIOutput;
  rawJson?: any;
  error?: string;
  validationDetails?: any;
}

/**
 * Limpia y extrae un bloque JSON de una respuesta de texto generada por IA.
 */
export function extractJsonFromResponse(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("La respuesta del proveedor IA está vacía.");
  }

  let text = rawText.trim();

  // Remover bloques markdown ```json ... ``` o ``` ... ```
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    // Remover primera línea con ```json o ```
    lines.shift();
    // Remover última línea si termina con ```
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith("```")) {
      lines.pop();
    }
    text = lines.join("\n").trim();
  }

  // Buscar primer '{' y último '}' por si hay texto conversacional circundante
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  return text;
}

/**
 * Parsea el texto del proveedor y lo valida exhaustivamente contra el schema Zod.
 */
export function parseAndValidateAIOutput(rawText: string): ParseResult {
  let cleanedJsonString: string;
  let parsedObject: any;

  try {
    cleanedJsonString = extractJsonFromResponse(rawText);
  } catch (err: any) {
    return {
      success: false,
      error: `Error al extraer JSON: ${err.message}`,
    };
  }

  try {
    parsedObject = JSON.parse(cleanedJsonString);
  } catch (err: any) {
    return {
      success: false,
      error: `JSON sintácticamente inválido devuelto por el proveedor: ${err.message}`,
    };
  }

  // Validación estricta con Zod
  const zodValidation = planningAIOutputSchema.safeParse(parsedObject);

  if (!zodValidation.success) {
    const errorMessages = zodValidation.error.issues.map(
      (issue) => `[${issue.path.join(".") || "root"}]: ${issue.message}`
    );

    return {
      success: false,
      rawJson: parsedObject,
      error: `La respuesta IA no cumple con la estructura requerida:\n- ${errorMessages.slice(0, 5).join("\n- ")}`,
      validationDetails: zodValidation.error.format(),
    };
  }

  return {
    success: true,
    data: zodValidation.data,
    rawJson: parsedObject,
  };
}
