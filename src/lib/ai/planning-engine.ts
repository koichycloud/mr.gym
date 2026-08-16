import prisma from "../prisma";
import { collectPlanningData } from "./data-collector";
import { sanitizePlanningAIInput } from "./sanitizer";
import { buildPlanningPrompt } from "./prompt-builder";
import { parseAndValidateAIOutput } from "./parser";
import { evaluatePlanningSafety } from "./safety-evaluator";
import { getAIPlanningProvider } from "./provider-factory";
import { PlanningEngineOptions, PlanningEngineResult, AIPlanningProvider } from "./types";

/**
 * Motor central de planificación con Inteligencia Artificial.
 * Orquesta la recopilación de datos, sanitización, ensamblado de prompt,
 * invocación del proveedor IA, validación de esquemas Zod, evaluación de
 * seguridad y registro transaccional en la tabla GeneracionIA.
 */
export async function executePlanningGeneration(
  socioId: string,
  options: PlanningEngineOptions = {}
): Promise<PlanningEngineResult> {
  const provider = typeof options.provider === "object" && options.provider !== null
    ? (options.provider as AIPlanningProvider)
    : getAIPlanningProvider();

  // 1. Recopilación de datos de la base de datos
  const rawData = await collectPlanningData(socioId);

  // 2. Sanitización y eliminación estricta de PII (PlanningAIInput)
  const sanitizedInput = sanitizePlanningAIInput(rawData);

  // 3. Ensamblado del prompt estructurado
  const prompt = buildPlanningPrompt(sanitizedInput);

  // Validar si el usuarioId existe físicamente en BD (para evitar FK violations con mocks o tokens de test)
  let validUsuarioId: string | null = null;
  if (options.userId) {
    const userRecord = await prisma.user.findUnique({
      where: { id: options.userId },
      select: { id: true },
    });
    if (userRecord) validUsuarioId = userRecord.id;
  }

  // 4. Invocación del proveedor IA (Mock o Real según configuración)
  const aiResponse = await provider.generateStructuredPlan(sanitizedInput, prompt);

  // 5. Manejo de fallo a nivel de comunicación del proveedor (Error / Timeout)
  if (!aiResponse.success || !aiResponse.rawText) {
    const errorMsg = aiResponse.error || "Fallo desconocido en la comunicación con el proveedor IA.";

    const errorRecord = await prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en PerfilPlanificacion para serializar la asignación de correlativos
      await tx.$queryRawUnsafe(
        `SELECT id FROM "PerfilPlanificacion" WHERE id = $1 FOR UPDATE`,
        rawData.perfil.id
      );

      const maxResult = await tx.$queryRawUnsafe<{ max_num: number | null }[]>(
        `SELECT MAX("numeroGeneracion") as max_num FROM "GeneracionIA" WHERE "perfilPlanificacionId" = $1`,
        rawData.perfil.id
      );
      const numeroGeneracion = Number(maxResult[0]?.max_num || 0) + 1;

      return await tx.generacionIA.create({
        data: {
          socioId: rawData.socio.id,
          perfilPlanificacionId: rawData.perfil.id,
          entrenadorId: rawData.perfil.entrenadorId,
          usuarioId: validUsuarioId,
          numeroGeneracion,
          modeloUtilizado: provider.name,
          versionSchema: "2.0",
          estado: "ERROR",
          requiresHumanReview: true,
          banderasAdvertencia: [errorMsg],
          promptTokens: aiResponse.metrics?.promptTokens || null,
          completionTokens: aiResponse.metrics?.completionTokens || null,
          tiempoGeneracionMs: aiResponse.metrics?.tiempoGeneracionMs || null,
          inputSnapshot: sanitizedInput as any,
          rawOutput: { error: errorMsg, isTimeout: Boolean(aiResponse.isTimeout) },
        },
      });
    });

    return {
      success: false,
      generacionId: errorRecord.id,
      perfilId: rawData.perfil.id,
      socioId: rawData.socio.id,
      requiresHumanReview: true,
      banderasAdvertencia: [errorMsg],
      metrics: aiResponse.metrics,
      error: errorMsg,
    };
  }

  // 6. Parseo JSON y Validación estricta con Zod
  const parseResult = parseAndValidateAIOutput(aiResponse.rawText);

  if (!parseResult.success || !parseResult.data) {
    const errorMsg = parseResult.error || "La respuesta del proveedor IA no cumplió con el schema validado.";

    const invalidRecord = await prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT id FROM "PerfilPlanificacion" WHERE id = $1 FOR UPDATE`,
        rawData.perfil.id
      );

      const maxResult = await tx.$queryRawUnsafe<{ max_num: number | null }[]>(
        `SELECT MAX("numeroGeneracion") as max_num FROM "GeneracionIA" WHERE "perfilPlanificacionId" = $1`,
        rawData.perfil.id
      );
      const numeroGeneracion = Number(maxResult[0]?.max_num || 0) + 1;

      return await tx.generacionIA.create({
        data: {
          socioId: rawData.socio.id,
          perfilPlanificacionId: rawData.perfil.id,
          entrenadorId: rawData.perfil.entrenadorId,
          usuarioId: validUsuarioId,
          numeroGeneracion,
          modeloUtilizado: provider.name,
          versionSchema: "2.0",
          estado: "ERROR",
          requiresHumanReview: true,
          banderasAdvertencia: [errorMsg],
          promptTokens: aiResponse.metrics?.promptTokens || null,
          completionTokens: aiResponse.metrics?.completionTokens || null,
          tiempoGeneracionMs: aiResponse.metrics?.tiempoGeneracionMs || null,
          inputSnapshot: sanitizedInput as any,
          rawOutput: parseResult.rawJson || { rawText: aiResponse.rawText },
        },
      });
    });

    return {
      success: false,
      generacionId: invalidRecord.id,
      perfilId: rawData.perfil.id,
      socioId: rawData.socio.id,
      requiresHumanReview: true,
      banderasAdvertencia: [errorMsg],
      metrics: aiResponse.metrics,
      error: errorMsg,
    };
  }

  // 7. Evaluación de Seguridad Biomecánica y Nutricional
  const safetyEvaluation = evaluatePlanningSafety(sanitizedInput, parseResult.data);

  // Actualizar banderas en el objeto resultante
  const finalizedOutput = {
    ...parseResult.data,
    evaluacionSeguridad: {
      requiresHumanReview: safetyEvaluation.requiresHumanReview,
      banderasAdvertencia: safetyEvaluation.banderasAdvertencia,
      observacionesMedicasDeclaradas: safetyEvaluation.observacionesMedicasDeclaradas,
      alergiasDetectadasYMitigadas: safetyEvaluation.alergiasDetectadasYMitigadas,
    },
  };

  // 8. Persistencia Atómica y Concurrente de la Generación Exitosa en GeneracionIA
  const generacionRecord = await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      `SELECT id FROM "PerfilPlanificacion" WHERE id = $1 FOR UPDATE`,
      rawData.perfil.id
    );

    const maxResult = await tx.$queryRawUnsafe<{ max_num: number | null }[]>(
      `SELECT MAX("numeroGeneracion") as max_num FROM "GeneracionIA" WHERE "perfilPlanificacionId" = $1`,
      rawData.perfil.id
    );
    const numeroGeneracion = Number(maxResult[0]?.max_num || 0) + 1;

    return await tx.generacionIA.create({
      data: {
        socioId: rawData.socio.id,
        perfilPlanificacionId: rawData.perfil.id,
        entrenadorId: rawData.perfil.entrenadorId,
        usuarioId: validUsuarioId,
        numeroGeneracion,
        modeloUtilizado: provider.name,
        versionSchema: finalizedOutput.metadataGeneracion.versionSchema,
        estado: "GENERADO",
        requiresHumanReview: safetyEvaluation.requiresHumanReview,
        banderasAdvertencia: safetyEvaluation.banderasAdvertencia as any,
        promptTokens: aiResponse.metrics?.promptTokens || null,
        completionTokens: aiResponse.metrics?.completionTokens || null,
        tiempoGeneracionMs: aiResponse.metrics?.tiempoGeneracionMs || null,
        inputSnapshot: sanitizedInput as any,
        rawOutput: finalizedOutput as any,
      },
    });
  });

  return {
    success: true,
    generacionId: generacionRecord.id,
    perfilId: rawData.perfil.id,
    socioId: rawData.socio.id,
    output: finalizedOutput,
    requiresHumanReview: safetyEvaluation.requiresHumanReview,
    banderasAdvertencia: safetyEvaluation.banderasAdvertencia,
    metrics: aiResponse.metrics,
  };
}
