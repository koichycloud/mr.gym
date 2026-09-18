"use server";

import prisma from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const actualizarHorarioSocioSchema = z.object({
  perfilId: z.string().min(1, "El ID del perfil es requerido"),
  diasPreferidos: z.array(z.string()).min(1, "Debe seleccionar al menos un día de la semana"),
  horarioPreferido: z.string().min(1, "Debe especificar la hora de inicio"),
  duracionMinutos: z.number().int().min(15, "La duración mínima es de 15 minutos").max(240, "La duración máxima es de 240 minutos"),
});

export interface SesionAgenda {
  id: string; // perfilId o id temporal
  perfilId: string;
  socioId: string;
  socioCodigo: string;
  socioNombre: string;
  socioFotoUrl: string | null;
  socioTelefono: string | null;
  dia: string;
  horaInicio: string; // "08:00"
  horaFin: string; // "09:00"
  minutosInicio: number;
  minutosFin: number;
  duracionMinutos: number;
  objetivoPrincipal: string;
  nivel: string;
  tieneConflicto: boolean;
  detallesConflicto: string[];
}

export interface AgendaSemanalResultado {
  entrenador: {
    id: string;
    codigo: string;
    nombres: string;
    apellidos: string;
    rol: string;
    telefono: string | null;
    fotoUrl: string | null;
  };
  metricasCarga: {
    totalSociosAsignados: number;
    totalSociosConHorario: number;
    totalSociosPendientes: number;
    totalSesionesSemanales: number;
    horasTotalesSemanales: number;
    distribucionPorDia: Record<string, number>;
    totalConflictos: number;
  };
  diasSemana: Array<{
    dia: string;
    nombreCorto: string;
    sesiones: SesionAgenda[];
    totalSesionesDia: number;
    totalHorasDia: number;
    tieneConflictos: boolean;
  }>;
  sociosPendientes: Array<{
    socioId: string;
    socioCodigo: string;
    socioNombre: string;
    socioTelefono: string | null;
    socioFotoUrl: string | null;
    fechaAsignacion: string;
    perfilId: string | null;
    motivoPendiente: string;
  }>;
}

const DIAS_ORDENADOS = [
  { id: "LUNES", nombreCorto: "Lun" },
  { id: "MARTES", nombreCorto: "Mar" },
  { id: "MIERCOLES", nombreCorto: "Mié" },
  { id: "JUEVES", nombreCorto: "Jue" },
  { id: "VIERNES", nombreCorto: "Vie" },
  { id: "SABADO", nombreCorto: "Sáb" },
  { id: "DOMINGO", nombreCorto: "Dom" },
];

/**
 * Convierte un string de hora tipo "08:30" o "8:30" a minutos desde medianoche (510).
 */
