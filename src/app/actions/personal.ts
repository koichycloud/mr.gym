"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";

// Obtener todo el personal
export async function getPersonal() {
  try {
    const personal = await prisma.personal.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, personal };
  } catch (error: any) {
    console.error("Error al obtener personal:", error);
    return { success: false, error: "Error al obtener el personal" };
  }
}

// Obtener un personal por ID
export async function getPersonalById(id: string) {
  try {
    const personal = await prisma.personal.findUnique({
      where: { id },
      include: {
        asistencias: {
          orderBy: { fecha: "desc" },
          take: 30, // Últimas 30 asistencias
        },
        consumos: {
          include: { producto: true },
          orderBy: { fecha: "desc" },
        },
        adelantos: {
          where: { pagado: false },
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!personal) return { success: false, error: "Personal no encontrado" };
    return { success: true, personal };
  } catch (error: any) {
    console.error("Error al obtener personal por id:", error);
    return { success: false, error: "Error al obtener detalles del personal" };
  }
}

// Obtener por código (Para el kiosco)
export async function getPersonalByCodigo(codigo: string) {
  try {
    const personal = await prisma.personal.findUnique({
      where: { codigo },
    });

    if (!personal) return { success: false, error: "Código incorrecto o personal no encontrado" };
    if (!personal.activo) return { success: false, error: "Este personal se encuentra inactivo" };

    return { success: true, personal };
  } catch (error: any) {
    return { success: false, error: "Error al verificar código" };
  }
}

// Crear nuevo personal
export async function createPersonal(data: {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  rol: string;
  metodoPago: string;
  montoPago: number;
  horasObjetivo: number;
  tipoDocumento: string;
}) {
  try {
    // Generar un código único (ej: P + DNI o número aleatorio)
    // Para hacerlo simple, podemos usar el DNI o generar uno de 4 dígitos
    let codigo = data.dni;
    
    // Check if code exists
    const existing = await prisma.personal.findUnique({ where: { codigo } });
    if (existing) {
       codigo = Math.floor(1000 + Math.random() * 9000).toString(); // Generar uno aleatorio si el DNI ya está
    }

    const personal = await prisma.personal.create({
      data: {
        ...data,
        codigo,
      },
    });

    await logAction("CREAR_PERSONAL", `Se registró al personal ${data.nombres} ${data.apellidos} con rol ${data.rol}`);
    revalidatePath("/admin/personal");
    
    return { success: true, personal };
  } catch (error: any) {
    console.error("Error al crear personal:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Ya existe un personal con este DNI" };
    }
    return { success: false, error: "Error al registrar personal" };
  }
}

// Actualizar personal
export async function updatePersonal(id: string, data: {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  rol: string;
  metodoPago: string;
  montoPago: number;
  horasObjetivo: number;
  activo: boolean;
  codigo: string;
  tipoDocumento: string;
}) {
  try {
    const personal = await prisma.personal.update({
      where: { id },
      data,
    });

    await logAction("EDITAR_PERSONAL", `Se editó los datos de ${data.nombres} ${data.apellidos}`);
    revalidatePath("/admin/personal");
    revalidatePath(`/admin/personal/${id}`);
    
    return { success: true, personal };
  } catch (error: any) {
    console.error("Error al actualizar personal:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "El DNI o código ya está en uso por otro personal" };
    }
    return { success: false, error: "Error al actualizar personal" };
  }
}

// Eliminar personal
export async function deletePersonal(id: string) {
  try {
    const personal = await prisma.personal.delete({
      where: { id },
    });
    
    await logAction("ELIMINAR_PERSONAL", `Se eliminó al personal ${personal.nombres} ${personal.apellidos}`);
    revalidatePath("/admin/personal");

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar personal:", error);
    return { success: false, error: "Error al eliminar personal. Puede que tenga pagos asociados." };
  }
}

// Pagar/Cancelar un consumo específico de personal
export async function pagarConsumoPersonal(consumoId: string, personalId: string) {
  try {
    const consumo = await prisma.consumoPersonal.update({
      where: { id: consumoId },
      data: { pagado: true },
      include: { producto: true, personal: true }
    });

    await logAction("PAGAR_CONSUMO_PERSONAL", `Se marcó como pagado el consumo de ${consumo.cantidad}x ${consumo.producto.nombre} por S/ ${consumo.montoTotal.toFixed(2)} del empleado ${consumo.personal.nombres} ${consumo.personal.apellidos}`);
    revalidatePath(`/admin/personal/${personalId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error al pagar consumo de personal:", error);
    return { success: false, error: "Error al registrar el pago del consumo" };
  }
}

// Pagar/Cancelar TODOS los consumos acumulados de un empleado
export async function pagarTodosConsumosPersonal(personalId: string) {
  try {
    const consumos = await prisma.consumoPersonal.findMany({
      where: { personalId, pagado: false },
      include: { producto: true }
    });

    if (consumos.length === 0) {
      return { success: false, error: "No hay consumos pendientes de pago" };
    }

    const total = consumos.reduce((sum, c) => sum + c.montoTotal, 0);

    await prisma.consumoPersonal.updateMany({
      where: { personalId, pagado: false },
      data: { pagado: true }
    });

    const personal = await prisma.personal.findUnique({ where: { id: personalId } });
    const name = personal ? `${personal.nombres} ${personal.apellidos}` : personalId;

    await logAction("PAGAR_TODOS_CONSUMOS_PERSONAL", `Se cancelaron todos los consumos pendientes de ${name} por un total de S/ ${total.toFixed(2)}`);
    revalidatePath(`/admin/personal/${personalId}`);

    return { success: true, total };
  } catch (error: any) {
    console.error("Error al pagar todos los consumos:", error);
    return { success: false, error: "Error al registrar la cancelación de todos los consumos" };
  }
}
