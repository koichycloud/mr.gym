"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";
import { format } from "date-fns";

const SocioIdSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
});

const AjusteEntrenamientoSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
  planId: z.string().uuid("ID de plan inválido"),
  nivelIdx: z.number().int().min(0).max(5).optional(),
  rutinaIdx: z.number().int().min(0).optional(),
  ejercicioIdx: z.number().int().min(0).optional(),
  series: z.number().int().min(1).max(20).optional(),
  repeticiones: z.string().max(50).optional(),
  descansoSegundos: z.number().int().min(0).max(600).optional(),
  observaciones: z.string().max(500).optional(),
});

const AjusteAlimentacionSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
  planId: z.string().uuid("ID de plan inválido"),
  recetaIdx: z.number().int().min(0).optional(),
  observaciones: z.string().max(500).optional(),
  sustitutoSugerido: z.string().max(300).optional(),
});

/**
 * Consulta detallada del Plan de Entrenamiento Activo (6 Niveles, Rutinas, Ejercicios, Series, Reps, Descanso).
 */
export async function getDetallePlanEntrenamientoActivo(socioId: string) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    SocioIdSchema.parse({ socioId });

    const plan = await prisma.planEntrenamiento.findFirst({
      where: { socioId, activo: true },
      include: {
        perfilPlanificacion: {
          select: {
            id: true,
            version: true,
            nivel: true,
            objetivoPrincipal: true,
            diasPorSemana: true,
          },
        },
        entrenador: {
          select: { id: true, nombres: true, apellidos: true },
        },
      },
    });

    if (!plan) {
      return { success: true, plan: null, mensaje: "El socio no cuenta con un plan de entrenamiento activo." };
    }

    // Registrar consulta en AuditLog
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "CONSULTAR_PLAN_ENTRENAMIENTO",
        detalles: JSON.stringify({ socioId, planId: plan.id, version: plan.version }),
      },
    });

    return {
      success: true,
      plan: {
        id: plan.id,
        titulo: plan.titulo,
        version: plan.version,
        estado: plan.estado,
        fechaInicio: format(plan.fechaInicio, "dd/MM/yyyy"),
        nivelActual: plan.nivelActual,
        frecuenciaSemanal: plan.frecuenciaSemanal,
        splitSugerido: plan.splitSugerido,
        contenido: plan.contenido,
        observaciones: plan.observaciones,
        perfil: plan.perfilPlanificacion,
      },
    };
  } catch (err: any) {
    console.error("Error en getDetallePlanEntrenamientoActivo:", err);
    return { success: false, error: err.message || "Error al obtener el plan de entrenamiento activo." };
  }
}

/**
 * Consulta detallada del Plan de Alimentación Activo (Recetas por momento, Ingredientes, Sustituciones).
 */
export async function getDetallePlanAlimentacionActivo(socioId: string) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    SocioIdSchema.parse({ socioId });

    const plan = await prisma.planAlimentacion.findFirst({
      where: { socioId, activo: true },
      include: {
        perfilPlanificacion: {
          select: {
            id: true,
            version: true,
            objetivoPrincipal: true,
          },
        },
      },
    });

    if (!plan) {
      return { success: true, plan: null, mensaje: "El socio no cuenta con un plan de alimentación activo." };
    }

    // Registrar consulta en AuditLog
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "CONSULTAR_PLAN_ALIMENTACION",
        detalles: JSON.stringify({ socioId, planId: plan.id, version: plan.version }),
      },
    });

    return {
      success: true,
      plan: {
        id: plan.id,
        titulo: plan.titulo,
        version: plan.version,
        estado: plan.estado,
        fechaInicio: format(plan.fechaInicio, "dd/MM/yyyy"),
        lineamientosGenerales: plan.lineamientosGenerales,
        recomendacionHidratacion: plan.recomendacionHidratacion,
        contenido: plan.contenido,
        observaciones: plan.observaciones,
        perfil: plan.perfilPlanificacion,
      },
    };
  } catch (err: any) {
    console.error("Error en getDetallePlanAlimentacionActivo:", err);
    return { success: false, error: err.message || "Error al obtener el plan de alimentación activo." };
  }
}

/**
 * Ajuste Operativo Puntual sobre un Ejercicio de la Rutina (Series, Repeticiones, Descanso, Instrucciones).
 */
