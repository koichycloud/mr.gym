"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLimaStartOfDay, getLimaEndOfDay } from "@/lib/date-utils";

// Calcular las horas netas trabajadas
function calculateNetHours(
  entrada?: Date | null, 
  salida?: Date | null, 
  salidaAlmuerzo?: Date | null, 
  entradaAlmuerzo?: Date | null
): number | null {
  if (!entrada || !salida) return null;

  const totalTime = salida.getTime() - entrada.getTime();
  let breakTime = 0;

  if (salidaAlmuerzo && entradaAlmuerzo) {
    breakTime = entradaAlmuerzo.getTime() - salidaAlmuerzo.getTime();
  }

  const netTimeMs = totalTime - breakTime;
  return netTimeMs > 0 ? netTimeMs / (1000 * 60 * 60) : 0; // Devolver horas
}

// Obtener o crear el registro del día de hoy para un personal
export async function getTodayAsistencia(personalId: string) {
  const startOfDay = getLimaStartOfDay();
  const endOfDay = getLimaEndOfDay();

  try {
    let asistencia = await prisma.asistenciaPersonal.findFirst({
      where: {
        personalId,
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!asistencia) {
      // Creamos el registro del día pero sin marcar nada aún
      asistencia = await prisma.asistenciaPersonal.create({
        data: {
          personalId,
        },
      });
    }

    return { success: true, asistencia };
  } catch (error: any) {
    console.error("Error al obtener asistencia de hoy:", error);
    return { success: false, error: "Error al obtener datos de asistencia" };
  }
}

// Marcar un evento de asistencia (Entrada, Salida Almuerzo, Entrada Almuerzo, Salida)
export async function markAsistencia(personalId: string, tipo: 'ENTRADA' | 'SALIDA_ALMUERZO' | 'ENTRADA_ALMUERZO' | 'SALIDA') {
  try {
    const todayRes = await getTodayAsistencia(personalId);
    if (!todayRes.success || !todayRes.asistencia) return { success: false, error: todayRes.error };

    const asistenciaId = todayRes.asistencia.id;
    const now = new Date();
    
    // Obtenemos de nuevo por seguridad
    const current = await prisma.asistenciaPersonal.findUnique({ where: { id: asistenciaId } });
    if (!current) return { success: false, error: "Registro no encontrado" };

    let updateData: any = {};
    let message = "";

    switch (tipo) {
      case 'ENTRADA':
        if (current.horaEntrada) return { success: false, error: "Ya marcaste tu entrada hoy." };
        updateData.horaEntrada = now;
        message = "Entrada registrada correctamente.";
        break;
      case 'SALIDA_ALMUERZO':
        if (!current.horaEntrada) return { success: false, error: "Debes marcar entrada primero." };
        if (current.horaSalidaAlmuerzo) return { success: false, error: "Ya marcaste tu salida a almorzar." };
        updateData.horaSalidaAlmuerzo = now;
        message = "Salida a almorzar registrada.";
        break;
      case 'ENTRADA_ALMUERZO':
        if (!current.horaSalidaAlmuerzo) return { success: false, error: "Debes marcar salida a almorzar primero." };
        if (current.horaEntradaAlmuerzo) return { success: false, error: "Ya marcaste tu retorno de almuerzo." };
        updateData.horaEntradaAlmuerzo = now;
        message = "Retorno de almuerzo registrado.";
        break;
      case 'SALIDA':
        if (!current.horaEntrada) return { success: false, error: "Debes marcar entrada primero." };
        if (current.horaSalida) return { success: false, error: "Ya marcaste tu salida final hoy." };
        if (current.horaSalidaAlmuerzo && !current.horaEntradaAlmuerzo) {
           return { success: false, error: "Debes marcar tu retorno de almuerzo antes de salir." };
        }
        updateData.horaSalida = now;
        updateData.horasTrabajadas = calculateNetHours(
            current.horaEntrada,
            now,
            current.horaSalidaAlmuerzo,
            current.horaEntradaAlmuerzo
        );
        message = "Salida final registrada. ¡Buen trabajo!";
        break;
    }

    const updated = await prisma.asistenciaPersonal.update({
      where: { id: asistenciaId },
      data: updateData,
    });

    revalidatePath("/kiosco-personal");
    return { success: true, message, asistencia: updated };

  } catch (error: any) {
    console.error("Error al marcar asistencia:", error);
    return { success: false, error: "Error interno al marcar asistencia" };
  }
}

// Obtener resumen de horas de la semana/quincena actual (aprox. últimos 15 días)
export async function getResumenHoras(personalId: string) {
    try {
        const hace15Dias = new Date();
        hace15Dias.setDate(hace15Dias.getDate() - 15);

        const asistencias = await prisma.asistenciaPersonal.findMany({
            where: {
                personalId,
                fecha: { gte: hace15Dias }
            },
            orderBy: { fecha: 'asc' }
        });

        // Sumar horas trabajadas
        const totalHoras = asistencias.reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0);

        return { success: true, totalHoras, asistencias };
    } catch (error: any) {
        return { success: false, error: "Error al calcular horas" };
    }
}

// Combinar fecha (YYYY-MM-DD) y hora (HH:MM) en un objeto Date en zona horaria de Lima (UTC-5)
function combineDateAndTime(dateStr: string, timeStr: string | null | undefined): Date | null {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Crear fecha interpretando los componentes en UTC
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  // Lima es UTC-5, por lo que sumamos 5 horas para obtener el objeto UTC equivalente
  const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
  return new Date(utcMs + PERU_OFFSET_MS);
}

// Combinar fecha y horas considerando cruces de medianoche cronológicos
function combineDatesWithCrossover(
  fechaStr: string,
  horaEntradaStr: string | null | undefined,
  horaSalidaAlmuerzoStr: string | null | undefined,
  horaEntradaAlmuerzoStr: string | null | undefined,
  horaSalidaStr: string | null | undefined
) {
  const entrada = combineDateAndTime(fechaStr, horaEntradaStr);
  let salidaAlmuerzo = combineDateAndTime(fechaStr, horaSalidaAlmuerzoStr);
  let entradaAlmuerzo = combineDateAndTime(fechaStr, horaEntradaAlmuerzoStr);
  let salida = combineDateAndTime(fechaStr, horaSalidaStr);

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (entrada) {
    if (salidaAlmuerzo) {
      if (salidaAlmuerzo.getTime() < entrada.getTime()) {
        salidaAlmuerzo = new Date(salidaAlmuerzo.getTime() + ONE_DAY_MS);
      }
      if (entradaAlmuerzo) {
        if (entradaAlmuerzo.getTime() < salidaAlmuerzo.getTime()) {
          entradaAlmuerzo = new Date(entradaAlmuerzo.getTime() + ONE_DAY_MS);
        }
        if (salida) {
          if (salida.getTime() < entradaAlmuerzo.getTime()) {
            salida = new Date(salida.getTime() + ONE_DAY_MS);
          }
        }
      } else {
        if (salida) {
          if (salida.getTime() < salidaAlmuerzo.getTime()) {
            salida = new Date(salida.getTime() + ONE_DAY_MS);
          }
        }
      }
    } else {
      if (salida) {
        if (salida.getTime() < entrada.getTime()) {
          salida = new Date(salida.getTime() + ONE_DAY_MS);
        }
      }
    }
  }

  return { entrada, salidaAlmuerzo, entradaAlmuerzo, salida };
}

// Crear asistencia manual
export async function createManualAsistencia(
  personalId: string,
  data: {
    fecha: string; // YYYY-MM-DD
    horaEntrada?: string; // HH:MM
    horaSalidaAlmuerzo?: string; // HH:MM
    horaEntradaAlmuerzo?: string; // HH:MM
    horaSalida?: string; // HH:MM
  }
) {
  try {
    const [year, month, day] = data.fecha.split('-').map(Number);
    const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) + PERU_OFFSET_MS);
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) + PERU_OFFSET_MS);

    // Verificar si ya existe asistencia para este día
    const existing = await prisma.asistenciaPersonal.findFirst({
      where: {
        personalId,
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Ya existe un registro de asistencia para esta fecha. Edítelo en su lugar." };
    }

    const { entrada, salidaAlmuerzo, entradaAlmuerzo, salida } = combineDatesWithCrossover(
      data.fecha,
      data.horaEntrada,
      data.horaSalidaAlmuerzo,
      data.horaEntradaAlmuerzo,
      data.horaSalida
    );

    const horasTrabajadas = calculateNetHours(entrada, salida, salidaAlmuerzo, entradaAlmuerzo);

    const newRecord = await prisma.asistenciaPersonal.create({
      data: {
        personalId,
        fecha: startOfDay,
        horaEntrada: entrada,
        horaSalidaAlmuerzo: salidaAlmuerzo,
        horaEntradaAlmuerzo: entradaAlmuerzo,
        horaSalida: salida,
        horasTrabajadas,
      },
    });

    revalidatePath(`/admin/personal/${personalId}`);
    return { success: true, asistencia: newRecord };
  } catch (error: any) {
    console.error("Error al crear asistencia manual:", error);
    return { success: false, error: "Error al registrar la asistencia" };
  }
}

