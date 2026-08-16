"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";

// ============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD
// ============================================================================

const filtroObservabilidadSchema = z.object({
  desde: z.string().optional().nullable(),
  hasta: z.string().optional().nullable(),
  estado: z.enum(["GENERADO", "ERROR", "APROBADO", "RECHAZADO", "ARCHIVADO"]).optional().nullable(),
  modelo: z.string().optional().nullable(),
  requiresHumanReview: z.boolean().optional().nullable(),
  entrenadorId: z.string().optional().nullable(),
  socioId: z.string().optional().nullable(),
});

const historialPaginadoSchema = filtroObservabilidadSchema.extend({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["createdAt", "numeroGeneracion", "tiempoGeneracionMs", "promptTokens", "completionTokens", "estado"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const detalleGeneracionSchema = z.object({
  generacionId: z.string().min(1, "El ID de generación es obligatorio."),
});

/**
 * Helper para construir la cláusula `where` relacional de Prisma para `GeneracionIA`.
 */
function buildWhereClause(filters: z.infer<typeof filtroObservabilidadSchema>) {
  const where: any = {};

  if (filters.estado) {
    where.estado = filters.estado;
  }

  if (filters.modelo) {
    where.modeloUtilizado = filters.modelo;
  }

  if (typeof filters.requiresHumanReview === "boolean") {
    where.requiresHumanReview = filters.requiresHumanReview;
  }

  if (filters.desde || filters.hasta) {
    where.createdAt = {};
    if (filters.desde) {
      where.createdAt.gte = new Date(filters.desde);
    }
    if (filters.hasta) {
      // Fin del día hasta 23:59:59.999
      const hastaDate = new Date(filters.hasta);
      hastaDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = hastaDate;
    }
  }

  if (filters.entrenadorId || filters.socioId) {
    where.perfilPlanificacion = {};
    if (filters.entrenadorId) {
      where.perfilPlanificacion.entrenadorId = filters.entrenadorId;
    }
    if (filters.socioId) {
      where.perfilPlanificacion.socioId = filters.socioId;
    }
  }

  return where;
}

// ============================================================================
// 1. OBTENER MÉTRICAS EJECUTIVAS Y AGREGACIONES DE OBSERVABILIDAD IA
// ============================================================================

export async function getAIObservabilityMetrics(inputFilters?: z.infer<typeof filtroObservabilidadSchema>) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = filtroObservabilidadSchema.safeParse(inputFilters || {});
    const filters = parsed.success ? parsed.data : {};
    const where = buildWhereClause(filters);

    // Consulta de conteos y agregados principales
    const [
      totales,
      generadas,
      errores,
      aprobadas,
      rechazadas,
      archivadas,
      requiresReviewCount,
      aggregateStats,
      allGenerations,
    ] = await Promise.all([
      prisma.generacionIA.count({ where }),
      prisma.generacionIA.count({ where: { ...where, estado: "GENERADO" } }),
      prisma.generacionIA.count({ where: { ...where, estado: "ERROR" } }),
      prisma.generacionIA.count({ where: { ...where, estado: "APROBADO" } }),
      prisma.generacionIA.count({ where: { ...where, estado: "RECHAZADO" } }),
      prisma.generacionIA.count({ where: { ...where, estado: "ARCHIVADO" } }),
      prisma.generacionIA.count({ where: { ...where, requiresHumanReview: true } }),
      prisma.generacionIA.aggregate({
        where,
        _avg: { tiempoGeneracionMs: true },
        _sum: { promptTokens: true, completionTokens: true },
      }),
      // Para métricas avanzadas temporales y por modelo en datasets pequeños/medianos
      prisma.generacionIA.findMany({
        where,
        select: {
          id: true,
          estado: true,
          modeloUtilizado: true,
          requiresHumanReview: true,
          banderasAdvertencia: true,
          promptTokens: true,
          completionTokens: true,
          tiempoGeneracionMs: true,
          createdAt: true,
        },
      }),
    ]);

    // Promedio de tiempo sin NaN
    const tiempoPromedioMs = aggregateStats._avg.tiempoGeneracionMs
      ? Math.round(aggregateStats._avg.tiempoGeneracionMs)
      : null;

    const totalPromptTokens = aggregateStats._sum.promptTokens || 0;
    const totalCompletionTokens = aggregateStats._sum.completionTokens || 0;
    const totalTokens = totalPromptTokens + totalCompletionTokens;

    // Tasa de aprobación y errores sin división por cero
    const tasaAprobacion = totales > 0 ? Math.round((aprobadas / totales) * 100) : 0;
    const tasaRechazo = totales > 0 ? Math.round((rechazadas / totales) * 100) : 0;
    const tasaErrores = totales > 0 ? Math.round((errores / totales) * 100) : 0;
    const porcentajeRevisionHumana = totales > 0 ? Math.round((requiresReviewCount / totales) * 100) : 0;

    // Agrupación por Modelo
    const modeloMap: Record<string, { total: number; tiempoSum: number; tiempoCount: number; tokens: number }> = {};
    // Agrupación por Fecha (YYYY-MM-DD)
    const fechaMap: Record<string, { fecha: string; total: number; errores: number; aprobadas: number; tiempoSum: number; tiempoCount: number }> = {};
    // Banderas de advertencia más frecuentes
    const banderaMap: Record<string, number> = {};

    allGenerations.forEach((gen) => {
      const modelo = gen.modeloUtilizado || "Desconocido";
      if (!modeloMap[modelo]) {
        modeloMap[modelo] = { total: 0, tiempoSum: 0, tiempoCount: 0, tokens: 0 };
      }
      modeloMap[modelo].total += 1;
      if (gen.tiempoGeneracionMs) {
        modeloMap[modelo].tiempoSum += gen.tiempoGeneracionMs;
        modeloMap[modelo].tiempoCount += 1;
      }
      modeloMap[modelo].tokens += (gen.promptTokens || 0) + (gen.completionTokens || 0);

      // Fecha YYYY-MM-DD
      const dateStr = gen.createdAt ? gen.createdAt.toISOString().slice(0, 10) : "Sin fecha";
      if (!fechaMap[dateStr]) {
        fechaMap[dateStr] = { fecha: dateStr, total: 0, errores: 0, aprobadas: 0, tiempoSum: 0, tiempoCount: 0 };
      }
      fechaMap[dateStr].total += 1;
      if (gen.estado === "ERROR") fechaMap[dateStr].errores += 1;
      if (gen.estado === "APROBADO") fechaMap[dateStr].aprobadas += 1;
      if (gen.tiempoGeneracionMs) {
        fechaMap[dateStr].tiempoSum += gen.tiempoGeneracionMs;
        fechaMap[dateStr].tiempoCount += 1;
      }

      // Banderas
      const flags = (gen.banderasAdvertencia as string[]) || [];
      flags.forEach((flag) => {
        const cleanFlag = flag.slice(0, 80);
        banderaMap[cleanFlag] = (banderaMap[cleanFlag] || 0) + 1;
      });
    });

    const porModelo = Object.entries(modeloMap).map(([modelo, stats]) => ({
      modelo,
      generaciones: stats.total,
      tiempoPromedioMs: stats.tiempoCount > 0 ? Math.round(stats.tiempoSum / stats.tiempoCount) : null,
      tokensTotales: stats.tokens,
    }));

    const agrupacionDiaria = Object.values(fechaMap)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((f) => ({
        fecha: f.fecha,
        total: f.total,
        errores: f.errores,
        aprobadas: f.aprobadas,
        tiempoPromedioMs: f.tiempoCount > 0 ? Math.round(f.tiempoSum / f.tiempoCount) : null,
      }));

    const banderasMasFrecuentes = Object.entries(banderaMap)
      .map(([bandera, cantidad]) => ({ bandera, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return {
      success: true,
      data: {
        kpis: {
          totales,
          generadas,
          errores,
          aprobadas,
          rechazadas,
          archivadas,
          requiresReviewCount,
          porcentajeRevisionHumana,
          tiempoPromedioMs,
          totalPromptTokens,
          totalCompletionTokens,
          totalTokens,
          tasaAprobacion,
          tasaRechazo,
          tasaErrores,
        },
        porModelo,
        agrupacionDiaria,
        banderasMasFrecuentes,
      },
    };
  } catch (error: any) {
    console.error("Error en getAIObservabilityMetrics:", error);
    return { success: false, error: error.message || "Error al obtener las métricas de observabilidad IA." };
  }
}

// ============================================================================
// 2. OBTENER HISTORIAL PAGINADO DE GENERACIONES IA (LIGHTWEIGHT SELECT)
// ============================================================================

export async function getGeneracionesIAHistory(inputParams?: z.infer<typeof historialPaginadoSchema>) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = historialPaginadoSchema.safeParse(inputParams || {});
    const params = parsed.success
      ? parsed.data
      : { page: 1, pageSize: 10, sortBy: "createdAt" as const, sortOrder: "desc" as const };

    const { page, pageSize, sortBy, sortOrder, ...filterFields } = params;
    const where = buildWhereClause(filterFields);
    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      prisma.generacionIA.count({ where }),
      prisma.generacionIA.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          numeroGeneracion: true,
          estado: true,
          modeloUtilizado: true,
          versionSchema: true,
          requiresHumanReview: true,
          banderasAdvertencia: true,
          promptTokens: true,
          completionTokens: true,
          tiempoGeneracionMs: true,
          createdAt: true,
          fechaAprobacion: true,
          motivoRechazo: true,
          motivoRegeneracion: true,
          perfilPlanificacion: {
            select: {
              id: true,
              socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
              entrenador: { select: { id: true, nombres: true, apellidos: true } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    };
  } catch (error: any) {
    console.error("Error en getGeneracionesIAHistory:", error);
    return { success: false, error: error.message || "Error al consultar el historial de generaciones IA." };
  }
}

// ============================================================================
// 3. OBTENER DETALLE DE UNA GENERACIÓN ESPECÍFICA (SIN EXPOSE DE SECRETOS)
// ============================================================================

export async function getGeneracionIADetail(input: z.infer<typeof detalleGeneracionSchema>) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = detalleGeneracionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "ID inválido." };
    }

    const { generacionId } = parsed.data;

    const generacion = await prisma.generacionIA.findUnique({
      where: { id: generacionId },
      include: {
        perfilPlanificacion: {
          include: {
            socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
            entrenador: { select: { id: true, nombres: true, apellidos: true } },
          },
        },
        aprobadoPor: { select: { id: true, username: true } },
        planesEntrenamiento: { select: { id: true, version: true, activo: true, estado: true } },
        planesAlimentacion: { select: { id: true, version: true, activo: true, estado: true } },
      },
    });

    if (!generacion) {
      return { success: false, error: "La generación IA especificada no existe." };
    }

    // Sanitización de seguridad: no exponer API keys, contraseñas ni tokens de sesión
    const output = (generacion.rawOutput as any) || {};

    return {
      success: true,
      data: {
        ...generacion,
        rawOutputSanitized: {
          metadataGeneracion: output.metadataGeneracion,
          planEntrenamiento: output.planEntrenamiento,
          planAlimentacion: output.planAlimentacion,
          evaluacionSeguridad: output.evaluacionSeguridad,
        },
      },
    };
  } catch (error: any) {
    console.error("Error en getGeneracionIADetail:", error);
    return { success: false, error: error.message || "Error al obtener el detalle de la generación IA." };
  }
}