export async function ajustarOperativamentePlanEntrenamiento(input: {
  socioId: string;
  planId: string;
  nivelIdx?: number;
  rutinaIdx?: number;
  ejercicioIdx?: number;
  series?: number;
  repeticiones?: string;
  descansoSegundos?: number;
  observaciones?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = AjusteEntrenamientoSchema.parse(input);

    const plan = await prisma.planEntrenamiento.findUnique({
      where: { id: parsed.planId },
    });

    if (!plan || plan.socioId !== parsed.socioId || !plan.activo) {
      return { success: false, error: "El plan de entrenamiento no pertenece al socio o no está activo." };
    }

    const contenido: any = JSON.parse(JSON.stringify(plan.contenido || {}));

    // Modificación puntual atómica dentro de la estructura JSON del plan
    if (
      parsed.nivelIdx !== undefined &&
      parsed.rutinaIdx !== undefined &&
      parsed.ejercicioIdx !== undefined &&
      contenido.nivelesProgresivos?.[parsed.nivelIdx]?.rutinas?.[parsed.rutinaIdx]?.ejercicios?.[parsed.ejercicioIdx]
    ) {
      const ej = contenido.nivelesProgresivos[parsed.nivelIdx].rutinas[parsed.rutinaIdx].ejercicios[parsed.ejercicioIdx];
      if (parsed.series !== undefined) ej.series = parsed.series;
      if (parsed.repeticiones !== undefined) ej.repeticiones = parsed.repeticiones;
      if (parsed.descansoSegundos !== undefined) ej.descansoSegundos = parsed.descansoSegundos;
      if (parsed.observaciones !== undefined) ej.observaciones = parsed.observaciones;
    }

    const planActualizado = await prisma.planEntrenamiento.update({
      where: { id: plan.id },
      data: {
        contenido,
        observaciones: parsed.observaciones ? `Ajuste operativo: ${parsed.observaciones}` : plan.observaciones,
      },
    });

    // Auditoría
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "MODIFICAR_PLAN_ENTRENAMIENTO",
        detalles: JSON.stringify({
          socioId: parsed.socioId,
          planId: plan.id,
          ajuste: { series: parsed.series, repeticiones: parsed.repeticiones, descanso: parsed.descansoSegundos },
        }),
      },
    });

    return { success: true, plan: planActualizado, mensaje: "Ajuste operativo de entrenamiento guardado exitosamente." };
  } catch (err: any) {
    console.error("Error en ajustarOperativamentePlanEntrenamiento:", err);
    return { success: false, error: err.message || "Error al guardar el ajuste operativo de entrenamiento." };
  }
}

/**
 * Ajuste Operativo Puntual sobre el Plan de Alimentación (Receta u observaciones).
 */
export async function ajustarOperativamentePlanAlimentacion(input: {
  socioId: string;
  planId: string;
  recetaIdx?: number;
  observaciones?: string;
  sustitutoSugerido?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = AjusteAlimentacionSchema.parse(input);

    const plan = await prisma.planAlimentacion.findUnique({
      where: { id: parsed.planId },
    });

    if (!plan || plan.socioId !== parsed.socioId || !plan.activo) {
      return { success: false, error: "El plan de alimentación no pertenece al socio o no está activo." };
    }

    const contenido: any = JSON.parse(JSON.stringify(plan.contenido || {}));

    if (parsed.recetaIdx !== undefined && contenido.recetas?.[parsed.recetaIdx]) {
      if (parsed.sustitutoSugerido) {
        contenido.recetas[parsed.recetaIdx].opcionesSustitucion = parsed.sustitutoSugerido;
      }
    }

    const planActualizado = await prisma.planAlimentacion.update({
      where: { id: plan.id },
      data: {
        contenido,
        observaciones: parsed.observaciones ? `Ajuste nutricional: ${parsed.observaciones}` : plan.observaciones,
      },
    });

    // Auditoría
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "MODIFICAR_PLAN_ALIMENTACION",
        detalles: JSON.stringify({
          socioId: parsed.socioId,
          planId: plan.id,
          recetaIdx: parsed.recetaIdx,
          observaciones: parsed.observaciones,
        }),
      },
    });

    return { success: true, plan: planActualizado, mensaje: "Ajuste de alimentación guardado exitosamente." };
  } catch (err: any) {
    console.error("Error en ajustarOperativamentePlanAlimentacion:", err);
    return { success: false, error: err.message || "Error al guardar el ajuste de alimentación." };
  }
}
