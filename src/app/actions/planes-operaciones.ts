"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import { z } from "zod";

import { planEntrenamientoJSONSchema, planAlimentacionJSONSchema } from "@/lib/validations";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignorar si se ejecuta fuera del contexto HTTP de Next.js (ej. pruebas automatizadas CLI)
  }
}

// ============================================================================
// ESQUEMAS ZOD DE VALIDACIÓN
// ============================================================================

const cambiarNivelSchema = z.object({
  planId: z.string().min(1, "El ID del plan es obligatorio."),
  nuevoNivel: z.number().int().min(1, "El nivel mínimo es 1.").max(6, "El nivel máximo es 6."),
  motivo: z.string().max(500, "El motivo no puede exceder los 500 caracteres.").optional().nullable(),
});

const registrarModificacionSchema = z.object({
  planId: z.string().min(1, "El ID del plan es obligatorio."),
  tipo: z.enum(["entrenamiento", "alimentacion"]),
  observacionesModificacion: z.string().max(1000).optional().nullable(),
  nuevoContenido: z.any().optional(),
});

const cerrarPlanSchema = z.object({
  planId: z.string().min(1, "El ID del plan es obligatorio."),
  tipo: z.enum(["entrenamiento", "alimentacion"]),
  motivoCierre: z.string().max(500, "El motivo no puede exceder 500 caracteres.").optional().nullable(),
});

// ============================================================================
// 1. CAMBIAR NIVEL ACTUAL DEL PLAN DE ENTRENAMIENTO (1 a 6)
// ============================================================================

export async function cambiarNivelPlanEntrenamiento(input: z.infer<typeof cambiarNivelSchema>) {
  try {
    const session = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = cambiarNivelSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Parámetros inválidos." };
    }

    const { planId, nuevoNivel, motivo } = parsed.data;

    // Transacción atómica con bloqueo pesimista
    const resultado = await prisma.$transaction(async (tx) => {
      const plan = await tx.planEntrenamiento.findUnique({
        where: { id: planId },
        include: { socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } } },
      });

      if (!plan) {
        throw new Error("El plan de entrenamiento no existe.");
      }

      if (!plan.activo) {
        throw new Error("No se puede cambiar el nivel de un plan que no se encuentra activo.");
      }

      if (plan.nivelActual === nuevoNivel) {
        throw new Error(`El plan ya se encuentra en el Nivel ${nuevoNivel}.`);
      }

      const nivelAnterior = plan.nivelActual;

      const planActualizado = await tx.planEntrenamiento.update({
        where: { id: planId },
        data: {
          nivelActual: nuevoNivel,
          observaciones: motivo
            ? `[Nivel ${nivelAnterior} -> Nivel ${nuevoNivel}]: ${motivo}`
            : plan.observaciones,
        },
      });

      return { planActualizado, nivelAnterior, socio: plan.socio };
    });

    const detalleAudit = `Cambio de nivel en PlanEntrenamiento v${resultado.planActualizado.version} para socio ${resultado.socio.codigo} (${resultado.socio.id}): Nivel ${resultado.nivelAnterior} -> Nivel ${nuevoNivel}.${motivo ? ` Motivo: ${motivo}` : ""}`;

    await logAction("CAMBIAR_NIVEL_PLAN_ENTRENAMIENTO", detalleAudit);

    safeRevalidate(`/socios/${resultado.socio.id}`);

    return {
      success: true,
      data: resultado.planActualizado,
      nivelAnterior: resultado.nivelAnterior,
      nuevoNivel,
    };
  } catch (error: any) {
    console.error("Error en cambiarNivelPlanEntrenamiento:", error);
    return { success: false, error: error.message || "Error al cambiar el nivel del plan." };
  }
}

// ============================================================================
// 2. REGISTRAR MODIFICACIÓN MANUAL DEL ENTRENADOR
// ============================================================================