function parseHoraAMinutos(horaStr: string): number | null {
  if (!horaStr) return null;
  const match = horaStr.match(/(\d{1,2}):(\d{2})/);
  if (!match || !match[1] || !match[2]) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Convierte minutos desde medianoche (510) a string "08:30".
 */
function formatearMinutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Obtiene la agenda semanal completa, distribución de carga y detección de conflictos
 * para un entrenador específico.
 */
export async function getAgendaSemanalEntrenador(
  entrenadorId: string
): Promise<{ success: boolean; data?: AgendaSemanalResultado; error?: string }> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    if (!entrenadorId || typeof entrenadorId !== "string") {
      return { success: false, error: "ID de entrenador inválido." };
    }

    // 1. Obtener datos del Entrenador
    const entrenador = await prisma.personal.findUnique({
      where: { id: entrenadorId },
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
    });

    if (!entrenador) {
      return { success: false, error: "Entrenador no encontrado." };
    }

    // 2. Obtener todas las asignaciones activas del entrenador
    const asignacionesActivas = await prisma.asignacionEntrenador.findMany({
      where: {
        entrenadorId,
        activo: true,
      },
      include: {
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            telefono: true,
            fotoUrl: true,
            estado: true,
          },
        },
      },
      orderBy: { fechaInicio: "desc" },
    });

    // 3. Obtener todos los perfiles de planificación activos vinculados al entrenador
    const perfilesActivos = await prisma.perfilPlanificacion.findMany({
      where: {
        entrenadorId,
        activo: true,
      },
      include: {
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            telefono: true,
            fotoUrl: true,
          },
        },
      },
    });

    // Mapa de perfiles por socioId
    const perfilesMap = new Map<string, (typeof perfilesActivos)[0]>();
    perfilesActivos.forEach((p) => {
      perfilesMap.set(p.socioId, p);
    });

    // 4. Procesar sesiones agendadas por día
    const sesionesPorDiaMap: Record<string, SesionAgenda[]> = {
      LUNES: [],
      MARTES: [],
      MIERCOLES: [],
      JUEVES: [],
      VIERNES: [],
      SABADO: [],
      DOMINGO: [],
    };

    const sociosPendientes: AgendaSemanalResultado["sociosPendientes"] = [];
    const sociosConHorarioSet = new Set<string>();

    // Procesar cada asignación activa
    for (const asig of asignacionesActivas) {
      const socio = asig.socio;
      const perfil = perfilesMap.get(socio.id);

      if (!perfil) {
        sociosPendientes.push({
          socioId: socio.id,
          socioCodigo: socio.codigo,
          socioNombre: `${socio.nombres || ""} ${socio.apellidos || ""}`.trim() || "Socio sin nombre",
          socioTelefono: socio.telefono,
          socioFotoUrl: socio.fotoUrl,
          fechaAsignacion: asig.fechaInicio.toISOString(),
          perfilId: null,
          motivoPendiente: "Sin evaluación o perfil de planificación creado",
        });
        continue;
      }

      // Analizar días preferidos
      let diasArray: string[] = [];
      if (Array.isArray(perfil.diasPreferidos)) {
        diasArray = perfil.diasPreferidos.map((d) => String(d).toUpperCase().trim());
      }

      const horaInicioMinutos = parseHoraAMinutos(perfil.horarioPreferido || "");
      const duracion = perfil.duracionMinutos || 60;

      if (diasArray.length === 0 || horaInicioMinutos === null) {
        sociosPendientes.push({
          socioId: socio.id,
          socioCodigo: socio.codigo,
          socioNombre: `${socio.nombres || ""} ${socio.apellidos || ""}`.trim() || "Socio sin nombre",
          socioTelefono: socio.telefono,
          socioFotoUrl: socio.fotoUrl,
          fechaAsignacion: asig.fechaInicio.toISOString(),
          perfilId: perfil.id,
          motivoPendiente: diasArray.length === 0 ? "Días de entrenamiento no definidos" : "Hora de inicio no especificada",
        });
        continue;
      }

      // El socio tiene horario estructurado
      sociosConHorarioSet.add(socio.id);

      const horaFinMinutos = horaInicioMinutos + duracion;
      const horaInicioStr = formatearMinutosAHora(horaInicioMinutos);
      const horaFinStr = formatearMinutosAHora(horaFinMinutos);

      for (const dia of diasArray) {
        // Normalizar día
        const diaNorm = dia.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const diaValido = DIAS_ORDENADOS.find((d) => d.id === diaNorm || d.id.startsWith(diaNorm));

        if (diaValido) {
          const sesion: SesionAgenda = {
            id: `${perfil.id}-${diaValido.id}`,
            perfilId: perfil.id,
            socioId: socio.id,
            socioCodigo: socio.codigo,
            socioNombre: `${socio.nombres || ""} ${socio.apellidos || ""}`.trim() || socio.codigo,
            socioFotoUrl: socio.fotoUrl,
            socioTelefono: socio.telefono,
            dia: diaValido.id,
            horaInicio: horaInicioStr,
            horaFin: horaFinStr,
            minutosInicio: horaInicioMinutos,
            minutosFin: horaFinMinutos,
            duracionMinutos: duracion,
            objetivoPrincipal: perfil.objetivoPrincipal,
            nivel: perfil.nivel,
            tieneConflicto: false,
            detallesConflicto: [],
          };

          sesionesPorDiaMap[diaValido.id]?.push(sesion);
        }
      }
    }

    // 5. MOTOR DE DETECCIÓN DE CONFLICTOS POR DÍA
    let totalConflictos = 0;

    for (const diaKey of Object.keys(sesionesPorDiaMap)) {
      const sesiones = sesionesPorDiaMap[diaKey] || [];
      // Ordenar por hora de inicio
      sesiones.sort((a, b) => a.minutosInicio - b.minutosFin);

      // Comparar cada par de sesiones en el mismo día
      for (let i = 0; i < sesiones.length; i++) {
        for (let j = i + 1; j < sesiones.length; j++) {
          const sA = sesiones[i]!;
          const sB = sesiones[j]!;

          // Traslape si: max(inicioA, inicioB) < min(finA, finB)
          const overlapStart = Math.max(sA.minutosInicio, sB.minutosInicio);
          const overlapEnd = Math.min(sA.minutosFin, sB.minutosFin);

          if (overlapStart < overlapEnd) {
            const overlapMinutes = overlapEnd - overlapStart;
            sA.tieneConflicto = true;
            sB.tieneConflicto = true;

            const msgA = `Superposición con ${sB.socioNombre} (${sB.horaInicio} - ${sB.horaFin}, ${overlapMinutes} min)`;
            const msgB = `Superposición con ${sA.socioNombre} (${sA.horaInicio} - ${sA.horaFin}, ${overlapMinutes} min)`;

            if (!sA.detallesConflicto.includes(msgA)) sA.detallesConflicto.push(msgA);
            if (!sB.detallesConflicto.includes(msgB)) sB.detallesConflicto.push(msgB);

            totalConflictos++;
          }
        }
      }
    }

    // 6. Ensamblar estructura de retorno y métricas
    let totalSesionesSemanales = 0;
    let totalMinutosSemanales = 0;
    const distribucionPorDia: Record<string, number> = {};

    const diasSemana = DIAS_ORDENADOS.map((d) => {
      const sesiones = sesionesPorDiaMap[d.id] || [];
      const totalSesionesDia = sesiones.length;
      const totalMinutosDia = sesiones.reduce((acc, s) => acc + s.duracionMinutos, 0);

      totalSesionesSemanales += totalSesionesDia;
      totalMinutosSemanales += totalMinutosDia;
      distribucionPorDia[d.id] = totalSesionesDia;

      return {
        dia: d.id,
        nombreCorto: d.nombreCorto,
        sesiones,
        totalSesionesDia,
        totalHorasDia: Number((totalMinutosDia / 60).toFixed(1)),
        tieneConflictos: sesiones.some((s) => s.tieneConflicto),
      };
    });

    return {
      success: true,
      data: {
        entrenador: {
          id: entrenador.id,
          codigo: entrenador.codigo,
          nombres: entrenador.nombres,
          apellidos: entrenador.apellidos,
          rol: entrenador.rol,
          telefono: entrenador.telefono,
          fotoUrl: entrenador.fotoUrl,
        },
        metricasCarga: {
          totalSociosAsignados: asignacionesActivas.length,
          totalSociosConHorario: sociosConHorarioSet.size,
          totalSociosPendientes: sociosPendientes.length,
          totalSesionesSemanales,
          horasTotalesSemanales: Number((totalMinutosSemanales / 60).toFixed(1)),
          distribucionPorDia,
          totalConflictos,
        },
        diasSemana,
        sociosPendientes,
      },
    };
  } catch (err: any) {
    console.error("Error en getAgendaSemanalEntrenador:", err);
    return {
      success: false,
      error: err.message || "Error al obtener la agenda semanal del entrenador.",
    };
  }
}