// Actualizar asistencia
export async function updateAsistencia(
  id: string,
  personalId: string,
  data: {
    fecha: string; // YYYY-MM-DD
    horaEntrada?: string;
    horaSalidaAlmuerzo?: string;
    horaEntradaAlmuerzo?: string;
    horaSalida?: string;
  }
) {
  try {
    const [year, month, day] = data.fecha.split('-').map(Number);
    const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) + PERU_OFFSET_MS);

    const { entrada, salidaAlmuerzo, entradaAlmuerzo, salida } = combineDatesWithCrossover(
      data.fecha,
      data.horaEntrada,
      data.horaSalidaAlmuerzo,
      data.horaEntradaAlmuerzo,
      data.horaSalida
    );

    const horasTrabajadas = calculateNetHours(entrada, salida, salidaAlmuerzo, entradaAlmuerzo);

    const updated = await prisma.asistenciaPersonal.update({
      where: { id },
      data: {
        fecha: startOfDay,
        horaEntrada: entrada,
        horaSalidaAlmuerzo: salidaAlmuerzo,
        horaEntradaAlmuerzo: entradaAlmuerzo,
        horaSalida: salida,
        horasTrabajadas,
      },
    });

    revalidatePath(`/admin/personal/${personalId}`);
    return { success: true, asistencia: updated };
  } catch (error: any) {
    console.error("Error al actualizar asistencia:", error);
    return { success: false, error: "Error al actualizar la asistencia" };
  }
}

// Eliminar asistencia
export async function deleteAsistencia(id: string, personalId: string) {
  try {
    await prisma.asistenciaPersonal.delete({
      where: { id },
    });
    revalidatePath(`/admin/personal/${personalId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar asistencia:", error);
    return { success: false, error: "Error al eliminar la asistencia" };
  }
}