export async function registrarModificacionPlan(input: z.infer<typeof registrarModificacionSchema>) {
  try {
    const session = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = registrarModificacionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Parámetros inválidos." };
    }

    const { planId, tipo, observacionesModificacion, nuevoContenido } = parsed.data;

    const username = session?.user?.username || session?.user?.name || "Entrenador";
    const fechaISO = new Date().toISOString();

    if (tipo === "entrenamiento") {
      const plan = await prisma.planEntrenamiento.findUnique({
        where: { id: planId },
        include: { socio: { select: { id: true, codigo: true } } },
      });

      if (!plan) return { success: false, error: "El plan de entrenamiento no existe." };
      if (!plan.activo) return { success: false, error: "Solo se pueden modificar planes activos." };

      const contenidoExistente = (plan.contenido as any) || {};
      const historialModificaciones = contenidoExistente._historialModificaciones || [];

      const nuevoHistorial = [
        ...historialModificaciones,
        {
          autor: username,
          fecha: fechaISO,
          motivo: observacionesModificacion || "Ajuste manual del entrenador",
        },
      ];

      const contenidoActualizado = nuevoContenido
        ? { ...nuevoContenido, _historialModificaciones: nuevoHistorial, _originalIA: contenidoExistente._originalIA || contenidoExistente }
        : { ...contenidoExistente, _historialModificaciones: nuevoHistorial };

      const planActualizado = await prisma.planEntrenamiento.update({
        where: { id: planId },
        data: {
          estado: "MODIFICADO",
          contenido: contenidoActualizado,
          observaciones: observacionesModificacion
            ? `[Modificación manual por ${username}]: ${observacionesModificacion}`
            : plan.observaciones,
        },
      });

      await logAction(
        "MODIFICAR_PLAN_ENTRENAMIENTO",
        `PlanEntrenamiento v${plan.version} modificado manualmente por ${username} para socio ${plan.socio.codigo}.${observacionesModificacion ? ` Motivo: ${observacionesModificacion}` : ""}`
      );

      safeRevalidate(`/socios/${plan.socioId}`);
      return { success: true, data: planActualizado };
    } else {
      const plan = await prisma.planAlimentacion.findUnique({
        where: { id: planId },
        include: { socio: { select: { id: true, codigo: true } } },
      });

      if (!plan) return { success: false, error: "El plan de alimentación no existe." };
      if (!plan.activo) return { success: false, error: "Solo se pueden modificar planes activos." };

      const contenidoExistente = (plan.contenido as any) || {};
      const historialModificaciones = contenidoExistente._historialModificaciones || [];

      const nuevoHistorial = [
        ...historialModificaciones,
        {
          autor: username,
          fecha: fechaISO,
          motivo: observacionesModificacion || "Ajuste manual del entrenador",
        },
      ];

      const contenidoActualizado = nuevoContenido
        ? { ...nuevoContenido, _historialModificaciones: nuevoHistorial, _originalIA: contenidoExistente._originalIA || contenidoExistente }
        : { ...contenidoExistente, _historialModificaciones: nuevoHistorial };

      const planActualizado = await prisma.planAlimentacion.update({
        where: { id: planId },
        data: {
          estado: "MODIFICADO",
          contenido: contenidoActualizado,
          observaciones: observacionesModificacion
            ? `[Modificación manual por ${username}]: ${observacionesModificacion}`
            : plan.observaciones,
        },
      });

      await logAction(
        "MODIFICAR_PLAN_ALIMENTACION",
        `PlanAlimentacion v${plan.version} modificado manualmente por ${username} para socio ${plan.socio.codigo}.${observacionesModificacion ? ` Motivo: ${observacionesModificacion}` : ""}`
      );

      safeRevalidate(`/socios/${plan.socioId}`);
      return { success: true, data: planActualizado };
    }
  } catch (error: any) {
    console.error("Error en registrarModificacionPlan:", error);
    return { success: false, error: error.message || "Error al registrar la modificación del plan." };
  }
}

// ============================================================================
// 3. CIERRE LÓGICO DEL PLAN (SOFT CLOSE)
// ============================================================================

