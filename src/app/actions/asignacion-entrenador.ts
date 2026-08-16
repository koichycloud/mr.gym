"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import {
  asignarEntrenadorSchema,
  finalizarAsignacionSchema,
  cambiarEntrenadorSchema,
} from "@/lib/validations";

/**
 * Valida si el rol laboral de Personal corresponde a un entrenador / instructor.
 */
function isTrainerRole(rol: string): boolean {
  if (!rol) return false;
  const roleLower = rol.trim().toLowerCase();
  return ["instructor", "entrenador", "trainer"].includes(roleLower);
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignorar si se ejecuta fuera del contexto de una petición HTTP de Next.js
  }
}

// ============================================================================
// 1. ASIGNAR ENTRENADOR A SOCIO
// ============================================================================

export async function assignTrainerToMember(input: {
  socioId: string;
  entrenadorId: string;
  fechaInicio?: Date | string;
  mesesPlan: number;
}) {
  try {
    // 1. Autorización a nivel backend (Permiso centralizado)
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación de esquema Zod
    const parsed = asignarEntrenadorSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const { socioId, entrenadorId, fechaInicio, mesesPlan } = parsed.data;

    // 3. Validar existencia del Socio
    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: { id: true, nombres: true, apellidos: true, estado: true },
    });
    if (!socio) {
      return { success: false, error: "Socio no encontrado." };
    }

    // 4. Validar existencia, estado y rol del Personal
    const entrenador = await prisma.personal.findUnique({
      where: { id: entrenadorId },
      select: { id: true, nombres: true, apellidos: true, rol: true, activo: true },
    });
    if (!entrenador) {
      return { success: false, error: "Entrenador no encontrado." };
    }
    if (!entrenador.activo) {
      return { success: false, error: "El entrenador está inactivo." };
    }
    if (!isTrainerRole(entrenador.rol)) {
      return { success: false, error: "El personal seleccionado no es un entrenador." };
    }

    // 5. Validar si el socio ya tiene una asignación activa
    const existingActive = await prisma.asignacionEntrenador.findFirst({
      where: { socioId, activo: true },
    });
    if (existingActive) {
      return { success: false, error: "El socio ya tiene un entrenador activo." };
    }

    // 6. Creación de la asignación
    const asignacion = await prisma.asignacionEntrenador.create({
      data: {
        socioId,
        entrenadorId,
        fechaInicio,
        mesesPlan,
        activo: true,
        fechaFin: null,
      },
    });

    // 7. Registro de Auditoría
    await logAction(
      "ASIGNAR_ENTRENADOR",
      `Se asignó al entrenador ${entrenador.nombres} ${entrenador.apellidos} al socio ${socio.nombres || ""} ${socio.apellidos || ""} (${mesesPlan} meses).`
    );

    safeRevalidatePath(`/socios/${socioId}`);
    safeRevalidatePath("/admin/personal");

    return { success: true, asignacion };
  } catch (error: any) {
    console.error("Error en assignTrainerToMember:", error);

    // Manejo de error de concurrencia de clave única parcial de PostgreSQL (P2002)
    if (error?.code === "P2002") {
      return { success: false, error: "El socio ya tiene un entrenador activo." };
    }

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Error interno al asignar el entrenador." };
  }
}

// Alias en español
export const asignarEntrenador = assignTrainerToMember;

// ============================================================================
// 2. FINALIZAR ASIGNACIÓN DE ENTRENADOR
// ============================================================================