/**
 * Actualiza el horario coordinado de un socio directamente desde la vista del entrenador.
 * Registra la operación inmutable en AuditLog.
 */
export async function actualizarHorarioSocioEntrenador(input: {
  perfilId: string;
  diasPreferidos: string[];
  horarioPreferido: string;
  duracionMinutos: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

    const parsed = actualizarHorarioSocioSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Datos de horario inválidos.";
      return { success: false, error: errorMsg };
    }

    const { perfilId, diasPreferidos, horarioPreferido, duracionMinutos } = parsed.data;

    // 1. Obtener perfil existente
    const perfil = await prisma.perfilPlanificacion.findUnique({
      where: { id: perfilId },
      include: {
        socio: {
          select: { id: true, codigo: true, nombres: true, apellidos: true },
        },
        entrenador: {
          select: { id: true, nombres: true, apellidos: true },
        },
      },
    });

    if (!perfil) {
      return { success: false, error: "Perfil de planificación no encontrado." };
    }

    // 2. Actualizar días, hora y duración
    await prisma.perfilPlanificacion.update({
      where: { id: perfilId },
      data: {
        diasPreferidos: diasPreferidos as any,
        diasPorSemana: diasPreferidos.length,
        horarioPreferido,
        duracionMinutos,
      },
    });

    // 3. Auditoría Inmutable
    await logAction(
      "MODIFICAR_HORARIO_SOCIO",
      `Horario actualizado para socio ${perfil.socio.codigo} (${perfil.socio.nombres || ""} ${perfil.socio.apellidos || ""}): ${diasPreferidos.join(", ")} a las ${horarioPreferido} (${duracionMinutos} min). Entrenador: ${perfil.entrenador.nombres} ${perfil.entrenador.apellidos}.`
    );

    try {
      revalidatePath("/admin/asignaciones");
      revalidatePath(`/socios/${perfil.socioId}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("Error en actualizarHorarioSocioEntrenador:", err);
    return {
      success: false,
      error: err.message || "Error al actualizar el horario del socio.",
    };
  }
}