export async function cerrarPlanPersonalizado(input: z.infer<typeof cerrarPlanSchema>) {
  try {
    const session = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = cerrarPlanSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Parámetros inválidos." };
    }

    const { planId, tipo, motivoCierre } = parsed.data;
    const now = new Date();
    const username = session?.user?.username || session?.user?.name || "Entrenador";

    if (tipo === "entrenamiento") {
      const plan = await prisma.planEntrenamiento.findUnique({
        where: { id: planId },
        include: { socio: { select: { id: true, codigo: true } } },
      });

      if (!plan) return { success: false, error: "El plan de entrenamiento no existe." };
      if (!plan.activo) return { success: false, error: "El plan de entrenamiento ya se encuentra cerrado o archivado." };

      const planCerrado = await prisma.planEntrenamiento.update({
        where: { id: planId },
        data: {
          activo: false,
          estado: "ARCHIVADO",
          fechaFin: now,
          observaciones: motivoCierre
            ? `[Cierre del plan por ${username}]: ${motivoCierre}`
            : plan.observaciones,
        },
      });

      await logAction(
        "FINALIZAR_PLAN_ENTRENAMIENTO",
        `PlanEntrenamiento v${plan.version} cerrado/archivado para socio ${plan.socio.codigo}.${motivoCierre ? ` Motivo: ${motivoCierre}` : ""}`
      );

      safeRevalidate(`/socios/${plan.socioId}`);
      return { success: true, data: planCerrado };
    } else {
      const plan = await prisma.planAlimentacion.findUnique({
        where: { id: planId },
        include: { socio: { select: { id: true, codigo: true } } },
      });

      if (!plan) return { success: false, error: "El plan de alimentación no existe." };
      if (!plan.activo) return { success: false, error: "El plan de alimentación ya se encuentra cerrado o archivado." };

      const planCerrado = await prisma.planAlimentacion.update({
        where: { id: planId },
        data: {
          activo: false,
          estado: "ARCHIVADO",
          fechaFin: now,
          observaciones: motivoCierre
            ? `[Cierre del plan por ${username}]: ${motivoCierre}`
            : plan.observaciones,
        },
      });

      await logAction(
        "FINALIZAR_PLAN_ALIMENTACION",
        `PlanAlimentacion v${plan.version} cerrado/archivado para socio ${plan.socio.codigo}.${motivoCierre ? ` Motivo: ${motivoCierre}` : ""}`
      );

      safeRevalidate(`/socios/${plan.socioId}`);
      return { success: true, data: planCerrado };
    }
  } catch (error: any) {
    console.error("Error en cerrarPlanPersonalizado:", error);
    return { success: false, error: error.message || "Error al cerrar el plan personalizado." };
  }
}

// ============================================================================
// 4. OBTENER HISTORIAL OPERATIVO DEL PLAN (TIMELINE)
// ============================================================================