export async function endTrainerAssignment(input: {
  asignacionId: string;
  fechaFin?: Date | string;
}) {
  try {
    // 1. Autorización
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación Zod
    const parsed = finalizarAsignacionSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const { asignacionId, fechaFin } = parsed.data;

    // 3. Validar existencia de la asignación
    const asignacion = await prisma.asignacionEntrenador.findUnique({
      where: { id: asignacionId },
      include: {
        socio: { select: { id: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
    if (!asignacion) {
      return { success: false, error: "La asignación no existe." };
    }
    if (!asignacion.activo) {
      return { success: false, error: "La asignación ya está finalizada." };
    }

    // 4. Actualización (Desactivación lógica conservando el historial)
    const asignacionFinalizada = await prisma.asignacionEntrenador.update({
      where: { id: asignacionId },
      data: {
        activo: false,
        fechaFin,
      },
    });

    // 5. Auditoría
    await logAction(
      "FINALIZAR_ASIGNACION_ENTRENADOR",
      `Se finalizó la asignación del entrenador ${asignacion.entrenador.nombres} ${asignacion.entrenador.apellidos} para el socio ${asignacion.socio.nombres || ""} ${asignacion.socio.apellidos || ""}.`
    );

    safeRevalidatePath(`/socios/${asignacion.socioId}`);
    safeRevalidatePath("/admin/personal");

    return { success: true, asignacion: asignacionFinalizada };
  } catch (error: any) {
    console.error("Error en endTrainerAssignment:", error);

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Error interno al finalizar la asignación." };
  }
}

// Alias en español
export const finalizarAsignacion = endTrainerAssignment;

// ============================================================================
// 3. CAMBIAR ENTRENADOR (TRANSACCIÓN)
// ============================================================================

export async function changeTrainerAssignment(input: {
  socioId: string;
  nuevoEntrenadorId: string;
  fechaInicio?: Date | string;
  mesesPlan: number;
}) {
  try {
    // 1. Autorización
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    // 2. Validación Zod
    const parsed = cambiarEntrenadorSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }
    const { socioId, nuevoEntrenadorId, fechaInicio, mesesPlan } = parsed.data;

    // 3. Validar existencia del Socio
    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: { id: true, nombres: true, apellidos: true },
    });
    if (!socio) {
      return { success: false, error: "Socio no encontrado." };
    }

    // 4. Validar existencia, estado y rol del nuevo Entrenador
    const nuevoEntrenador = await prisma.personal.findUnique({
      where: { id: nuevoEntrenadorId },
      select: { id: true, nombres: true, apellidos: true, rol: true, activo: true },
    });
    if (!nuevoEntrenador) {
      return { success: false, error: "Entrenador no encontrado." };
    }
    if (!nuevoEntrenador.activo) {
      return { success: false, error: "El entrenador está inactivo." };
    }
    if (!isTrainerRole(nuevoEntrenador.rol)) {
      return { success: false, error: "El personal seleccionado no es un entrenador." };
    }

    // 5. Ejecutar Cambio Transaccional (Cierre de actual + Alta de nuevo)
    const nuevaAsignacion = await prisma.$transaction(async (tx) => {
      // Finalizar asignación activa previa si existe
      const currentActive = await tx.asignacionEntrenador.findFirst({
        where: { socioId, activo: true },
      });

      if (currentActive) {
        await tx.asignacionEntrenador.update({
          where: { id: currentActive.id },
          data: {
            activo: false,
            fechaFin: fechaInicio,
          },
        });
      }

      // Crear la nueva asignación activa
      const nueva = await tx.asignacionEntrenador.create({
        data: {
          socioId,
          entrenadorId: nuevoEntrenadorId,
          fechaInicio,
          mesesPlan,
          activo: true,
          fechaFin: null,
        },
      });

      return nueva;
    });

    // 6. Auditoría
    await logAction(
      "CAMBIAR_ENTRENADOR",
      `Se cambió el entrenador del socio ${socio.nombres || ""} ${socio.apellidos || ""} al nuevo entrenador ${nuevoEntrenador.nombres} ${nuevoEntrenador.apellidos} (${mesesPlan} meses).`
    );

    safeRevalidatePath(`/socios/${socioId}`);
    safeRevalidatePath("/admin/personal");

    return { success: true, asignacion: nuevaAsignacion };
  } catch (error: any) {
    console.error("Error en changeTrainerAssignment:", error);

    if (error?.code === "P2002") {
      return { success: false, error: "El socio ya tiene un entrenador activo." };
    }

    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Error interno al realizar el cambio de entrenador." };
  }
}

// Alias en español
export const cambiarEntrenador = changeTrainerAssignment;

// ============================================================================
// 4. CONSULTAS (QUERIES DE LECTURA)
// ============================================================================

/**
 * Obtiene la asignación activa vigente de un socio.
 */
export async function getCurrentTrainerAssignment(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId || typeof socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    const asignacion = await prisma.asignacionEntrenador.findFirst({
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
            activo: true,
          },
        },
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            telefono: true,
          },
        },
      },
    });

    return { success: true, asignacion };
  } catch (error: any) {
    console.error("Error en getCurrentTrainerAssignment:", error);
    return { success: false, error: "Error al obtener la asignación activa del socio." };
  }
}

