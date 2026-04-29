"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- CONSUMOS ---

// Registrar un consumo desde el kiosco
export async function registrarConsumo(personalId: string, productoId: string, cantidad: number) {
  try {
    const producto = await prisma.productoPersonal.findUnique({ where: { id: productoId } });
    if (!producto) return { success: false, error: "Producto no encontrado" };

    const montoTotal = producto.precio * cantidad;

    const consumo = await prisma.consumoPersonal.create({
      data: {
        personalId,
        productoPersonalId: productoId,
        cantidad,
        montoTotal,
      },
    });

    revalidatePath("/kiosco-personal");
    revalidatePath(`/admin/personal/${personalId}`);
    return { success: true, consumo };
  } catch (error: any) {
    return { success: false, error: "Error al registrar consumo" };
  }
}

// --- ADELANTOS ---

// Solicitar adelanto desde kiosco
export async function solicitarAdelanto(personalId: string, monto: number, motivo?: string) {
  try {
    const adelanto = await prisma.adelantoPersonal.create({
      data: {
        personalId,
        monto,
        motivo,
        estado: "PENDIENTE",
      },
    });

    revalidatePath("/kiosco-personal");
    revalidatePath("/admin/nomina");
    return { success: true, adelanto };
  } catch (error: any) {
    return { success: false, error: "Error al solicitar adelanto" };
  }
}

// Aprobar o rechazar adelanto (Admin)
export async function actualizarEstadoAdelanto(id: string, estado: "APROBADO" | "RECHAZADO") {
  try {
    const adelanto = await prisma.adelantoPersonal.update({
      where: { id },
      data: { estado },
    });

    revalidatePath("/admin/nomina");
    revalidatePath(`/admin/personal/${adelanto.personalId}`);
    return { success: true, adelanto };
  } catch (error: any) {
    return { success: false, error: "Error al actualizar estado del adelanto" };
  }
}

// Obtener adelantos pendientes para el admin
export async function getAdelantosPendientes() {
  try {
    const adelantos = await prisma.adelantoPersonal.findMany({
      where: { estado: "PENDIENTE" },
      include: { personal: true },
      orderBy: { fecha: "asc" },
    });
    return { success: true, adelantos };
  } catch (error: any) {
    return { success: false, error: "Error al obtener adelantos" };
  }
}

// --- NÓMINA Y PAGOS ---

// Generar pago de nómina
export async function generarPago(personalId: string, fechaInicio: Date, fechaFin: Date) {
  try {
    // 1. Obtener personal
    const personal = await prisma.personal.findUnique({ where: { id: personalId } });
    if (!personal) return { success: false, error: "Personal no encontrado" };

    // 2. Obtener horas trabajadas en el rango
    const asistencias = await prisma.asistenciaPersonal.findMany({
      where: {
        personalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
    });

    const horasTrabajadas = asistencias.reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0);

    // 3. Obtener consumos no pagados
    const consumos = await prisma.consumoPersonal.findMany({
      where: {
        personalId,
        pagado: false,
      },
    });
    const totalConsumos = consumos.reduce((sum, c) => sum + c.montoTotal, 0);

    // 4. Obtener adelantos aprobados y no pagados
    const adelantos = await prisma.adelantoPersonal.findMany({
      where: {
        personalId,
        estado: "APROBADO",
        pagado: false,
      },
    });
    const totalAdelantos = adelantos.reduce((sum, a) => sum + a.monto, 0);

    // 5. Calcular monto base (Simple: si es por hora, se multiplica. Si es fijo, se da el fijo o se hace prorrateo. Aquí asumo POR_HORA o Fijo directo para simplificar la primera versión).
    let montoBase = personal.montoPago;
    if (personal.metodoPago === "POR_HORA") {
      montoBase = horasTrabajadas * personal.montoPago;
    }

    const montoFinal = montoBase - totalConsumos - totalAdelantos;

    // 6. Crear el Pago y enlazar consumos/adelantos
    const pago = await prisma.$transaction(async (tx) => {
      const nuevoPago = await tx.pagoPersonal.create({
        data: {
          personalId,
          fechaInicio,
          fechaFin,
          horasTrabajadas,
          horasObjetivo: personal.horasObjetivo,
          montoBase,
          totalConsumos,
          totalAdelantos,
          montoFinal,
        },
      });

      // Marcar consumos como pagados
      if (consumos.length > 0) {
        await tx.consumoPersonal.updateMany({
          where: { id: { in: consumos.map(c => c.id) } },
          data: { pagado: true, pagoId: nuevoPago.id },
        });
      }

      // Marcar adelantos como pagados
      if (adelantos.length > 0) {
        await tx.adelantoPersonal.updateMany({
          where: { id: { in: adelantos.map(a => a.id) } },
          data: { pagado: true, pagoId: nuevoPago.id },
        });
      }

      return nuevoPago;
    });

    revalidatePath("/admin/nomina");
    revalidatePath(`/admin/personal/${personalId}`);

    return { success: true, pago };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: "Error al generar el pago" };
  }
}

// Obtener pagos recientes
export async function getPagosRecientes() {
  try {
    const pagos = await prisma.pagoPersonal.findMany({
      take: 10,
      orderBy: { fechaPago: "desc" },
      include: { personal: true },
    });
    return { success: true, pagos };
  } catch (error: any) {
    return { success: false, error: "Error al obtener pagos" };
  }
}
