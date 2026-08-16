"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import { planningAIOutputSchema } from "@/lib/validations";
import { executePlanningGeneration, AIPlanningProvider } from "@/lib/ai";
import { z } from "zod";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN PARA SERVER ACTIONS
// ============================================================================

const aprobarGeneracionSchema = z.object({
  generacionId: z.string().min(1, "El ID de la generación es obligatorio."),
  confirmacionRevisionHumana: z.boolean().optional(),
  observacionesEntrenador: z.string().max(1000).optional().nullable(),
});

const rechazarGeneracionSchema = z.object({
  generacionId: z.string().min(1, "El ID de la generación es obligatorio."),
  motivoRechazo: z.string().min(1, "Debe especificar el motivo del rechazo.").max(500),
});

const archivarGeneracionSchema = z.object({
  generacionId: z.string().min(1, "El ID de la generación es obligatorio."),
});

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignorar si se ejecuta fuera del contexto de una petición HTTP de Next.js (p.ej. pruebas automatizadas)
  }
}

// Control en memoria para anti-doble clic y ráfagas por socio
const activeGenerationsInFlight = new Set<string>();
const lastGenerationTimestampPerSocio = new Map<string, number>();

function acquireGenerationLock(
  socioId: string,
  cooldownMs = 1500,
  bypass = false
): { acquired: boolean; reason?: string } {
  if (bypass || (process.env.AUTH_BYPASS_FOR_TEST === "true" && process.env.ENABLE_TEST_COOLDOWN !== "true")) {
    return { acquired: true };
  }

  const now = Date.now();
  if (activeGenerationsInFlight.has(socioId)) {
    return {
      acquired: false,
      reason: "Ya existe una solicitud de generación en curso para este socio. Por favor espere un momento.",
    };
  }

  const lastTime = lastGenerationTimestampPerSocio.get(socioId);
  if (lastTime && now - lastTime < cooldownMs) {
    return {
      acquired: false,
      reason: "Solicitud enviada demasiado rápido. Por favor espere unos segundos antes de reintentar.",
    };
  }

  activeGenerationsInFlight.add(socioId);
  lastGenerationTimestampPerSocio.set(socioId, now);
  return { acquired: true };
}

function releaseGenerationLock(socioId: string) {
  activeGenerationsInFlight.delete(socioId);
}

// ============================================================================
// 1. SOLICITAR GENERACIÓN DE PLAN IA (PROPUESTA NO MATERIALIZADA)
// ============================================================================

export async function solicitarGeneracionPlanIA(
  socioId: string,
  options?: { provider?: AIPlanningProvider; bypassLock?: boolean }
) {
  // 1. Autorización a nivel backend
  try {
    const session = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId || typeof socioId !== "string") {
      return { success: false, error: "El ID del socio es inválido." };
    }

    // 2. Control anti-doble clic y rate limiting en servidor
    const lock = acquireGenerationLock(socioId, 1500, options?.bypassLock);
    if (!lock.acquired) {
      return { success: false, error: lock.reason };
    }

    try {
      // 3. Validar existencia del socio
      const socio = await prisma.socio.findUnique({
        where: { id: socioId },
        select: { id: true, codigo: true, nombres: true, apellidos: true },
      });
      if (!socio) {
        return { success: false, error: "El socio no existe." };
      }

      // 4. Validar existencia de PerfilPlanificacion activo
      const perfilActivo = await prisma.perfilPlanificacion.findFirst({
        where: { socioId, activo: true },
        select: { id: true, version: true, entrenadorId: true },
      });
      if (!perfilActivo) {
        return {
          success: false,
          error: `El socio ${socio.codigo} no cuenta con un Perfil de Planificación activo vigente.`,
        };
      }

      // 5. Invocar el motor central de IA
      const engineResult = await executePlanningGeneration(socioId, {
        userId: session?.user?.id,
        provider: options?.provider,
      });

      if (!engineResult.success) {
        await logAction(
          "GENERAR_PLAN_IA_ERROR",
          `Intento fallido de generación IA para socio ${socio.codigo} (${socio.id}). Motivo: ${engineResult.error}`
        );
        return {
          success: false,
          generacionId: engineResult.generacionId,
          error: engineResult.error,
          requiresHumanReview: true,
          banderasAdvertencia: engineResult.banderasAdvertencia,
        };
      }

      // 6. Registrar auditoría de generación de propuesta
      await logAction(
        "GENERAR_PLAN_IA",
        `Propuesta de plan IA generada para socio ${socio.codigo} (Generación ID: ${engineResult.generacionId}, Perfil v${perfilActivo.version}). Revisión requerida: ${engineResult.requiresHumanReview}`
      );

      safeRevalidate(`/socios/${socioId}`);

      return {
        success: true,
        generacionId: engineResult.generacionId,
        perfilId: engineResult.perfilId,
        socioId: engineResult.socioId,
        output: engineResult.output,
        requiresHumanReview: engineResult.requiresHumanReview,
        banderasAdvertencia: engineResult.banderasAdvertencia,
        metrics: engineResult.metrics,
      };
    } finally {
      releaseGenerationLock(socioId);
    }
  } catch (error: any) {
    console.error("Error en solicitarGeneracionPlanIA:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al solicitar la generación del plan IA.",
    };
  }
}