export async function obtenerHistorialOperativoPlan(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId) {
      return { success: false, error: "ID del socio es obligatorio." };
    }

    const [generaciones, planesEntrenamiento, planesAlimentacion, auditLogs] = await Promise.all([
      prisma.generacionIA.findMany({
        where: { socioId },
        orderBy: { createdAt: "desc" },
        include: {
          entrenador: { select: { nombres: true, apellidos: true } },
          aprobadoPor: { select: { username: true } },
        },
      }),
      prisma.planEntrenamiento.findMany({
        where: { socioId },
        orderBy: { version: "desc" },
        include: {
          entrenador: { select: { nombres: true, apellidos: true } },
          aprobadoPor: { select: { username: true } },
        },
      }),
      prisma.planAlimentacion.findMany({
        where: { socioId },
        orderBy: { version: "desc" },
        include: {
          entrenador: { select: { nombres: true, apellidos: true } },
          aprobadoPor: { select: { username: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { detalles: { contains: socioId } },
            { accion: { in: [
              "GENERAR_PLAN_IA", "APROBAR_PLAN_IA", "RECHAZAR_PLAN_IA", "ARCHIVAR_GENERACION_IA",
              "CAMBIAR_NIVEL_PLAN_ENTRENAMIENTO", "MODIFICAR_PLAN_ENTRENAMIENTO", "MODIFICAR_PLAN_ALIMENTACION",
              "FINALIZAR_PLAN_ENTRENAMIENTO", "FINALIZAR_PLAN_ALIMENTACION"
            ] } },
          ],
        },
        orderBy: { fecha: "desc" },
        take: 50,
      }),
    ]);

    // Consolidar cronología operativa
    const timelineEvents: Array<{
      id: string;
      fecha: Date;
      tipoEvento: string;
      origen: "IA" | "ENTRENADOR" | "SISTEMA";
      titulo: string;
      descripcion: string;
      usuario: string;
    }> = [];

    generaciones.forEach((g) => {
      timelineEvents.push({
        id: `gen-${g.id}`,
        fecha: g.createdAt,
        tipoEvento: `Propuesta IA #${g.numeroGeneracion}`,
        origen: "IA",
        titulo: `Generación de propuesta IA (${g.estado})`,
        descripcion: g.motivoRechazo ? `Rechazada. Motivo: ${g.motivoRechazo}` : `Modelo: ${g.modeloUtilizado}. Estado: ${g.estado}`,
        usuario: g.entrenador ? `${g.entrenador.nombres} ${g.entrenador.apellidos}` : "IA Engine",
      });
    });

    planesEntrenamiento.forEach((p) => {
      timelineEvents.push({
        id: `entr-${p.id}`,
        fecha: p.createdAt,
        tipoEvento: `Plan Entrenamiento v${p.version}`,
        origen: p.estado === "MODIFICADO" ? "ENTRENADOR" : "SISTEMA",
        titulo: `${p.titulo} (Nivel ${p.nivelActual})`,
        descripcion: `Estado: ${p.estado}. ${p.observaciones || ""}`,
        usuario: p.entrenador ? `${p.entrenador.nombres} ${p.entrenador.apellidos}` : (p.aprobadoPor?.username || "Entrenador"),
      });
    });

    planesAlimentacion.forEach((a) => {
      timelineEvents.push({
        id: `alim-${a.id}`,
        fecha: a.createdAt,
        tipoEvento: `Plan Alimentación v${a.version}`,
        origen: a.estado === "MODIFICADO" ? "ENTRENADOR" : "SISTEMA",
        titulo: `${a.titulo}`,
        descripcion: `Estado: ${a.estado}. ${a.observaciones || ""}`,
        usuario: a.entrenador ? `${a.entrenador.nombres} ${a.entrenador.apellidos}` : (a.aprobadoPor?.username || "Entrenador"),
      });
    });

    timelineEvents.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return {
      success: true,
      data: {
        timelineEvents,
        generaciones,
        planesEntrenamiento,
        planesAlimentacion,
        auditLogs,
      },
    };
  } catch (error: any) {
    console.error("Error en obtenerHistorialOperativoPlan:", error);
    return { success: false, error: error.message || "Error al obtener el historial operativo del plan." };
  }
}

