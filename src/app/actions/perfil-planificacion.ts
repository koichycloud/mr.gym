"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import {
  createPlanningProfileSchema,
  createPlanningProfileVersionSchema,
  updatePlanningProfileSchema,
  closePlanningProfileSchema,
} from "@/lib/validations";
import { z } from "zod";

/**
 * Valida si el rol laboral de Personal corresponde a un entrenador / instructor.
 */
function isTrainerRole(rol: string): boolean {
  if (!rol) return false;
  const roleLower = rol.trim().toLowerCase();
  return ["instructor", "entrenador", "trainer"].includes(roleLower);
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignora errores si se ejecuta fuera del request context de Next.js (ej. pruebas automatizadas)
  }
}

// ============================================================================
// 1. CREAR PERFIL DE PLANIFICACIÓN (VERSIÓN INICIAL)
// ============================================================================

export async function createPlanningProfile(
  input: z.infer<typeof createPlanningProfileSchema>
) {
  try {
    // 1. Autorización a nivel backend
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación de esquema Zod
    const parsed = createPlanningProfileSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const data = parsed.data;

    // 3. Validar existencia del Socio
    const socio = await prisma.socio.findUnique({
      where: { id: data.socioId },
      select: { id: true, nombres: true, apellidos: true },
    });
    if (!socio) {
      return { success: false, error: "El socio no existe." };
    }

    // 4. Validar existencia, estado y rol del Entrenador
    const entrenador = await prisma.personal.findUnique({
      where: { id: data.entrenadorId },
      select: { id: true, nombres: true, apellidos: true, rol: true, activo: true },
    });
    if (!entrenador) {
      return { success: false, error: "El entrenador no existe." };
    }
    if (!entrenador.activo) {
      return { success: false, error: "El entrenador no está activo." };
    }
    if (!isTrainerRole(entrenador.rol)) {
      return { success: false, error: "El personal seleccionado no tiene rol de entrenador." };
    }

    // 5. Validar asignación si se proporciona
    if (data.asignacionId) {
      const asignacion = await prisma.asignacionEntrenador.findUnique({
        where: { id: data.asignacionId },
      });
      if (!asignacion) {
        return { success: false, error: "La asignación especificada no existe." };
      }
      if (asignacion.socioId !== data.socioId) {
        return { success: false, error: "La asignación no corresponde al socio." };
      }
      if (asignacion.entrenadorId !== data.entrenadorId) {
        return { success: false, error: "La asignación no corresponde al entrenador." };
      }
    }

    // 6. Validar si el socio ya tiene un perfil activo
    const existingActive = await prisma.perfilPlanificacion.findFirst({
      where: { socioId: data.socioId, activo: true },
    });
    if (existingActive) {
      return {
        success: false,
        error: "El socio ya tiene un perfil de planificación activo. Utilice la opción de crear nueva versión.",
      };
    }

    // 7. Determinar número de versión secuencial
    const latestVersion = await prisma.perfilPlanificacion.findFirst({
      where: { socioId: data.socioId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // 8. Crear el perfil
    const perfil = await prisma.perfilPlanificacion.create({
      data: {
        socioId: data.socioId,
        entrenadorId: data.entrenadorId,
        asignacionId: data.asignacionId || null,
        version: versionNumber,
        activo: true,
        fechaInicio: data.fechaInicio,
        fechaFin: null,
        objetivoPrincipal: data.objetivoPrincipal,
        objetivoSecundario: data.objetivoSecundario || null,
        nivel: data.nivel,
        tiempoEntrenando: data.tiempoEntrenando || null,
        experienciaPrevia: data.experienciaPrevia || null,
        capacidadCardiovascular: data.capacidadCardiovascular || null,
        capacidadFuerza: data.capacidadFuerza || null,
        equipamientoDisponible: data.equipamientoDisponible || null,
        diasPorSemana: data.diasPorSemana,
        diasPreferidos: data.diasPreferidos ? (data.diasPreferidos as Prisma.InputJsonValue) : Prisma.JsonNull,
        duracionMinutos: data.duracionMinutos,
        horarioPreferido: data.horarioPreferido || null,
        tipoEntrenamiento: data.tipoEntrenamiento || null,
        ejerciciosEvitados: data.ejerciciosEvitados || null,
        lesionesReportadas: data.lesionesReportadas || null,
        preferenciaAlimenticia: data.preferenciaAlimenticia || null,
        alergiasDeclaradas: data.alergiasDeclaradas || null,
        alimentosEvitados: data.alimentosEvitados || null,
        numeroComidasDia: data.numeroComidasDia || null,
        consumoAguaLitros: data.consumoAguaLitros || null,
        observaciones: data.observaciones || null,
        motivoVersionado: data.motivoVersionado || null,
      },
    });

    // 9. Auditoría
    await logAction(
      "CREAR_PERFIL_PLANIFICACION",
      `Se creó el perfil de planificación v${perfil.version} para el socio ${socio.nombres || ""} ${socio.apellidos || ""} por el entrenador ${entrenador.nombres} ${entrenador.apellidos} (Objetivo: ${data.objetivoPrincipal}, Nivel: ${data.nivel}).`
    );

    safeRevalidate(`/socios/${data.socioId}`);
    safeRevalidate("/admin/asignaciones");

    return { success: true, perfil };
  } catch (error: any) {
    console.error("Error en createPlanningProfile:", error);

    // Captura de unicidad parcial en BD (P2002)
    if (error?.code === "P2002") {
      return { success: false, error: "El socio ya tiene un perfil de planificación activo." };
    }

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Error interno al crear el perfil de planificación." };
  }
}

// Alias en español
export const crearPerfilPlanificacion = createPlanningProfile;

// ============================================================================
// 2. CREAR NUEVA VERSIÓN DEL PERFIL (TRANSACCIÓN)
// ============================================================================

export async function createPlanningProfileVersion(
  input: z.infer<typeof createPlanningProfileVersionSchema>
) {
  try {
    // 1. Autorización
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación Zod
    const parsed = createPlanningProfileVersionSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const data = parsed.data;

    // 3. Validar existencia del Socio
    const socio = await prisma.socio.findUnique({
      where: { id: data.socioId },
      select: { id: true, nombres: true, apellidos: true },
    });
    if (!socio) {
      return { success: false, error: "El socio no existe." };
    }

    // 4. Validar Entrenador
    const entrenador = await prisma.personal.findUnique({
      where: { id: data.entrenadorId },
      select: { id: true, nombres: true, apellidos: true, rol: true, activo: true },
    });
    if (!entrenador) {
      return { success: false, error: "El entrenador no existe." };
    }
    if (!entrenador.activo) {
      return { success: false, error: "El entrenador no está activo." };
    }
    if (!isTrainerRole(entrenador.rol)) {
      return { success: false, error: "El personal seleccionado no tiene rol de entrenador." };
    }

    // 5. Validar Asignación si se proporciona
    if (data.asignacionId) {
      const asignacion = await prisma.asignacionEntrenador.findUnique({
        where: { id: data.asignacionId },
      });
      if (!asignacion) {
        return { success: false, error: "La asignación especificada no existe." };
      }
      if (asignacion.socioId !== data.socioId) {
        return { success: false, error: "La asignación no corresponde al socio." };
      }
      if (asignacion.entrenadorId !== data.entrenadorId) {
        return { success: false, error: "La asignación no corresponde al entrenador." };
      }
    }

    const nuevaFechaInicio = data.fechaInicio || new Date();

    // 6. Ejecución Transaccional (Cierre de versión activa + Alta de nueva versión)
    const nuevoPerfil = await prisma.$transaction(async (tx) => {
      // Localizar la versión activa actual
      const activeProfile = await tx.perfilPlanificacion.findFirst({
        where: { socioId: data.socioId, activo: true },
        orderBy: { version: "desc" },
      });

      let nextVersion = 1;

      if (activeProfile) {
        // Validar coherencia temporal
        if (new Date(nuevaFechaInicio) < new Date(activeProfile.fechaInicio)) {
          throw new Error("La fecha de inicio de la nueva versión no puede ser anterior al perfil activo actual.");
        }

        // Cerrar versión actual
        await tx.perfilPlanificacion.update({
          where: { id: activeProfile.id },
          data: {
            activo: false,
            fechaFin: nuevaFechaInicio,
          },
        });

        nextVersion = activeProfile.version + 1;
      } else {
        const latestHist = await tx.perfilPlanificacion.findFirst({
          where: { socioId: data.socioId },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        nextVersion = latestHist ? latestHist.version + 1 : 1;
      }

      // Crear la nueva versión activa
      const created = await tx.perfilPlanificacion.create({
        data: {
          socioId: data.socioId,
          entrenadorId: data.entrenadorId,
          asignacionId: data.asignacionId || null,
          version: nextVersion,
          activo: true,
          fechaInicio: nuevaFechaInicio,
          fechaFin: null,
          objetivoPrincipal: data.objetivoPrincipal,
          objetivoSecundario: data.objetivoSecundario || null,
          nivel: data.nivel,
          tiempoEntrenando: data.tiempoEntrenando || null,
          experienciaPrevia: data.experienciaPrevia || null,
          capacidadCardiovascular: data.capacidadCardiovascular || null,
          capacidadFuerza: data.capacidadFuerza || null,
          equipamientoDisponible: data.equipamientoDisponible || null,
          diasPorSemana: data.diasPorSemana,
          diasPreferidos: data.diasPreferidos ? (data.diasPreferidos as Prisma.InputJsonValue) : Prisma.JsonNull,
          duracionMinutos: data.duracionMinutos,
          horarioPreferido: data.horarioPreferido || null,
          tipoEntrenamiento: data.tipoEntrenamiento || null,
          ejerciciosEvitados: data.ejerciciosEvitados || null,
          lesionesReportadas: data.lesionesReportadas || null,
          preferenciaAlimenticia: data.preferenciaAlimenticia || null,
          alergiasDeclaradas: data.alergiasDeclaradas || null,
          alimentosEvitados: data.alimentosEvitados || null,
          numeroComidasDia: data.numeroComidasDia || null,
          consumoAguaLitros: data.consumoAguaLitros || null,
          observaciones: data.observaciones || null,
          motivoVersionado: data.motivoVersionado,
        },
      });

      return created;
    });

    // 7. Auditoría
    await logAction(
      "CREAR_VERSION_PERFIL_PLANIFICACION",
      `Se creó la versión v${nuevoPerfil.version} del perfil de planificación para el socio ${socio.nombres || ""} ${socio.apellidos || ""}. Motivo: ${data.motivoVersionado}`
    );

    safeRevalidate(`/socios/${data.socioId}`);
    safeRevalidate("/admin/asignaciones");

    return { success: true, perfil: nuevoPerfil };
  } catch (error: any) {
    console.error("Error en createPlanningProfileVersion:", error);

    if (error?.code === "P2002") {
      return { success: false, error: "El socio ya tiene un perfil de planificación activo." };
    }

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: error?.message || "Error interno al versionar el perfil de planificación.",
    };
  }
}

// Alias en español
export const crearVersionPerfilPlanificacion = createPlanningProfileVersion;

// ============================================================================
// 3. ACTUALIZAR PERFIL DE PLANIFICACIÓN (CAMPOS EDITABLES VIGENTES)
// ============================================================================

export async function updatePlanningProfile(
  input: z.infer<typeof updatePlanningProfileSchema>
) {
  try {
    // 1. Autorización
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación Zod
    const parsed = updatePlanningProfileSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const data = parsed.data;

    // 3. Validar existencia del perfil
    const existing = await prisma.perfilPlanificacion.findUnique({
      where: { id: data.id },
      include: {
        socio: { select: { id: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
    if (!existing) {
      return { success: false, error: "Perfil de planificación no encontrado." };
    }

    // 4. Proteger perfiles históricos contra mutación directa
    if (!existing.activo) {
      return {
        success: false,
        error: "No se puede modificar directamente un perfil histórico. Debe generar una nueva versión.",
      };
    }

    // 5. Actualizar exclusivamente campos editables controlados
    const updated = await prisma.perfilPlanificacion.update({
      where: { id: data.id },
      data: {
        ...(data.objetivoPrincipal !== undefined && { objetivoPrincipal: data.objetivoPrincipal }),
        ...(data.objetivoSecundario !== undefined && { objetivoSecundario: data.objetivoSecundario }),
        ...(data.nivel !== undefined && { nivel: data.nivel }),
        ...(data.tiempoEntrenando !== undefined && { tiempoEntrenando: data.tiempoEntrenando }),
        ...(data.experienciaPrevia !== undefined && { experienciaPrevia: data.experienciaPrevia }),
        ...(data.capacidadCardiovascular !== undefined && { capacidadCardiovascular: data.capacidadCardiovascular }),
        ...(data.capacidadFuerza !== undefined && { capacidadFuerza: data.capacidadFuerza }),
        ...(data.equipamientoDisponible !== undefined && { equipamientoDisponible: data.equipamientoDisponible }),
        ...(data.diasPorSemana !== undefined && { diasPorSemana: data.diasPorSemana }),
        ...(data.diasPreferidos !== undefined && {
          diasPreferidos: data.diasPreferidos ? (data.diasPreferidos as Prisma.InputJsonValue) : Prisma.JsonNull,
        }),
        ...(data.duracionMinutos !== undefined && { duracionMinutos: data.duracionMinutos }),
        ...(data.horarioPreferido !== undefined && { horarioPreferido: data.horarioPreferido }),
        ...(data.tipoEntrenamiento !== undefined && { tipoEntrenamiento: data.tipoEntrenamiento }),
        ...(data.ejerciciosEvitados !== undefined && { ejerciciosEvitados: data.ejerciciosEvitados }),
        ...(data.lesionesReportadas !== undefined && { lesionesReportadas: data.lesionesReportadas }),
        ...(data.preferenciaAlimenticia !== undefined && { preferenciaAlimenticia: data.preferenciaAlimenticia }),
        ...(data.alergiasDeclaradas !== undefined && { alergiasDeclaradas: data.alergiasDeclaradas }),
        ...(data.alimentosEvitados !== undefined && { alimentosEvitados: data.alimentosEvitados }),
        ...(data.numeroComidasDia !== undefined && { numeroComidasDia: data.numeroComidasDia }),
        ...(data.consumoAguaLitros !== undefined && { consumoAguaLitros: data.consumoAguaLitros }),
        ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      },
    });

    // 6. Auditoría
    await logAction(
      "ACTUALIZAR_PERFIL_PLANIFICACION",
      `Se actualizaron datos del perfil activo v${existing.version} del socio ${existing.socio.nombres || ""} ${existing.socio.apellidos || ""}.`
    );

    safeRevalidate(`/socios/${existing.socioId}`);
    safeRevalidate("/admin/asignaciones");

    return { success: true, perfil: updated };
  } catch (error: any) {
    console.error("Error en updatePlanningProfile:", error);

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Error interno al actualizar el perfil de planificación." };
  }
}

// Alias en español
export const actualizarPerfilPlanificacion = updatePlanningProfile;

// ============================================================================
// 4. CERRAR / FINALIZAR PERFIL DE PLANIFICACIÓN
// ============================================================================

export async function closePlanningProfile(
  input: z.infer<typeof closePlanningProfileSchema>
) {
  try {
    // 1. Autorización
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación Zod
    const parsed = closePlanningProfileSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const { id, fechaFin } = parsed.data;

    // 3. Validar existencia
    const profile = await prisma.perfilPlanificacion.findUnique({
      where: { id },
      include: {
        socio: { select: { id: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
    if (!profile) {
      return { success: false, error: "Perfil de planificación no encontrado." };
    }
    if (!profile.activo) {
      return { success: false, error: "El perfil ya fue finalizado previamente." };
    }

    // 4. Validar coherencia de fechas
    if (new Date(fechaFin) < new Date(profile.fechaInicio)) {
      return {
        success: false,
        error: "La fecha de fin no puede ser anterior a la fecha de inicio del perfil.",
      };
    }

    // 5. Cierre lógico (Sin eliminación física)
    const updated = await prisma.perfilPlanificacion.update({
      where: { id },
      data: {
        activo: false,
        fechaFin,
      },
    });

    // 6. Auditoría
    await logAction(
      "FINALIZAR_PERFIL_PLANIFICACION",
      `Se finalizó el perfil de planificación v${profile.version} del socio ${profile.socio.nombres || ""} ${profile.socio.apellidos || ""}.`
    );

    safeRevalidate(`/socios/${profile.socioId}`);
    safeRevalidate("/admin/asignaciones");

    return { success: true, perfil: updated };
  } catch (error: any) {
    console.error("Error en closePlanningProfile:", error);

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Error interno al finalizar el perfil de planificación." };
  }
}

// Alias en español
export const finalizarPerfilPlanificacion = closePlanningProfile;

// ============================================================================
// 5. CONSULTAS (QUERIES DE LECTURA)
// ============================================================================

/**
 * Obtiene el perfil de planificación activo vigente de un socio.
 */
export async function getActivePlanningProfile(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId || typeof socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    const perfil = await prisma.perfilPlanificacion.findFirst({
      where: { socioId, activo: true },
      include: {
        entrenador: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            rol: true,
            telefono: true,
            fotoUrl: true,
          },
        },
        asignacion: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
            mesesPlan: true,
            activo: true,
          },
        },
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            fechaNacimiento: true,
            sexo: true,
          },
        },
      },
    });

    return { success: true, perfil };
  } catch (error: any) {
    console.error("Error en getActivePlanningProfile:", error);
    return { success: false, error: "Error al obtener el perfil de planificación activo." };
  }
}

// Alias en español
export const obtenerPerfilPlanificacionActivo = getActivePlanningProfile;

/**
 * Obtiene el historial completo de versiones de perfiles de un socio ordenado cronológicamente.
 */
export async function getPlanningProfileHistory(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId || typeof socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    const historial = await prisma.perfilPlanificacion.findMany({
      where: { socioId },
      orderBy: { version: "desc" },
      include: {
        entrenador: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            rol: true,
          },
        },
        asignacion: {
          select: {
            id: true,
            mesesPlan: true,
            activo: true,
          },
        },
      },
    });

    return { success: true, historial };
  } catch (error: any) {
    console.error("Error en getPlanningProfileHistory:", error);
    return { success: false, error: "Error al obtener el historial de perfiles." };
  }
}

// Alias en español
export const obtenerHistorialPerfilesPlanificacion = getPlanningProfileHistory;

/**
 * Obtiene un perfil de planificación por su ID.
 */
export async function getPlanningProfileById(id: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!id || typeof id !== "string") {
      return { success: false, error: "ID de perfil inválido." };
    }

    const perfil = await prisma.perfilPlanificacion.findUnique({
      where: { id },
      include: {
        entrenador: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            rol: true,
            fotoUrl: true,
          },
        },
        asignacion: true,
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            fechaNacimiento: true,
            sexo: true,
            numeroDocumento: true,
            telefono: true,
          },
        },
      },
    });

    if (!perfil) {
      return { success: false, error: "Perfil de planificación no encontrado." };
    }

    return { success: true, perfil };
  } catch (error: any) {
    console.error("Error en getPlanningProfileById:", error);
    return { success: false, error: "Error al obtener el perfil de planificación." };
  }
}

// Alias en español
export const obtenerPerfilPlanificacion = getPlanningProfileById;