// ============================================================================
// 2. OBTENER HISTORIAL DE GENERACIONES DE UN SOCIO
// ============================================================================

export async function obtenerGeneracionesSocio(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId) {
      return { success: false, error: "ID de socio requerido." };
    }

    const generaciones = await prisma.generacionIA.findMany({
      where: { socioId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        socioId: true,
        perfilPlanificacionId: true,
        entrenadorId: true,
        numeroGeneracion: true,
        modeloUtilizado: true,
        versionSchema: true,
        estado: true,
        requiresHumanReview: true,
        banderasAdvertencia: true,
        promptTokens: true,
        completionTokens: true,
        tiempoGeneracionMs: true,
        fechaAprobacion: true,
        motivoRechazo: true,
        motivoRegeneracion: true,
        createdAt: true,
        perfilPlanificacion: {
          select: {
            version: true,
            objetivoPrincipal: true,
            nivel: true,
          },
        },
        entrenador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            rol: true,
          },
        },
        usuario: {
          select: {
            id: true,
            username: true,
          },
        },
        aprobadoPor: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return { success: true, data: generaciones };
  } catch (error: any) {
    console.error("Error en obtenerGeneracionesSocio:", error);
    return { success: false, error: error.message || "Error al obtener generaciones del socio." };
  }
}

// ============================================================================
// 3. OBTENER DETALLE DE UNA GENERACIÓN POR ID (SOLO LECTURA SEGURO)
// ============================================================================

export async function obtenerGeneracionPorId(generacionId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!generacionId) {
      return { success: false, error: "ID de generación requerido." };
    }

    const generacion = await prisma.generacionIA.findUnique({
      where: { id: generacionId },
      include: {
        perfilPlanificacion: true,
        entrenador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            rol: true,
          },
        },
        usuario: {
          select: {
            id: true,
            username: true,
          },
        },
        aprobadoPor: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!generacion) {
      return { success: false, error: "Generación IA no encontrada." };
    }

    return {
      success: true,
      data: {
        id: generacion.id,
        socioId: generacion.socioId,
        perfilPlanificacionId: generacion.perfilPlanificacionId,
        entrenadorId: generacion.entrenadorId,
        numeroGeneracion: generacion.numeroGeneracion,
        modeloUtilizado: generacion.modeloUtilizado,
        versionSchema: generacion.versionSchema,
        estado: generacion.estado,
        requiresHumanReview: generacion.requiresHumanReview,
        banderasAdvertencia: generacion.banderasAdvertencia,
        promptTokens: generacion.promptTokens,
        completionTokens: generacion.completionTokens,
        tiempoGeneracionMs: generacion.tiempoGeneracionMs,
        inputSnapshot: generacion.inputSnapshot,
        rawOutput: generacion.rawOutput,
        fechaAprobacion: generacion.fechaAprobacion,
        motivoRechazo: generacion.motivoRechazo,
        motivoRegeneracion: generacion.motivoRegeneracion,
        createdAt: generacion.createdAt,
        perfilPlanificacion: generacion.perfilPlanificacion,
        entrenador: generacion.entrenador,
        usuario: generacion.usuario,
        aprobadoPor: generacion.aprobadoPor,
      },
    };
  } catch (error: any) {
    console.error("Error en obtenerGeneracionPorId:", error);
    return { success: false, error: error.message || "Error al consultar la generación IA." };
  }
}

// ============================================================================
// 4. APROBAR GENERACIÓN IA Y MATERIALIZAR PLANES (TRANSACCIÓN ATÓMICA)
// ============================================================================