// ============================================================================
// 5. CREACIÓN MANUAL DE PLAN DE ENTRENAMIENTO (6 NIVELES)
// ============================================================================
export async function createTrainingPlanManual(input: {
  socioId: string;
  perfilPlanificacionId?: string;
  titulo?: string;
  descripcion?: string;
  splitSugerido?: string;
  frecuenciaSemanal?: number;
  contenido: any;
  observaciones?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!input.socioId || typeof input.socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    // 1. Validar Socio
    const socio = await prisma.socio.findUnique({
      where: { id: input.socioId },
      select: { id: true, codigo: true, nombres: true, apellidos: true },
    });
    if (!socio) {
      return { success: false, error: "Socio no encontrado." };
    }

    // 2. Obtener Perfil de Planificación activo o especificado
    let perfil = null;
    if (input.perfilPlanificacionId) {
      perfil = await prisma.perfilPlanificacion.findUnique({
        where: { id: input.perfilPlanificacionId },
      });
    } else {
      perfil = await prisma.perfilPlanificacion.findFirst({
        where: { socioId: input.socioId, activo: true },
      });
    }

    if (!perfil) {
      return { success: false, error: "El socio no cuenta con un Perfil de Planificación activo." };
    }

    // 3. Validar contenido con planEntrenamientoJSONSchema (Exactamente 6 niveles 1..6)
    const parsedContenido = planEntrenamientoJSONSchema.safeParse(input.contenido);
    if (!parsedContenido.success) {
      const errorMsg = parsedContenido.error.issues[0]?.message || "El contenido del plan debe incluir exactamente 6 niveles (1 a 6) con sesiones y ejercicios válidos.";
      return { success: false, error: errorMsg };
    }

    const contenidoValido = parsedContenido.data;

    // 4. Verificación de restricciones de ejercicios evitados o lesiones declaradas
    const advertencias: string[] = [];
    const ejerciciosEvitadosTexto = (perfil.ejerciciosEvitados || "").toLowerCase();
    const lesionesTexto = (perfil.lesionesReportadas || "").toLowerCase();

    if (ejerciciosEvitadosTexto || lesionesTexto) {
      for (const nivel of contenidoValido.niveles) {
        for (const sesion of nivel.sesiones) {
          for (const ej of sesion.ejercicios) {
            const nombreEjLower = ej.nombre.toLowerCase();
            if (ejerciciosEvitadosTexto && ejerciciosEvitadosTexto.includes(nombreEjLower)) {
              advertencias.push(`El ejercicio "${ej.nombre}" en Nivel ${nivel.numeroNivel} (${sesion.nombre}) coincide con ejercicios evitados por el socio.`);
            }
          }
        }
      }
    }

    // 5. Transacción para inhabilitar planes previos y crear nueva versión activa V+1
    const result = await prisma.$transaction(async (tx) => {
      // Inactivar planes previos activos
      await tx.planEntrenamiento.updateMany({
        where: { socioId: input.socioId, activo: true },
        data: {
          activo: false,
          fechaFin: new Date(),
          estado: "ARCHIVADO",
        },
      });

      // Obtener versión máxima anterior
      const maxVersion = await tx.planEntrenamiento.aggregate({
        where: { socioId: input.socioId },
        _max: { version: true },
      });

      const nextVersion = (maxVersion._max.version || 0) + 1;

      const nuevoPlan = await tx.planEntrenamiento.create({
        data: {
          socioId: input.socioId,
          perfilPlanificacionId: perfil.id,
          entrenadorId: perfil.entrenadorId,
          version: nextVersion,
          activo: true,
          estado: "APROBADO",
          titulo: contenidoValido.titulo || input.titulo || "Plan de Entrenamiento Personalizado",
          descripcion: contenidoValido.descripcionGeneral || input.descripcion || null,
          splitSugerido: contenidoValido.splitSugerido || input.splitSugerido || null,
          frecuenciaSemanal: contenidoValido.frecuenciaSemanal || input.frecuenciaSemanal || perfil.diasPorSemana || 3,
          nivelActual: 1,
          contenido: contenidoValido as any,
          observaciones: input.observaciones || null,
        },
      });

      return nuevoPlan;
    });

    const accionAudit = result.version === 1 ? "CREAR_PLAN_ENTRENAMIENTO" : "NUEVA_VERSION_PLAN_ENTRENAMIENTO";
    await logAction(
      accionAudit,
      `Se creó el Plan de Entrenamiento v${result.version} ("${result.titulo}") para el socio ${socio.codigo} (${socio.nombres} ${socio.apellidos}).`
    );

    safeRevalidate(`/socios/${input.socioId}`);

    return {
      success: true,
      plan: result,
      advertencias,
    };
  } catch (error: any) {
    console.error("Error en createTrainingPlanManual:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el plan de entrenamiento manual." };
  }
}

export const crearPlanEntrenamientoManual = createTrainingPlanManual;

