"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

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