export async function aprobarGeneracionIA(input: z.infer<typeof aprobarGeneracionSchema>) {
  try {
    const session = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = aprobarGeneracionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Parámetros inválidos." };
    }
    const { generacionId, confirmacionRevisionHumana, observacionesEntrenador } = parsed.data;

    // 1. Obtener la generación fuera de la transacción para validación previa
    const generacion = await prisma.generacionIA.findUnique({
      where: { id: generacionId },
    });

    if (!generacion) {
      return { success: false, error: "La generación IA no existe." };
    }

    // 2. Validar estado de la generación (Idempotencia y estados prohibidos)
    if (generacion.estado === "APROBADO") {
      return { success: false, error: "La generación IA ya fue aprobada previamente." };
    }
    if (generacion.estado === "RECHAZADO") {
      return { success: false, error: "No se puede aprobar una generación que ha sido rechazada." };
    }
    if (generacion.estado === "ARCHIVADO") {
      return { success: false, error: "No se puede aprobar una generación archivada." };
    }
    if (generacion.estado === "ERROR") {
      return { success: false, error: "No se puede aprobar una generación que terminó en estado de error." };
    }
    if (!["GENERADO", "EN_REVISION"].includes(generacion.estado)) {
      return { success: false, error: `Estado no válido para aprobación: ${generacion.estado}` };
    }

    // 3. Regla estricta de Human Review: Exige confirmación explícita si hay banderas
    if (generacion.requiresHumanReview && !confirmacionRevisionHumana) {
      return {
        success: false,
        error:
          "Esta generación contiene advertencias de seguridad o salud y requiere confirmación explícita de revisión humana para ser aprobada.",
      };
    }

    // 4. Re-validar la estructura del rawOutput con Zod antes de persistir
    const zodValidation = planningAIOutputSchema.safeParse(generacion.rawOutput);
    if (!zodValidation.success) {
      return {
        success: false,
        error: "El contenido de la propuesta no cumple con el schema de salida requerido (6 niveles y 20+ recetas).",
      };
    }
    const output = zodValidation.data;

    // Validar si el usuarioId aprobador existe físicamente en BD (evita fallos de FK en testing)
    let validAprobadorId: string | null = null;
    if (session?.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });
      if (userRecord) validAprobadorId = userRecord.id;
    }

    // 5. Transacción atómica de aprobación y materialización con bloqueo pesimista
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      // 5.1. Bloqueo pesimista sobre el Socio para serializar cualquier intento concurrente de materialización
      await tx.$queryRawUnsafe(
        `SELECT id FROM "Socio" WHERE id = $1 FOR UPDATE`,
        generacion.socioId
      );

      // 5.2. Re-verificar estado de la GeneracionIA dentro de la transacción bajo el candado
      const currentGen = await tx.generacionIA.findUnique({
        where: { id: generacion.id },
      });

      if (!currentGen) {
        throw new Error("La generación IA no existe.");
      }
      if (currentGen.estado === "APROBADO") {
        throw new Error("La generación IA ya fue aprobada previamente.");
      }
      if (currentGen.estado === "RECHAZADO") {
        throw new Error("No se puede aprobar una generación que ha sido rechazada.");
      }
      if (currentGen.estado === "ARCHIVADO") {
        throw new Error("No se puede aprobar una generación archivada.");
      }
      if (currentGen.estado === "ERROR") {
        throw new Error("No se puede aprobar una generación que terminó en estado de error.");
      }
      if (!["GENERADO", "EN_REVISION"].includes(currentGen.estado)) {
        throw new Error(`Estado no válido para aprobación: ${currentGen.estado}`);
      }

      // 5.3. Cerrar y archivar PlanEntrenamiento activo anterior del socio si existe
      await tx.planEntrenamiento.updateMany({
        where: { socioId: generacion.socioId, activo: true },
        data: { activo: false, fechaFin: now, estado: "ARCHIVADO" },
      });

      // 5.4. Cerrar y archivar PlanAlimentacion activo anterior del socio si existe
      await tx.planAlimentacion.updateMany({
        where: { socioId: generacion.socioId, activo: true },
        data: { activo: false, fechaFin: now, estado: "ARCHIVADO" },
      });

      // 5.5. Calcular correlativos de versión de forma monotónica y atómica
      const maxEntrResult = await tx.$queryRawUnsafe<{ max_ver: number | null }[]>(
        `SELECT MAX(version) as max_ver FROM "PlanEntrenamiento" WHERE "socioId" = $1`,
        generacion.socioId
      );
      const versionEntr = Number(maxEntrResult[0]?.max_ver || 0) + 1;

      const maxAlimResult = await tx.$queryRawUnsafe<{ max_ver: number | null }[]>(
        `SELECT MAX(version) as max_ver FROM "PlanAlimentacion" WHERE "socioId" = $1`,
        generacion.socioId
      );
      const versionAlim = Number(maxAlimResult[0]?.max_ver || 0) + 1;

      // 5.6. Crear nuevo PlanEntrenamiento activo
      const nuevoPlanEntrenamiento = await tx.planEntrenamiento.create({
        data: {
          socioId: generacion.socioId,
          perfilPlanificacionId: generacion.perfilPlanificacionId,
          generacionIAId: generacion.id,
          entrenadorId: generacion.entrenadorId,
          version: versionEntr,
          activo: true,
          estado: "APROBADO",
          titulo: output.planEntrenamiento.titulo,
          descripcion: output.planEntrenamiento.descripcionGeneral,
          splitSugerido: output.planEntrenamiento.splitSugerido || null,
          frecuenciaSemanal: output.planEntrenamiento.frecuenciaSemanal,
          nivelActual: output.metadataGeneracion.nivelInicialRecomendado,
          fechaInicio: now,
          fechaAprobacion: now,
          aprobadoPorId: validAprobadorId,
          contenido: output.planEntrenamiento as any,
          observaciones: observacionesEntrenador || null,
        },
      });

      // 5.7. Crear nuevo PlanAlimentacion activo
      const nuevoPlanAlimentacion = await tx.planAlimentacion.create({
        data: {
          socioId: generacion.socioId,
          perfilPlanificacionId: generacion.perfilPlanificacionId,
          generacionIAId: generacion.id,
          entrenadorId: generacion.entrenadorId,
          version: versionAlim,
          activo: true,
          estado: "APROBADO",
          titulo: output.planAlimentacion.titulo,
          descripcion: output.planAlimentacion.descripcionGeneral,
          lineamientosGenerales: output.planAlimentacion.lineamientosGenerales as any,
          recomendacionHidratacion: output.planAlimentacion.recomendacionHidratacion || null,
          fechaInicio: now,
          fechaAprobacion: now,
          aprobadoPorId: validAprobadorId,
          contenido: output.planAlimentacion as any,
          observaciones: observacionesEntrenador || null,
        },
      });

      // 5.8. Actualizar estado de la GeneracionIA
      const generacionAprobada = await tx.generacionIA.update({
        where: { id: generacion.id },
        data: {
          estado: "APROBADO",
          fechaAprobacion: now,
          aprobadoPorId: validAprobadorId,
        },
      });

      return {
        generacionAprobada,
        planEntrenamiento: nuevoPlanEntrenamiento,
        planAlimentacion: nuevoPlanAlimentacion,
        versionEntr,
        versionAlim,
      };
    });

    // 6. Registro de Auditoría
    await logAction(
      "APROBAR_PLAN_IA",
      `Generación IA #${generacion.numeroGeneracion} aprobada para socio ${generacion.socioId}. Materializados PlanEntrenamiento v${result.versionEntr} y PlanAlimentacion v${result.versionAlim}.`
    );

    safeRevalidate(`/socios/${generacion.socioId}`);

    return {
      success: true,
      data: {
        generacion: result.generacionAprobada,
        planEntrenamiento: result.planEntrenamiento,
        planAlimentacion: result.planAlimentacion,
      },
      planEntrenamientoId: result.planEntrenamiento.id,
      planAlimentacionId: result.planAlimentacion.id,
      versionEntrenamiento: result.versionEntr,
      versionAlimentacion: result.versionAlim,
    };
  } catch (error: any) {
    console.error("Error en aprobarGeneracionIA:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la aprobación de la generación IA.",
    };
  }
}