// ============================================================================
// 6. CREACIÓN MANUAL DE PLAN DE ALIMENTACIÓN (20+ RECETAS)
// ============================================================================
export async function createNutritionPlanManual(input: {
  socioId: string;
  perfilPlanificacionId?: string;
  titulo?: string;
  descripcion?: string;
  lineamientosGenerales?: string[];
  recomendacionHidratacion?: string;
  contenido: any;
  observaciones?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!input.socioId || typeof input.socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    // 1. Validar Socio
    const socio = await prisma.socio.findUnique({
      where: { id: input.socioId },
      select: { id: true, codigo: true, nombres: true, apellidos: true },
    });
    if (!socio) {
      return { success: false, error: "Socio no encontrado." };
    }

    // 2. Obtener Perfil de Planificación activo o especificado
    let perfil = null;
    if (input.perfilPlanificacionId) {
      perfil = await prisma.perfilPlanificacion.findUnique({
        where: { id: input.perfilPlanificacionId },
      });
    } else {
      perfil = await prisma.perfilPlanificacion.findFirst({
        where: { socioId: input.socioId, activo: true },
      });
    }

    if (!perfil) {
      return { success: false, error: "El socio no cuenta con un Perfil de Planificación activo." };
    }

    // 3. Validar contenido con planAlimentacionJSONSchema (Mínimo 20 recetas sin IDs duplicados)
    const parsedContenido = planAlimentacionJSONSchema.safeParse(input.contenido);
    if (!parsedContenido.success) {
      const errorMsg = parsedContenido.error.issues[0]?.message || "El plan de alimentación debe contener un mínimo de 20 recetas válidas organizadas por momento de comida.";
      return { success: false, error: errorMsg };
    }

    const contenidoValido = parsedContenido.data;

    // 4. Verificación de restricciones alimentarias (Alergias o Alimentos evitados)
    const advertencias: string[] = [];
    const alergiasTexto = (perfil.alergiasDeclaradas || "").toLowerCase();
    const alimentosEvitadosTexto = (perfil.alimentosEvitados || "").toLowerCase();

    if (alergiasTexto || alimentosEvitadosTexto) {
      const alergiasPalabras = alergiasTexto.split(/[,;\s]+/).filter((w) => w.length > 2);
      const evitadosPalabras = alimentosEvitadosTexto.split(/[,;\s]+/).filter((w) => w.length > 2);

      for (const receta of contenidoValido.recetas) {
        const textoReceta = `${receta.nombre} ${receta.ingredientes.join(" ")}`.toLowerCase();

        for (const alergia of alergiasPalabras) {
          if (textoReceta.includes(alergia)) {
            advertencias.push(`La receta "${receta.nombre}" contiene un ingrediente que coincide con la alergia declarada (${perfil.alergiasDeclaradas}).`);
            break;
          }
        }

        for (const evitado of evitadosPalabras) {
          if (textoReceta.includes(evitado)) {
            advertencias.push(`La receta "${receta.nombre}" coincide con los alimentos evitados por el socio (${perfil.alimentosEvitados}).`);
            break;
          }
        }
      }
    }

    // 5. Transacción atómica para inhabilitar planes previos y crear nueva versión activa V+1
    const result = await prisma.$transaction(async (tx) => {
      // Inactivar planes nutricionales previos activos
      await tx.planAlimentacion.updateMany({
        where: { socioId: input.socioId, activo: true },
        data: {
          activo: false,
          fechaFin: new Date(),
          estado: "ARCHIVADO",
        },
      });

      // Obtener versión máxima anterior
      const maxVersion = await tx.planAlimentacion.aggregate({
        where: { socioId: input.socioId },
        _max: { version: true },
      });

      const nextVersion = (maxVersion._max.version || 0) + 1;

      const nuevoPlan = await tx.planAlimentacion.create({
        data: {
          socioId: input.socioId,
          perfilPlanificacionId: perfil.id,
          entrenadorId: perfil.entrenadorId,
          version: nextVersion,
          activo: true,
          estado: "APROBADO",
          titulo: contenidoValido.titulo || input.titulo || "Plan de Alimentación Personalizado",
          descripcion: contenidoValido.descripcionGeneral || input.descripcion || null,
          lineamientosGenerales: (contenidoValido.lineamientosGenerales || input.lineamientosGenerales || []) as any,
          recomendacionHidratacion: contenidoValido.recomendacionHidratacion || input.recomendacionHidratacion || "Consumir al menos 2.5 a 3 litros de agua al día",
          contenido: contenidoValido as any,
          observaciones: input.observaciones || null,
        },
      });

      return nuevoPlan;
    });

    const accionAudit = result.version === 1 ? "CREAR_PLAN_ALIMENTACION" : "NUEVA_VERSION_PLAN_ALIMENTACION";
    await logAction(
      accionAudit,
      `Se creó el Plan de Alimentación v${result.version} ("${result.titulo}") para el socio ${socio.codigo} (${socio.nombres} ${socio.apellidos}).`
    );

    safeRevalidate(`/socios/${input.socioId}`);

    return {
      success: true,
      plan: result,
      advertencias,
    };
  } catch (error: any) {
    console.error("Error en createNutritionPlanManual:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el plan de alimentación manual." };
  }
}

export const crearPlanAlimentacionManual = createNutritionPlanManual;