// Alias en español
export const getEntrenadorActual = getCurrentTrainerAssignment;

/**
 * Obtiene el historial completo de asignaciones de un socio ordenadas cronológicamente.
 */
export async function getMemberTrainerHistory(socioId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!socioId || typeof socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    const historial = await prisma.asignacionEntrenador.findMany({
      where: { socioId },
      orderBy: { fechaInicio: "desc" },
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
      },
    });

    return { success: true, historial };
  } catch (error: any) {
    console.error("Error en getMemberTrainerHistory:", error);
    return { success: false, error: "Error al obtener el historial de asignaciones." };
  }
}

// Alias en español
export const getHistorialAsignacionesSocio = getMemberTrainerHistory;

/**
 * Obtiene los socios activos asignados a un entrenador específico.
 */
export async function getTrainerMembers(entrenadorId: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!entrenadorId || typeof entrenadorId !== "string") {
      return { success: false, error: "ID de entrenador inválido." };
    }

    const asignaciones = await prisma.asignacionEntrenador.findMany({
      where: {
        entrenadorId,
        activo: true,
      },
      orderBy: { fechaInicio: "desc" },
      include: {
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            telefono: true,
            fotoUrl: true,
            estado: true,
          },
        },
      },
    });

    return { success: true, asignaciones };
  } catch (error: any) {
    console.error("Error en getTrainerMembers:", error);
    return { success: false, error: "Error al obtener los socios del entrenador." };
  }
}

// Alias en español
export const getSociosActivosEntrenador = getTrainerMembers;

// ============================================================================
// 5. CONSULTAS AUXILIARES PARA INTERFAZ
// ============================================================================

/**
 * Obtiene la lista de entrenadores disponibles (Personal activo con rol de entrenador).
 */
export async function getAvailableTrainers() {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const entrenadores = await prisma.personal.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        rol: true,
        telefono: true,
        fotoUrl: true,
        activo: true,
      },
      orderBy: { nombres: "asc" },
    });

    // Filtrar estrictamente por roles de entrenador/instructor
    const trainersOnly = entrenadores.filter((p) => isTrainerRole(p.rol));

    return { success: true, entrenadores: trainersOnly };
  } catch (error: any) {
    console.error("Error en getAvailableTrainers:", error);
    return { success: false, error: "Error al obtener la lista de entrenadores." };
  }
}

export const getEntrenadoresDisponibles = getAvailableTrainers;

/**
 * Obtiene todas las asignaciones (activas e históricas) para el panel de gestión.
 */
export async function getAllAssignments() {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const asignaciones = await prisma.asignacionEntrenador.findMany({
      orderBy: [
        { activo: "desc" },
        { fechaInicio: "desc" },
      ],
      include: {
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            tipoDocumento: true,
            telefono: true,
            fotoUrl: true,
            estado: true,
          },
        },
        entrenador: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            rol: true,
            fotoUrl: true,
            activo: true,
          },
        },
      },
    });

    return { success: true, asignaciones };
  } catch (error: any) {
    console.error("Error en getAllAssignments:", error);
    return { success: false, error: "Error al obtener las asignaciones." };
  }
}

export const getTodasAsignaciones = getAllAssignments;

/**
 * Obtiene socios disponibles para asignar entrenador.
 */
export async function getMembersForAssignment() {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const socios = await prisma.socio.findMany({
      where: { estado: "ACTIVO" },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        numeroDocumento: true,
        tipoDocumento: true,
        telefono: true,
        fotoUrl: true,
        asignacionesEntrenador: {
          where: { activo: true },
          take: 1,
          include: {
            entrenador: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                rol: true,
              },
            },
          },
        },
      },
      orderBy: { nombres: "asc" },
    });

    return { success: true, socios };
  } catch (error: any) {
    console.error("Error en getMembersForAssignment:", error);
    return { success: false, error: "Error al obtener los socios." };
  }
}

export const getSociosParaAsignar = getMembersForAssignment;