// ============================================================================
// 5. RECHAZAR GENERACIÓN IA
// ============================================================================

export async function rechazarGeneracionIA(input: z.infer<typeof rechazarGeneracionSchema>) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = rechazarGeneracionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Parámetros inválidos." };
    }
    const { generacionId, motivoRechazo } = parsed.data;

    const generacion = await prisma.generacionIA.findUnique({
      where: { id: generacionId },
    });

    if (!generacion) {
      return { success: false, error: "La generación IA no existe." };
    }

    if (generacion.estado === "RECHAZADO") {
      return { success: false, error: "La generación ya fue rechazada previamente." };
    }
    if (generacion.estado === "APROBADO") {
      return { success: false, error: "No se puede rechazar una generación que ya fue aprobada y materializada." };
    }
    if (generacion.estado === "ARCHIVADO") {
      return { success: false, error: "No se puede rechazar una generación archivada." };
    }
    if (generacion.estado === "ERROR") {
      return { success: false, error: "No se puede rechazar una generación con estado ERROR." };
    }

    const generacionActualizada = await prisma.generacionIA.update({
      where: { id: generacionId },
      data: {
        estado: "RECHAZADO",
        motivoRechazo,
      },
    });

    await logAction(
      "RECHAZAR_PLAN_IA",
      `Generación IA #${generacion.numeroGeneracion} rechazada para socio ${generacion.socioId}. Motivo: ${motivoRechazo}`
    );

    safeRevalidate(`/socios/${generacion.socioId}`);

    return { success: true, data: generacionActualizada };
  } catch (error: any) {
    console.error("Error en rechazarGeneracionIA:", error);
    return { success: false, error: error.message || "Error al rechazar la generación IA." };
  }
}

