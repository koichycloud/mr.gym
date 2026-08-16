"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import {
  createEjercicioSchema,
  updateEjercicioSchema,
  filterEjercicioSchema,
  CreateEjercicioInput,
  UpdateEjercicioInput,
  FilterEjercicioInput,
} from "@/lib/validations";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignorar si se ejecuta fuera del contexto de una petición HTTP de Next.js
  }
}

// ============================================================================
// 1. CREAR EJERCICIO
// ============================================================================
export async function createEjercicio(input: CreateEjercicioInput) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = createEjercicioSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }

    const data = parsed.data;

    // Verificar unicidad de nombre
    const existing = await prisma.ejercicio.findUnique({
      where: { nombre: data.nombre.trim() },
    });
    if (existing) {
      return { success: false, error: `Ya existe un ejercicio registrado con el nombre "${data.nombre}".` };
    }

    const ejercicio = await prisma.ejercicio.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        instrucciones: data.instrucciones?.trim() || null,
        grupoMuscular: data.grupoMuscular,
        grupoMuscularSecundario: data.grupoMuscularSecundario?.trim() || null,
        nivel: data.nivel,
        tipoEjercicio: data.tipoEjercicio,
        equipamientoRequerido: data.equipamientoRequerido,
        restricciones: data.restricciones?.trim() || null,
        activo: data.activo ?? true,
      },
    });

    await logAction(
      "CREAR_EJERCICIO",
      `Se creó el ejercicio "${ejercicio.nombre}" (${ejercicio.grupoMuscular} - ${ejercicio.nivel}).`
    );

    safeRevalidatePath("/admin/ejercicios");

    return { success: true, ejercicio };
  } catch (error: any) {
    console.error("Error en createEjercicio:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error interno al crear el ejercicio." };
  }
}

// ============================================================================
// 2. MODIFICAR EJERCICIO
// ============================================================================
export async function updateEjercicio(input: UpdateEjercicioInput) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = updateEjercicioSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de entrada inválidos.";
      return { success: false, error: errorMsg };
    }

    const { id, ...data } = parsed.data;

    const existing = await prisma.ejercicio.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Ejercicio no encontrado." };
    }

    if (data.nombre && data.nombre.trim() !== existing.nombre) {
      const nameCheck = await prisma.ejercicio.findUnique({
        where: { nombre: data.nombre.trim() },
      });
      if (nameCheck && nameCheck.id !== id) {
        return { success: false, error: `Ya existe otro ejercicio con el nombre "${data.nombre}".` };
      }
    }

    const ejercicioActualizado = await prisma.ejercicio.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre.trim() }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion?.trim() || null }),
        ...(data.instrucciones !== undefined && { instrucciones: data.instrucciones?.trim() || null }),
        ...(data.grupoMuscular && { grupoMuscular: data.grupoMuscular }),
        ...(data.grupoMuscularSecundario !== undefined && { grupoMuscularSecundario: data.grupoMuscularSecundario?.trim() || null }),
        ...(data.nivel && { nivel: data.nivel }),
        ...(data.tipoEjercicio && { tipoEjercicio: data.tipoEjercicio }),
        ...(data.equipamientoRequerido && { equipamientoRequerido: data.equipamientoRequerido }),
        ...(data.restricciones !== undefined && { restricciones: data.restricciones?.trim() || null }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
    });

    await logAction(
      "MODIFICAR_EJERCICIO",
      `Se modificó el ejercicio "${ejercicioActualizado.nombre}" (ID: ${id}).`
    );

    safeRevalidatePath("/admin/ejercicios");

    return { success: true, ejercicio: ejercicioActualizado };
  } catch (error: any) {
    console.error("Error en updateEjercicio:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error interno al actualizar el ejercicio." };
  }
}

// ============================================================================
// 3. ACTIVAR / DESACTIVAR EJERCICIO (SOFT TOGGLE)
// ============================================================================
export async function toggleEjercicioActivo(id: string, activo: boolean) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!id || typeof id !== "string") {
      return { success: false, error: "ID de ejercicio inválido." };
    }

    const existing = await prisma.ejercicio.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Ejercicio no encontrado." };
    }

    const ejercicio = await prisma.ejercicio.update({
      where: { id },
      data: { activo },
    });

    const accion = activo ? "ACTIVAR_EJERCICIO" : "DESACTIVAR_EJERCICIO";
    await logAction(
      accion,
      `Se ${activo ? "activó" : "desactivó"} el ejercicio "${ejercicio.nombre}".`
    );

    safeRevalidatePath("/admin/ejercicios");

    return { success: true, ejercicio };
  } catch (error: any) {
    console.error("Error en toggleEjercicioActivo:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar el estado del ejercicio." };
  }
}

// ============================================================================
// 4. OBTENER EJERCICIO POR ID
// ============================================================================
export async function getEjercicioById(id: string) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!id || typeof id !== "string") {
      return { success: false, error: "ID inválido." };
    }

    const ejercicio = await prisma.ejercicio.findUnique({ where: { id } });
    if (!ejercicio) {
      return { success: false, error: "Ejercicio no encontrado." };
    }

    return { success: true, ejercicio };
  } catch (error: any) {
    console.error("Error en getEjercicioById:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al obtener el ejercicio." };
  }
}

// ============================================================================
// 5. OBTENER LISTA / FILTRAR EJERCICIOS
// ============================================================================
export async function getEjercicios(filters?: FilterEjercicioInput) {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = filterEjercicioSchema.safeParse(filters || {});
    const filterData = parsed.success ? parsed.data : {};

    const where: any = {};

    if (filterData.query && filterData.query.trim().length > 0) {
      const q = filterData.query.trim();
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { descripcion: { contains: q, mode: "insensitive" } },
        { instrucciones: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filterData.grupoMuscular) {
      where.grupoMuscular = filterData.grupoMuscular;
    }

    if (filterData.nivel) {
      where.nivel = filterData.nivel;
    }

    if (filterData.equipamientoRequerido) {
      where.equipamientoRequerido = filterData.equipamientoRequerido;
    }

    if (filterData.activo !== undefined) {
      where.activo = filterData.activo;
    }

    const ejercicios = await prisma.ejercicio.findMany({
      where,
      orderBy: [{ grupoMuscular: "asc" }, { nombre: "asc" }],
    });

    return { success: true, ejercicios };
  } catch (error: any) {
    console.error("Error en getEjercicios:", error);
    if (error?.message?.startsWith("Unauthorized") || error?.message?.startsWith("Forbidden")) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al listar ejercicios." };
  }
}

export const crearEjercicio = createEjercicio;
export const modificarEjercicio = updateEjercicio;
export const cambiarEstadoEjercicio = toggleEjercicioActivo;
export const obtenerEjercicio = getEjercicioById;
export const listarEjercicios = getEjercicios;