// ============================================================================
// 6. ARCHIVAR GENERACIÓN IA
// ============================================================================

export async function archivarGeneracionIA(input: z.infer<typeof archivarGeneracionSchema>) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = archivarGeneracionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Parámetros inválidos." };
    }
    const { generacionId } = parsed.data;

    const generacion = await prisma.generacionIA.findUnique({
      where: { id: generacionId },
    });

    if (!generacion) {
      return { success: false, error: "La generación IA no existe." };
    }

    if (generacion.estado === "ARCHIVADO") {
      return { success: false, error: "La generación ya se encuentra archivada." };
    }

    const generacionActualizada = await prisma.generacionIA.update({
      where: { id: generacionId },
      data: {
        estado: "ARCHIVADO",
      },
    });

    await logAction(
      "ARCHIVAR_GENERACION_IA",
      `Generación IA #${generacion.numeroGeneracion} archivada para socio ${generacion.socioId}.`
    );

    safeRevalidate(`/socios/${generacion.socioId}`);

    return { success: true, data: generacionActualizada };
  } catch (error: any) {
    console.error("Error en archivarGeneracionIA:", error);
    return { success: false, error: error.message || "Error al archivar la generación IA." };
  }
}

// ============================================================================
// 7. OBTENER PLANES ACTIVOS DE UN SOCIO
// ============================================================================

export async function obtenerPlanesActivosSocio(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId) {
      return { success: false, error: "ID de socio requerido." };
    }

    const [planEntrenamiento, planAlimentacion] = await Promise.all([
      prisma.planEntrenamiento.findFirst({
        where: { socioId, activo: true },
        include: {
          entrenador: {
            select: { id: true, nombres: true, apellidos: true, rol: true },
          },
          aprobadoPor: {
            select: { id: true, username: true },
          },
        },
      }),
      prisma.planAlimentacion.findFirst({
        where: { socioId, activo: true },
        include: {
          entrenador: {
            select: { id: true, nombres: true, apellidos: true, rol: true },
          },
          aprobadoPor: {
            select: { id: true, username: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        planEntrenamiento,
        planAlimentacion,
      },
    };
  } catch (error: any) {
    console.error("Error en obtenerPlanesActivosSocio:", error);
    return { success: false, error: error.message || "Error al consultar planes activos." };
  }
}

// ============================================================================
// 8. OBTENER HISTORIAL COMPLETO DE PLANES DE UN SOCIO
// ============================================================================

export async function obtenerHistorialPlanesSocio(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId) {
      return { success: false, error: "ID de socio requerido." };
    }

    const [planesEntrenamiento, planesAlimentacion] = await Promise.all([
      prisma.planEntrenamiento.findMany({
        where: { socioId },
        orderBy: { version: "desc" },
        include: {
          entrenador: {
            select: { id: true, nombres: true, apellidos: true, rol: true },
          },
          aprobadoPor: {
            select: { id: true, username: true },
          },
        },
      }),
      prisma.planAlimentacion.findMany({
        where: { socioId },
        orderBy: { version: "desc" },
        include: {
          entrenador: {
            select: { id: true, nombres: true, apellidos: true, rol: true },
          },
          aprobadoPor: {
            select: { id: true, username: true },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        planesEntrenamiento,
        planesAlimentacion,
      },
    };
  } catch (error: any) {
    console.error("Error en obtenerHistorialPlanesSocio:", error);
    return { success: false, error: error.message || "Error al consultar historial de planes." };
  }
}
