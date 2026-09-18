"use server";

import prisma from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-utils";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  crearPeriodoPersonalizadoSchema,
  previewPeriodoPersonalizadoSchema,
  reprogramarSesionPersonalizadaSchema,
  cancelarSesionPersonalizadaSchema,
  cambiarEstadoPeriodoSchema,
  actualizarAcuerdoPeriodoSchema,
  CrearPeriodoPersonalizadoInput,
  PreviewPeriodoPersonalizadoInput,
  ReprogramarSesionPersonalizadaInput,
  CancelarSesionPersonalizadaInput,
  CambiarEstadoPeriodoInput,
  ActualizarAcuerdoPeriodoInput,
} from "@/lib/validations";
import {
  generatePersonalizedSessions,
  detectSessionConflicts,
  createLimaDateTime,
  formatLimaTime,
  getLimaDayOfWeek,
  isSessionBlockingAvailability,
  ESTADOS_BLOQUEANTES,
  SesionTentativa,
  ConflictoSesion,
} from "@/lib/personalized-training-generator";
import { getLimaStartOfDay, getLimaEndOfDay, formatLimaDate } from "@/lib/date-utils";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignorado en entorno de scripts/tests standalone donde no existe un store de Next.js
  }
}

export interface PreviewPeriodoResultado {
  sesiones: Array<{
    fecha: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    duracionMinutos: number;
    socioId: string;
    entrenadorId: string;
  }>;
  conflictos: ConflictoSesion[];
  advertenciasTurno: Array<{
    tipo: "TURNO_REFERENCIAL";
    descripcion: string;
  }>;
  resumen: {
    totalSesiones: number;
    totalConflictos: number;
    tieneConflictosBloqueantes: boolean;
    frecuenciaRecomendada: number;
    frecuenciaAcordada: number;
    diasAcordados: string[];
    duracionMinutos: number;
  };
}

/**
 * Genera la previsualización en memoria de las sesiones tentativas para el periodo
 * y audita en tiempo real cualquier conflicto de solapamiento con el socio o entrenador.
 * NO ESCRIBE EN BASE DE DATOS.
 */
export async function previewPeriodoPersonalizado(
  input: PreviewPeriodoPersonalizadoInput
): Promise<{ success: boolean; data?: PreviewPeriodoResultado; error?: string }> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    // 1. Validar esquema Zod
    const validacion = previewPeriodoPersonalizadoSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos del periodo inválidos.",
      };
    }

    const {
      socioId,
      entrenadorId,
      fechaInicio,
      fechaFin,
      frecuenciaRecomendada,
      frecuenciaAcordada,
      diasAcordados,
      horaInicioAcordada,
      duracionMinutos,
    } = validacion.data;

    // 2. Verificar que socio y entrenador existen en la base de datos
    const [socio, entrenador] = await Promise.all([
      prisma.socio.findUnique({
        where: { id: socioId },
        select: { id: true, codigo: true, nombres: true, apellidos: true },
      }),
      prisma.personal.findUnique({
        where: { id: entrenadorId },
        select: {
          id: true,
          codigo: true,
          nombres: true,
          apellidos: true,
          activo: true,
          horaEntradaManana: true,
          horaEntradaTarde: true,
        },
      }),
    ]);

    if (!socio) {
      return { success: false, error: "El socio especificado no existe." };
    }
    if (!entrenador) {
      return { success: false, error: "El entrenador especificado no existe." };
    }
    if (!entrenador.activo) {
      return { success: false, error: "El entrenador seleccionado no está activo." };
    }

    // 3. Generar sesiones tentativas en memoria
    const sesionesTentativas = generatePersonalizedSessions({
      fechaInicio,
      fechaFin,
      frecuenciaAcordada,
      diasAcordados,
      horaInicio: horaInicioAcordada,
      duracionMinutos,
      socioId,
      entrenadorId,
    });

    if (sesionesTentativas.length === 0) {
      return {
        success: false,
        error: "El rango de fechas y días acordados no generó ninguna sesión válida.",
      };
    }

    // 4. Consultar sesiones existentes que puedan solaparse en el rango de fechas
    const minFechaHoraInicio = sesionesTentativas[0].fechaHoraInicio;
    const maxFechaHoraFin = sesionesTentativas[sesionesTentativas.length - 1].fechaHoraFin;

    const sesionesExistentes = await prisma.sesionEntrenamientoPersonalizado.findMany({
      where: {
        OR: [{ entrenadorId }, { socioId }],
        estado: { in: [...ESTADOS_BLOQUEANTES] },
        fechaHoraInicio: { lte: maxFechaHoraFin },
        fechaHoraFin: { gte: minFechaHoraInicio },
      },
      select: {
        id: true,
        socioId: true,
        entrenadorId: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
        horaInicio: true,
        horaFin: true,
        estado: true,
        socio: { select: { nombres: true, apellidos: true, codigo: true } },
        entrenador: { select: { nombres: true, apellidos: true, codigo: true } },
      },
    });

    // 5. Detectar conflictos exactos de horario
    const conflictos = detectSessionConflicts(sesionesTentativas, sesionesExistentes);

    // 6. Advertencias referenciales de turno del entrenador (informativo, no bloqueante)
    const advertenciasTurno: PreviewPeriodoResultado["advertenciasTurno"] = [];
    if (entrenador.horaEntradaManana) {
      const [hEntrada] = entrenador.horaEntradaManana.split(":").map(Number);
      const [hSesion] = horaInicioAcordada.split(":").map(Number);
      if (hSesion < hEntrada) {
        advertenciasTurno.push({
          tipo: "TURNO_REFERENCIAL",
          descripcion: `La hora acordada (${horaInicioAcordada}) es anterior al turno referencial del entrenador (${entrenador.horaEntradaManana}).`,
        });
      }
    }

    return {
      success: true,
      data: {
        sesiones: sesionesTentativas.map((s) => ({
          fecha: s.fechaStr,
          diaSemana: s.diaSemana,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          fechaHoraInicio: s.fechaHoraInicio.toISOString(),
          fechaHoraFin: s.fechaHoraFin.toISOString(),
          duracionMinutos: s.duracionMinutos,
          socioId: s.socioId,
          entrenadorId: s.entrenadorId,
        })),
        conflictos,
        advertenciasTurno,
        resumen: {
          totalSesiones: sesionesTentativas.length,
          totalConflictos: conflictos.length,
          tieneConflictosBloqueantes: conflictos.length > 0,
          frecuenciaRecomendada,
          frecuenciaAcordada,
          diasAcordados,
          duracionMinutos,
        },
      },
    };
  } catch (error: any) {
    console.error("Error en previewPeriodoPersonalizado:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la previsualización del periodo.",
    };
  }
}

/**
 * Confirma y persiste transaccionalmente el Periodo de Entrenamiento Personalizado
 * y su lote de sesiones individuales.
 * Revalida conflictos antes de persistir para protección ante concurrencia.
 */
export async function confirmarPeriodoPersonalizado(
  input: CrearPeriodoPersonalizadoInput
): Promise<{ success: boolean; periodoId?: string; totalSesiones?: number; error?: string; conflictos?: ConflictoSesion[] }> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    // Validar permiso de gestión de personalizados
    const userRole = session.user.role || "ADMIN";
    const userPermissions = (session.user.permissions as string[]) || [];
    const esAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
    const tienePermisoGestionar = userPermissions.includes("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!esAdmin && !tienePermisoGestionar) {
      if (userRole === "ENTRENADOR") {
        const userDb = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { personalId: true },
        });
        if (!userDb?.personalId || userDb.personalId !== input.entrenadorId) {
          return { success: false, error: "No tienes permiso para crear periodos de otro entrenador." };
        }
      } else {
        return { success: false, error: "No tienes permiso para gestionar periodos personalizados." };
      }
    }

    // 1. Validar esquema Zod completo
    const validacion = crearPeriodoPersonalizadoSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos del periodo inválidos.",
      };
    }

    const {
      socioId,
      entrenadorId,
      asignacionId,
      perfilPlanificacionId,
      fechaInicio,
      fechaFin,
      mesesPeriodo,
      frecuenciaRecomendada,
      frecuenciaAcordada,
      diasAcordados,
      horaInicioAcordada,
      duracionMinutos,
      objetivoAcordado,
      observaciones,
    } = validacion.data;

    // 2. Verificar socio y entrenador
    const [socio, entrenador] = await Promise.all([
      prisma.socio.findUnique({
        where: { id: socioId },
        select: { id: true, codigo: true, nombres: true, apellidos: true },
      }),
      prisma.personal.findUnique({
        where: { id: entrenadorId },
        select: { id: true, codigo: true, nombres: true, apellidos: true, activo: true },
      }),
    ]);

    if (!socio) {
      return { success: false, error: "Socio no encontrado." };
    }
    if (!entrenador || !entrenador.activo) {
      return { success: false, error: "Entrenador no encontrado o inactivo." };
    }

    // 3. Generar sesiones en memoria
    const sesionesTentativas = generatePersonalizedSessions({
      fechaInicio,
      fechaFin,
      frecuenciaAcordada,
      diasAcordados,
      horaInicio: horaInicioAcordada,
      duracionMinutos,
      socioId,
      entrenadorId,
    });

    if (sesionesTentativas.length === 0) {
      return { success: false, error: "El periodo no generó ninguna sesión válida." };
    }

    const minFechaHoraInicio = sesionesTentativas[0].fechaHoraInicio;
    const maxFechaHoraFin = sesionesTentativas[sesionesTentativas.length - 1].fechaHoraFin;

    // 4. Re-validar conflictos en DB antes de persistir (Protección Concurrencia)
    const sesionesExistentes = await prisma.sesionEntrenamientoPersonalizado.findMany({
      where: {
        OR: [{ entrenadorId }, { socioId }],
        estado: { in: [...ESTADOS_BLOQUEANTES] },
        fechaHoraInicio: { lte: maxFechaHoraFin },
        fechaHoraFin: { gte: minFechaHoraInicio },
      },
      select: {
        id: true,
        socioId: true,
        entrenadorId: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
        horaInicio: true,
        horaFin: true,
        estado: true,
        socio: { select: { nombres: true, apellidos: true, codigo: true } },
        entrenador: { select: { nombres: true, apellidos: true, codigo: true } },
      },
    });

    const conflictos = detectSessionConflicts(sesionesTentativas, sesionesExistentes);
    if (conflictos.length > 0) {
      return {
        success: false,
        error: "Existen conflictos de horario que impiden guardar el periodo.",
        conflictos,
      };
    }

    const fechaInicioDate = getLimaStartOfDay(createLimaDateTime(fechaInicio, "00:00"));
    const fechaFinDate = getLimaEndOfDay(createLimaDateTime(fechaFin, "23:59"));
    const usuarioResponsable = session.user.name || session.user.id || "ADMIN";

    // 5. Transacción atómica en Prisma
    const resultadoPeriodo = await prisma.$transaction(async (tx) => {
      // A. Crear Periodo
      const periodo = await tx.periodoEntrenamientoPersonalizado.create({
        data: {
          socioId,
          entrenadorId,
          asignacionId: asignacionId || null,
          perfilPlanificacionId: perfilPlanificacionId || null,
          fechaInicio: fechaInicioDate,
          fechaFin: fechaFinDate,
          mesesPeriodo,
          estado: "ACTIVO",
          frecuenciaRecomendada,
          frecuenciaAcordada,
          diasAcordados,
          horaInicioAcordada,
          duracionMinutos,
          objetivoAcordado: objetivoAcordado || null,
          observaciones: observaciones || null,
          creadoPorUsuarioId: session.user.id || null,
        },
      });

      // B. Crear todas las Sesiones Individuales
      for (const ses of sesionesTentativas) {
        await tx.sesionEntrenamientoPersonalizado.create({
          data: {
            periodoId: periodo.id,
            socioId,
            entrenadorId,
            fecha: ses.fecha,
            horaInicio: ses.horaInicio,
            horaFin: ses.horaFin,
            fechaHoraInicio: ses.fechaHoraInicio,
            fechaHoraFin: ses.fechaHoraFin,
            duracionMinutos: ses.duracionMinutos,
            estado: "PROGRAMADA",
            creadoPorUsuarioId: session.user.id || null,
          },
        });
      }

      return periodo;
    });

    // 6. Registrar en AuditLog inmutable
    const socioNombre = `${socio.nombres || ""} ${socio.apellidos || ""}`.trim() || socio.codigo;
    const entrenadorNombre = `${entrenador.nombres || ""} ${entrenador.apellidos || ""}`.trim() || entrenador.codigo;
    const detalleAudit = `Periodo creado para ${socioNombre} con entrenador ${entrenadorNombre}. Rango: ${fechaInicio} al ${fechaFin}. Frecuencia acordada: ${frecuenciaAcordada} días/sem (${diasAcordados.join(", ")} a las ${horaInicioAcordada}, ${duracionMinutos} min). Total sesiones programadas: ${sesionesTentativas.length}.`;

    await logAction("CREAR_PERIODO_PERSONALIZADO", detalleAudit);

    // 7. Revalidar paths de caché
    safeRevalidatePath(`/socios/${socioId}`);
    safeRevalidatePath(`/admin/personal/${entrenadorId}`);

    return {
      success: true,
      periodoId: resultadoPeriodo.id,
      totalSesiones: sesionesTentativas.length,
    };
  } catch (error: any) {
    console.error("Error en confirmarPeriodoPersonalizado:", error);
    return {
      success: false,
      error: error.message || "Error al confirmar y guardar el periodo de entrenamiento personalizado.",
    };
  }
}

/**
 * Consulta todos los periodos de entrenamiento personalizado de un socio,
 * con conteo de sesiones por estado.
 */
export async function getPeriodosSocio(socioId: string) {
  try {
    await requireAuth();

    const periodos = await prisma.periodoEntrenamientoPersonalizado.findMany({
      where: { socioId },
      include: {
        entrenador: {
          select: { id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true },
        },
        sesiones: {
          select: { id: true, estado: true },
        },
      },
      orderBy: { fechaInicio: "desc" },
    });

    return {
      success: true,
      data: periodos.map((p) => {
        const total = p.sesiones.length;
        const completadas = p.sesiones.filter((s) => s.estado === "COMPLETADA").length;
        const programadas = p.sesiones.filter((s) => s.estado === "PROGRAMADA").length;
        const canceladas = p.sesiones.filter((s) =>
          ["CANCELADA_CLIENTE", "CANCELADA_ENTRENADOR", "CANCELADA_GIMNASIO"].includes(s.estado)
        ).length;
        const reprogramadas = p.sesiones.filter((s) => s.estado === "REPROGRAMADA").length;

        return {
          id: p.id,
          fechaInicio: formatLimaDate(p.fechaInicio),
          fechaFin: formatLimaDate(p.fechaFin),
          mesesPeriodo: p.mesesPeriodo,
          estado: p.estado,
          frecuenciaRecomendada: p.frecuenciaRecomendada,
          frecuenciaAcordada: p.frecuenciaAcordada,
          diasAcordados: p.diasAcordados as string[],
          horaInicioAcordada: p.horaInicioAcordada,
          duracionMinutos: p.duracionMinutos,
          objetivoAcordado: p.objetivoAcordado,
          observaciones: p.observaciones,
          entrenador: p.entrenador,
          createdAt: p.createdAt.toISOString(),
          metricas: {
            total,
            completadas,
            programadas,
            canceladas,
            reprogramadas,
          },
        };
      }),
    };
  } catch (error: any) {
    console.error("Error en getPeriodosSocio:", error);
    return { success: false, error: "Error al consultar periodos del socio." };
  }
}

/**
 * Consulta el detalle de un periodo específico con sus sesiones ordenadas cronológicamente.
 */
export async function getPeriodoDetalle(periodoId: string) {
  try {
    await requireAuth();

    const periodo = await prisma.periodoEntrenamientoPersonalizado.findUnique({
      where: { id: periodoId },
      include: {
        socio: {
          select: { id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true, telefono: true },
        },
        entrenador: {
          select: { id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true, telefono: true },
        },
        sesiones: {
          orderBy: { fechaHoraInicio: "asc" },
          include: {
            sesionOriginal: {
              select: { id: true, fecha: true, horaInicio: true, horaFin: true },
            },
          },
        },
      },
    });

    if (!periodo) {
      return { success: false, error: "Periodo no encontrado." };
    }

    return {
      success: true,
      data: {
        ...periodo,
        fechaInicio: formatLimaDate(periodo.fechaInicio),
        fechaFin: formatLimaDate(periodo.fechaFin),
        sesiones: periodo.sesiones.map((s) => ({
          ...s,
          fecha: formatLimaDate(s.fecha),
          fechaHoraInicio: s.fechaHoraInicio.toISOString(),
          fechaHoraFin: s.fechaHoraFin.toISOString(),
        })),
      },
    };
  } catch (error: any) {
    console.error("Error en getPeriodoDetalle:", error);
    return { success: false, error: "Error al consultar detalle del periodo." };
  }
}

/**
 * Consulta el periodo activo vigente de un socio (FASE H6) con detalles del entrenador y métricas.
 */
export async function getPeriodoActivoSocio(socioId: string) {
  try {
    await requireAuth();

    const periodo = await prisma.periodoEntrenamientoPersonalizado.findFirst({
      where: {
        socioId,
        estado: "ACTIVO",
      },
      include: {
        socio: {
          select: { id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true, telefono: true },
        },
        entrenador: {
          select: { id: true, codigo: true, nombres: true, apellidos: true, fotoUrl: true, telefono: true, rol: true },
        },
        sesiones: {
          orderBy: { fechaHoraInicio: "asc" },
          select: {
            id: true,
            fecha: true,
            horaInicio: true,
            horaFin: true,
            fechaHoraInicio: true,
            fechaHoraFin: true,
            duracionMinutos: true,
            estado: true,
            esReprogramada: true,
          },
        },
      },
      orderBy: { fechaInicio: "desc" },
    });

    if (!periodo) {
      return { success: true, data: null };
    }

    const total = periodo.sesiones.length;
    const completadas = periodo.sesiones.filter((s) => s.estado === "COMPLETADA").length;
    const programadas = periodo.sesiones.filter((s) => s.estado === "PROGRAMADA").length;
    const canceladas = periodo.sesiones.filter((s) =>
      ["CANCELADA_CLIENTE", "CANCELADA_ENTRENADOR", "CANCELADA_GIMNASIO"].includes(s.estado)
    ).length;
    const reprogramadas = periodo.sesiones.filter((s) => s.estado === "REPROGRAMADA").length;
    const noAsistio = periodo.sesiones.filter((s) => s.estado === "NO_ASISTIO").length;

    return {
      success: true,
      data: {
        ...periodo,
        fechaInicio: formatLimaDate(periodo.fechaInicio),
        fechaFin: formatLimaDate(periodo.fechaFin),
        diasAcordados: periodo.diasAcordados as string[],
        metricas: {
          total,
          completadas,
          programadas,
          canceladas,
          reprogramadas,
          noAsistio,
        },
      },
    };
  } catch (error: any) {
    console.error("Error en getPeriodoActivoSocio:", error);
    return { success: false, error: "Error al consultar periodo activo del socio." };
  }
}

/**
 * Cambia el estado de un Periodo de Entrenamiento Personalizado (FASE H6).
 * Estados admitidos: ACTIVO, PAUSADO, FINALIZADO, CANCELADO.
 * Principio NO DELETE: No elimina periodos ni sesiones, conservando toda la trazabilidad en AuditLog.
 */
export async function cambiarEstadoPeriodoPersonalizado(
  input: CambiarEstadoPeriodoInput
): Promise<{ success: boolean; periodoId?: string; estado?: string; error?: string }> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    const validacion = cambiarEstadoPeriodoSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos de cambio de estado inválidos.",
      };
    }

    const { periodoId, nuevoEstado, motivo } = validacion.data;

    const periodo = await prisma.periodoEntrenamientoPersonalizado.findUnique({
      where: { id: periodoId },
      include: {
        socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
      },
    });

    if (!periodo) {
      return { success: false, error: "Periodo no encontrado." };
    }

    // Validar permisos según rol
    const userRole = session.user.role || "ADMIN";
    const userPermissions = (session.user.permissions as string[]) || [];
    const esAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
    const tienePermisoGestionar = userPermissions.includes("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!esAdmin && !tienePermisoGestionar) {
      if (userRole === "ENTRENADOR") {
        const userDb = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { personalId: true },
        });
        if (!userDb?.personalId || userDb.personalId !== periodo.entrenadorId) {
          return { success: false, error: "No tienes permiso para gestionar periodos de otro entrenador." };
        }
      } else {
        return { success: false, error: "No tienes permiso para gestionar periodos personalizados." };
      }
    }

    const estadoAnterior = periodo.estado;
    const observacionesActualizadas = motivo
      ? `${periodo.observaciones ? periodo.observaciones + " | " : ""}[${nuevoEstado}]: ${motivo.trim()}`
      : periodo.observaciones;

    const periodoActualizado = await prisma.periodoEntrenamientoPersonalizado.update({
      where: { id: periodoId },
      data: {
        estado: nuevoEstado,
        observaciones: observacionesActualizadas,
      },
    });

    // Auditoría inmutable
    const socioNombre = `${periodo.socio.nombres || ""} ${periodo.socio.apellidos || ""}`.trim() || periodo.socio.codigo;
    const entrenadorNombre = `${periodo.entrenador.nombres || ""} ${periodo.entrenador.apellidos || ""}`.trim() || periodo.entrenador.codigo;
    const usuarioResponsable = session.user.name || session.user.id || "ADMIN";
    const motivoTexto = motivo ? ` Motivo: ${motivo.trim()}.` : "";

    const detalleAudit = `Cambio de estado del periodo para socio ${socioNombre} (Entrenador: ${entrenadorNombre}). Transición: ${estadoAnterior} -> ${nuevoEstado}.${motivoTexto} Responsable: ${usuarioResponsable}.`;

    await logAction("CAMBIAR_ESTADO_PERIODO_PERSONALIZADO", detalleAudit);

    safeRevalidatePath(`/socios/${periodo.socioId}`);
    safeRevalidatePath(`/admin/personal/${periodo.entrenadorId}`);

    return {
      success: true,
      periodoId: periodoActualizado.id,
      estado: periodoActualizado.estado,
    };
  } catch (error: any) {
    console.error("Error en cambiarEstadoPeriodoPersonalizado:", error);
    return {
      success: false,
      error: error.message || "Error al cambiar el estado del periodo.",
    };
  }
}

/**
 * Actualiza el acuerdo de entrenamiento de un periodo activo (FASE H6):
 * - Modifica frecuencia, días, horarios o duración.
 * - Respeta estrictamente sesiones históricas y completadas/reprogramadas/canceladas (NO DELETE).
 * - Ajusta únicamente las sesiones futuras PROGRAMADA pendientes.
 * - Detecta y bloquea colisiones de horario concurrentes.
 * - Registra la trazabilidad completa en AuditLog.
 */
export async function actualizarAcuerdoPeriodoPersonalizado(
  input: ActualizarAcuerdoPeriodoInput
): Promise<{
  success: boolean;
  periodoId?: string;
  totalNuevasSesiones?: number;
  conflictos?: ConflictoSesion[];
  error?: string;
}> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    const validacion = actualizarAcuerdoPeriodoSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos del acuerdo inválidos.",
      };
    }

    const {
      periodoId,
      frecuenciaRecomendada,
      frecuenciaAcordada,
      diasAcordados,
      horaInicioAcordada,
      duracionMinutos,
      objetivoAcordado,
      observaciones,
      motivoCambio,
    } = validacion.data;

    const periodo = await prisma.periodoEntrenamientoPersonalizado.findUnique({
      where: { id: periodoId },
      include: {
        socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, codigo: true, nombres: true, apellidos: true, activo: true } },
        sesiones: {
          orderBy: { fechaHoraInicio: "asc" },
        },
      },
    });

    if (!periodo) {
      return { success: false, error: "Periodo no encontrado." };
    }

    if (periodo.estado !== "ACTIVO") {
      return { success: false, error: `No se puede actualizar el acuerdo de un periodo en estado ${periodo.estado}.` };
    }

    // Validar permisos
    const userRole = session.user.role || "ADMIN";
    const userPermissions = (session.user.permissions as string[]) || [];
    const esAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
    const tienePermisoGestionar = userPermissions.includes("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!esAdmin && !tienePermisoGestionar) {
      if (userRole === "ENTRENADOR") {
        const userDb = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { personalId: true },
        });
        if (!userDb?.personalId || userDb.personalId !== periodo.entrenadorId) {
          return { success: false, error: "No tienes permiso para modificar periodos de otro entrenador." };
        }
      } else {
        return { success: false, error: "No tienes permiso para modificar periodos personalizados." };
      }
    }

    const nowUtc = new Date();
    const fechaInicioPeriodoStr = formatLimaDate(periodo.fechaInicio);
    const fechaFinPeriodoStr = formatLimaDate(periodo.fechaFin);
    const todayLimaStr = formatLimaDate(nowUtc);

    const startAdjustDateStr = todayLimaStr > fechaInicioPeriodoStr ? todayLimaStr : fechaInicioPeriodoStr;

    // Generar las nuevas sesiones tentativas desde startAdjustDateStr hasta fechaFin
    const nuevasSesionesTentativas = generatePersonalizedSessions({
      fechaInicio: startAdjustDateStr,
      fechaFin: fechaFinPeriodoStr,
      frecuenciaAcordada,
      diasAcordados,
      horaInicio: horaInicioAcordada,
      duracionMinutos,
      socioId: periodo.socioId,
      entrenadorId: periodo.entrenadorId,
    });

    // Identificar las sesiones futuras de este periodo que están en PROGRAMADA
    const sesionesFuturasProgramadas = periodo.sesiones.filter(
      (s) => s.estado === "PROGRAMADA" && s.fechaHoraInicio > nowUtc
    );
    const idsFuturasProgramadas = sesionesFuturasProgramadas.map((s) => s.id);

    // Consultar conflictos bloqueantes excluyendo las sesiones futuras PROGRAMADA de este mismo periodo
    let conflictos: ConflictoSesion[] = [];
    if (nuevasSesionesTentativas.length > 0) {
      const minStart = nuevasSesionesTentativas[0].fechaHoraInicio;
      const maxEnd = nuevasSesionesTentativas[nuevasSesionesTentativas.length - 1].fechaHoraFin;

      const sesionesExistentesBloqueantes = await prisma.sesionEntrenamientoPersonalizado.findMany({
        where: {
          id: { notIn: idsFuturasProgramadas },
          OR: [{ entrenadorId: periodo.entrenadorId }, { socioId: periodo.socioId }],
          estado: { in: [...ESTADOS_BLOQUEANTES] },
          fechaHoraInicio: { lte: maxEnd },
          fechaHoraFin: { gte: minStart },
        },
        select: {
          id: true,
          socioId: true,
          entrenadorId: true,
          fechaHoraInicio: true,
          fechaHoraFin: true,
          horaInicio: true,
          horaFin: true,
          estado: true,
          socio: { select: { nombres: true, apellidos: true, codigo: true } },
          entrenador: { select: { nombres: true, apellidos: true, codigo: true } },
        },
      });

      conflictos = detectSessionConflicts(nuevasSesionesTentativas, sesionesExistentesBloqueantes);
      if (conflictos.length > 0) {
        return {
          success: false,
          error: "Existen conflictos de horario que impiden aplicar el nuevo acuerdo.",
          conflictos,
        };
      }
    }

    // Transacción atómica en Prisma (NO DELETE: marcamos las futuras no ocurridas y creamos las nuevas)
    await prisma.$transaction(async (tx) => {
      // 1. Cancelar las sesiones futuras pendientes de este periodo que son reemplazadas
      for (const s of sesionesFuturasProgramadas) {
        await tx.sesionEntrenamientoPersonalizado.update({
          where: { id: s.id },
          data: {
            estado: "CANCELADA_GIMNASIO",
            motivoCancelacion: `Ajuste de acuerdo de periodo: ${motivoCambio.trim()}`,
          },
        });
      }

      // 2. Crear las nuevas sesiones acordadas
      for (const ses of nuevasSesionesTentativas) {
        await tx.sesionEntrenamientoPersonalizado.create({
          data: {
            periodoId: periodo.id,
            socioId: periodo.socioId,
            entrenadorId: periodo.entrenadorId,
            fecha: ses.fecha,
            horaInicio: ses.horaInicio,
            horaFin: ses.horaFin,
            fechaHoraInicio: ses.fechaHoraInicio,
            fechaHoraFin: ses.fechaHoraFin,
            duracionMinutos: ses.duracionMinutos,
            estado: "PROGRAMADA",
            notasEntrenador: `Acuerdo actualizado: ${motivoCambio.trim()}`,
            creadoPorUsuarioId: session.user.id || null,
          },
        });
      }

      // 3. Actualizar datos del Periodo
      await tx.periodoEntrenamientoPersonalizado.update({
        where: { id: periodoId },
        data: {
          frecuenciaRecomendada: frecuenciaRecomendada ?? periodo.frecuenciaRecomendada,
          frecuenciaAcordada,
          diasAcordados,
          horaInicioAcordada,
          duracionMinutos,
          objetivoAcordado: objetivoAcordado !== undefined ? objetivoAcordado : periodo.objetivoAcordado,
          observaciones: observaciones !== undefined ? observaciones : periodo.observaciones,
        },
      });
    });

    // 4. Registrar en AuditLog con valores anteriores y nuevos
    const socioNombre = `${periodo.socio.nombres || ""} ${periodo.socio.apellidos || ""}`.trim() || periodo.socio.codigo;
    const entrenadorNombre = `${periodo.entrenador.nombres || ""} ${periodo.entrenador.apellidos || ""}`.trim() || periodo.entrenador.codigo;
    const usuarioResponsable = session.user.name || session.user.id || "ADMIN";
    const diasAnterioresStr = Array.isArray(periodo.diasAcordados) ? (periodo.diasAcordados as string[]).join(", ") : "N/A";
    const diasNuevosStr = diasAcordados.join(", ");

    const detalleAudit = `Actualización de acuerdo para socio ${socioNombre} (Entrenador: ${entrenadorNombre}). Periodo ID: ${periodo.id}. Frecuencia: [Anterior: ${periodo.frecuenciaAcordada} d/sem -> Nueva: ${frecuenciaAcordada} d/sem]. Días: [Anterior: ${diasAnterioresStr} -> Nuevo: ${diasNuevosStr}]. Horario: [Anterior: ${periodo.horaInicioAcordada} (${periodo.duracionMinutos} min) -> Nuevo: ${horaInicioAcordada} (${duracionMinutos} min)]. Sesiones futuras canceladas por reajuste: ${sesionesFuturasProgramadas.length}. Nuevas sesiones generadas: ${nuevasSesionesTentativas.length}. Motivo: ${motivoCambio.trim()}. Responsable: ${usuarioResponsable}.`;

    await logAction("ACTUALIZAR_ACUERDO_PERIODO_PERSONALIZADO", detalleAudit);

    safeRevalidatePath(`/socios/${periodo.socioId}`);
    safeRevalidatePath(`/admin/personal/${periodo.entrenadorId}`);

    return {
      success: true,
      periodoId: periodo.id,
      totalNuevasSesiones: nuevasSesionesTentativas.length,
    };
  } catch (error: any) {
    console.error("Error en actualizarAcuerdoPeriodoPersonalizado:", error);
    return {
      success: false,
      error: error.message || "Error al actualizar el acuerdo del periodo.",
    };
  }
}

/**
 * Reprograma una sesión existente (FASE H4):
 * 1. La sesión original pasa a estado "REPROGRAMADA" conservando todo su historial y apuntando a la nueva (reprogramadaEnSesionId).
 * 2. Se crea una nueva sesión en estado "PROGRAMADA" vinculada a la original (sesionOriginalId, esReprogramada=true).
 * 3. Se valida que no existan colisiones de horario en la nueva fecha/hora con el socio ni el entrenador.
 * 4. Toda la operación se realiza en una transacción atómica y queda auditada.
 */
export async function reprogramarSesionPersonalizada(
  input: ReprogramarSesionPersonalizadaInput
): Promise<{
  success: boolean;
  sesionOriginalId?: string;
  nuevaSesionId?: string;
  nuevaFecha?: string;
  nuevaHora?: string;
  error?: string;
  conflictos?: ConflictoSesion[];
}> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    // 1. Validar esquema Zod
    const validacion = reprogramarSesionPersonalizadaSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos de reprogramación inválidos.",
      };
    }

    const {
      sesionId,
      nuevaFecha,
      nuevaHoraInicio,
      duracionMinutos,
      nuevoEntrenadorId,
      motivoReprogramacion,
    } = validacion.data;

    // 2. Obtener sesión original con socio, entrenador y periodo
    const sesionOriginal = await prisma.sesionEntrenamientoPersonalizado.findUnique({
      where: { id: sesionId },
      include: {
        socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, codigo: true, nombres: true, apellidos: true, activo: true } },
        periodo: { select: { id: true, estado: true, fechaInicio: true, fechaFin: true } },
      },
    });

    if (!sesionOriginal) {
      return { success: false, error: "Sesión no encontrada." };
    }

    // 3. Validar estado de la sesión original
    if (sesionOriginal.estado === "REPROGRAMADA") {
      return { success: false, error: "La sesión ya ha sido reprogramada anteriormente." };
    }
    if (["CANCELADA_CLIENTE", "CANCELADA_ENTRENADOR", "CANCELADA_GIMNASIO"].includes(sesionOriginal.estado)) {
      return { success: false, error: "No se puede reprogramar una sesión cancelada." };
    }
    if (sesionOriginal.estado === "COMPLETADA") {
      return { success: false, error: "No se puede reprogramar una sesión completada (histórica)." };
    }
    if (sesionOriginal.estado === "NO_ASISTIO") {
      return { success: false, error: "No se puede reprogramar una sesión histórica con estado NO_ASISTIO." };
    }
    if (sesionOriginal.estado !== "PROGRAMADA") {
      return { success: false, error: `No se puede reprogramar una sesión en estado ${sesionOriginal.estado}.` };
    }

    // 4. Validar permisos según rol
    const userRole = session.user.role || "ADMIN";
    const userPermissions = (session.user.permissions as string[]) || [];
    const esAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
    const tienePermisoGestionar = userPermissions.includes("PLANES_PERSONALIZADOS_GESTIONAR");

    // Si es entrenador, verificar que sea el entrenador asignado a la sesión
    if (!esAdmin && !tienePermisoGestionar && userRole === "ENTRENADOR") {
      const userDb = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { personalId: true },
      });
      if (!userDb?.personalId || userDb.personalId !== sesionOriginal.entrenadorId) {
        return { success: false, error: "No tienes permiso para reprogramar sesiones de otro entrenador." };
      }
      if (nuevoEntrenadorId && nuevoEntrenadorId !== sesionOriginal.entrenadorId) {
        return { success: false, error: "Los entrenadores no pueden reasignar sesiones a otro entrenador. Requiere administrador o recepción." };
      }
    }

    // 5. Determinar entrenador de destino
    const targetEntrenadorId = nuevoEntrenadorId || sesionOriginal.entrenadorId;
    let nuevoEntrenador = sesionOriginal.entrenador;
    if (targetEntrenadorId !== sesionOriginal.entrenadorId) {
      const entDb = await prisma.personal.findUnique({
        where: { id: targetEntrenadorId },
        select: { id: true, codigo: true, nombres: true, apellidos: true, activo: true },
      });
      if (!entDb || !entDb.activo) {
        return { success: false, error: "El nuevo entrenador seleccionado no existe o no está activo." };
      }
      nuevoEntrenador = entDb;
    }

    // 6. Calcular fechas y horas en America/Lima
    const duracion = duracionMinutos || sesionOriginal.duracionMinutos || 60;
    const nuevaFechaHoraInicio = createLimaDateTime(nuevaFecha, nuevaHoraInicio);
    const nuevaFechaHoraFin = new Date(nuevaFechaHoraInicio.getTime() + duracion * 60 * 1000);
    const nuevaHoraFinStr = formatLimaTime(nuevaFechaHoraFin);
    const fechaInicioLima = getLimaStartOfDay(nuevaFechaHoraInicio);

    // Validar cruce de medianoche en Lima
    if (formatLimaDate(nuevaFechaHoraFin) !== nuevaFecha) {
      return { success: false, error: "La sesión no puede cruzar la medianoche en horario local." };
    }

    // 7. Preparar sesión tentativa y validar conflictos en DB (Protección de Concurrencia)
    const sesionNuevaTentativa: SesionTentativa = {
      fecha: fechaInicioLima,
      fechaStr: nuevaFecha,
      diaSemana: getLimaDayOfWeek(nuevaFechaHoraInicio),
      horaInicio: nuevaHoraInicio,
      horaFin: nuevaHoraFinStr,
      fechaHoraInicio: nuevaFechaHoraInicio,
      fechaHoraFin: nuevaFechaHoraFin,
      duracionMinutos: duracion,
      socioId: sesionOriginal.socioId,
      entrenadorId: targetEntrenadorId,
    };

    // Consultar sesiones bloqueantes concurrentes para socio o entrenador en ese rango
    const sesionesExistentes = await prisma.sesionEntrenamientoPersonalizado.findMany({
      where: {
        id: { not: sesionOriginal.id }, // La sesión original queda liberada por la reprogramación
        OR: [{ entrenadorId: targetEntrenadorId }, { socioId: sesionOriginal.socioId }],
        estado: { in: [...ESTADOS_BLOQUEANTES] },
        fechaHoraInicio: { lte: nuevaFechaHoraFin },
        fechaHoraFin: { gte: nuevaFechaHoraInicio },
      },
      select: {
        id: true,
        socioId: true,
        entrenadorId: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
        horaInicio: true,
        horaFin: true,
        estado: true,
        socio: { select: { nombres: true, apellidos: true, codigo: true } },
        entrenador: { select: { nombres: true, apellidos: true, codigo: true } },
      },
    });

    const conflictos = detectSessionConflicts([sesionNuevaTentativa], sesionesExistentes);
    if (conflictos.length > 0) {
      return {
        success: false,
        error: "Existen conflictos de horario en la nueva fecha y hora solicitada.",
        conflictos,
      };
    }

    // 8. Transacción atómica en Prisma
    const resultado = await prisma.$transaction(async (tx) => {
      // A. Crear la nueva sesión derivada
      const nuevaSesion = await tx.sesionEntrenamientoPersonalizado.create({
        data: {
          periodoId: sesionOriginal.periodoId,
          socioId: sesionOriginal.socioId,
          entrenadorId: targetEntrenadorId,
          fecha: fechaInicioLima,
          horaInicio: nuevaHoraInicio,
          horaFin: nuevaHoraFinStr,
          fechaHoraInicio: nuevaFechaHoraInicio,
          fechaHoraFin: nuevaFechaHoraFin,
          duracionMinutos: duracion,
          estado: "PROGRAMADA",
          esReprogramada: true,
          sesionOriginalId: sesionOriginal.id,
          motivoReprogramacion: motivoReprogramacion.trim(),
          creadoPorUsuarioId: session.user.id || null,
        },
      });

      // B. Actualizar la sesión original a REPROGRAMADA
      await tx.sesionEntrenamientoPersonalizado.update({
        where: { id: sesionOriginal.id },
        data: {
          estado: "REPROGRAMADA",
          reprogramadaEnSesionId: nuevaSesion.id,
          motivoReprogramacion: motivoReprogramacion.trim(),
        },
      });

      return nuevaSesion;
    });

    // 9. Registrar en AuditLog
    const socioNombre = `${sesionOriginal.socio.nombres || ""} ${sesionOriginal.socio.apellidos || ""}`.trim() || sesionOriginal.socio.codigo;
    const entrenadorOriginalNombre = `${sesionOriginal.entrenador.nombres || ""} ${sesionOriginal.entrenador.apellidos || ""}`.trim() || sesionOriginal.entrenador.codigo;
    const nuevoEntrenadorNombre = `${nuevoEntrenador.nombres || ""} ${nuevoEntrenador.apellidos || ""}`.trim() || nuevoEntrenador.codigo;
    const fechaOriginalStr = formatLimaDate(sesionOriginal.fecha);
    const usuarioResponsable = session.user.name || session.user.id || "ADMIN";

    const cambioEntrenadorMsg = targetEntrenadorId !== sesionOriginal.entrenadorId
      ? ` con cambio de entrenador a ${nuevoEntrenadorNombre}`
      : "";

    const detalleAudit = `Reprogramación de sesión para socio ${socioNombre}${cambioEntrenadorMsg}. Original: ${fechaOriginalStr} ${sesionOriginal.horaInicio}-${sesionOriginal.horaFin} (${entrenadorOriginalNombre}). Nueva: ${nuevaFecha} ${nuevaHoraInicio}-${nuevaHoraFinStr} (${nuevoEntrenadorNombre}). Motivo: ${motivoReprogramacion.trim()}. Responsable: ${usuarioResponsable}.`;

    await logAction("REPROGRAMAR_SESION_PERSONALIZADO", detalleAudit);

    // 10. Revalidar paths de caché
    safeRevalidatePath(`/socios/${sesionOriginal.socioId}`);
    safeRevalidatePath(`/admin/personal/${sesionOriginal.entrenadorId}`);
    if (targetEntrenadorId !== sesionOriginal.entrenadorId) {
      safeRevalidatePath(`/admin/personal/${targetEntrenadorId}`);
    }

    return {
      success: true,
      sesionOriginalId: sesionOriginal.id,
      nuevaSesionId: resultado.id,
      nuevaFecha,
      nuevaHora: nuevaHoraInicio,
    };
  } catch (error: any) {
    console.error("Error en reprogramarSesionPersonalizada:", error);
    return {
      success: false,
      error: error.message || "Error al reprogramar la sesión de entrenamiento personalizado.",
    };
  }
}

/**
 * Cancela una sesión existente (NO DELETE):
 * 1. Cambia el estado a CANCELADA_CLIENTE, CANCELADA_ENTRENADOR o CANCELADA_GIMNASIO.
 * 2. Guarda el motivoCancelacion y usuario responsable.
 * 3. La sesión cancelada libera el horario para nuevos agendamientos pero permanece visible en historial.
 * 4. Queda auditada en AuditLog.
 */
export async function cancelarSesionPersonalizada(
  input: CancelarSesionPersonalizadaInput
): Promise<{
  success: boolean;
  sesionId?: string;
  estado?: string;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    // 1. Validar esquema Zod
    const validacion = cancelarSesionPersonalizadaSchema.safeParse(input);
    if (!validacion.success) {
      return {
        success: false,
        error: validacion.error.issues[0]?.message || "Datos de cancelación inválidos.",
      };
    }

    const { sesionId, tipoCancelacion, motivoCancelacion } = validacion.data;

    // 2. Obtener sesión con socio y entrenador
    const sesion = await prisma.sesionEntrenamientoPersonalizado.findUnique({
      where: { id: sesionId },
      include: {
        socio: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
        entrenador: { select: { id: true, codigo: true, nombres: true, apellidos: true } },
      },
    });

    if (!sesion) {
      return { success: false, error: "Sesión no encontrada." };
    }

    // 3. Validar estado actual de la sesión
    if (["CANCELADA_CLIENTE", "CANCELADA_ENTRENADOR", "CANCELADA_GIMNASIO"].includes(sesion.estado)) {
      return { success: false, error: "La sesión ya se encuentra cancelada." };
    }
    if (sesion.estado === "REPROGRAMADA") {
      return { success: false, error: "No se puede cancelar una sesión que ya ha sido reprogramada." };
    }
    if (sesion.estado === "COMPLETADA") {
      return { success: false, error: "No se puede cancelar una sesión completada (histórica)." };
    }
    if (sesion.estado === "NO_ASISTIO") {
      return { success: false, error: "No se puede cancelar una sesión histórica con estado NO_ASISTIO." };
    }
    if (sesion.estado !== "PROGRAMADA") {
      return { success: false, error: `No se puede cancelar una sesión en estado ${sesion.estado}.` };
    }

    // 4. Validar permisos según rol
    const userRole = session.user.role || "ADMIN";
    const userPermissions = (session.user.permissions as string[]) || [];
    const esAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
    const tienePermisoGestionar = userPermissions.includes("PLANES_PERSONALIZADOS_GESTIONAR");

    if (!esAdmin && !tienePermisoGestionar && userRole === "ENTRENADOR") {
      const userDb = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { personalId: true },
      });
      if (!userDb?.personalId || userDb.personalId !== sesion.entrenadorId) {
        return { success: false, error: "No tienes permiso para cancelar sesiones de otro entrenador." };
      }
    }

    // 5. Actualizar estado de la sesión (NO DELETE)
    const sesionActualizada = await prisma.sesionEntrenamientoPersonalizado.update({
      where: { id: sesionId },
      data: {
        estado: tipoCancelacion,
        motivoCancelacion: motivoCancelacion.trim(),
      },
    });

    // 6. Registrar en AuditLog
    const socioNombre = `${sesion.socio.nombres || ""} ${sesion.socio.apellidos || ""}`.trim() || sesion.socio.codigo;
    const entrenadorNombre = `${sesion.entrenador.nombres || ""} ${sesion.entrenador.apellidos || ""}`.trim() || sesion.entrenador.codigo;
    const fechaStr = formatLimaDate(sesion.fecha);
    const usuarioResponsable = session.user.name || session.user.id || "ADMIN";

    const detalleAudit = `Cancelación (${tipoCancelacion}) de sesión para socio ${socioNombre} con entrenador ${entrenadorNombre} programada el ${fechaStr} ${sesion.horaInicio}-${sesion.horaFin}. Motivo: ${motivoCancelacion.trim()}. Responsable: ${usuarioResponsable}.`;

    await logAction("CANCELAR_SESION_PERSONALIZADO", detalleAudit);

    // 7. Revalidar paths de caché
    safeRevalidatePath(`/socios/${sesion.socioId}`);
    safeRevalidatePath(`/admin/personal/${sesion.entrenadorId}`);

    return {
      success: true,
      sesionId: sesionActualizada.id,
      estado: sesionActualizada.estado,
    };
  } catch (error: any) {
    console.error("Error en cancelarSesionPersonalizada:", error);
    return {
      success: false,
      error: error.message || "Error al cancelar la sesión de entrenamiento personalizado.",
    };
  }
}

export interface GetSesionesCalendarioParams {
  fechaDesde?: string; // "YYYY-MM-DD"
  fechaHasta?: string; // "YYYY-MM-DD"
  socioId?: string;
  entrenadorId?: string;
  estado?: string; // "VIGENTES" | "TODOS" | "PROGRAMADA" | "CANCELADAS" | "COMPLETADA" | "REPROGRAMADA" | "NO_ASISTIO"
  soloVigentes?: boolean;
}

export interface EventoSesionCalendario {
  id: string;
  periodoId: string;
  socioId: string;
  socioNombre: string;
  socioCodigo: string;
  socioTelefono: string | null;
  entrenadorId: string;
  entrenadorNombre: string;
  entrenadorCodigo: string;
  entrenadorTelefono: string | null;
  entrenadorRol: string;
  fecha: string; // "YYYY-MM-DD"
  diaSemana: string;
  horaInicio: string; // "08:00"
  horaFin: string; // "09:00"
  fechaHoraInicio: string; // ISO String
  fechaHoraFin: string; // ISO String
  duracionMinutos: number;
  estado: string;
  esReprogramada: boolean;
  sesionOriginalId: string | null;
  reprogramadaEnSesionId: string | null;
  motivoReprogramacion: string | null;
  motivoCancelacion: string | null;
  observaciones: string | null;
  periodoResumen?: {
    fechaInicio: string;
    fechaFin: string;
    objetivoAcordado: string | null;
  };
  sesionOriginalResumen?: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
  } | null;
  sesionDerivadaResumen?: {
    fecha: string;
    horaInicio: string;
    horaFin: string;
  } | null;
}

/**
 * Consulta de sesiones para el Calendario Visual de Entrenamiento Personalizado.
 * Soporta filtros por rango de fechas (Día, Semana, Mes), socio, entrenador y estado.
 * Por defecto (soloVigentes = true) excluye las sesiones REPROGRAMADA para que en cadenas
 * SES-001 -> SES-002 -> SES-003 solo aparezca la sesión activa vigente (SES-003).
 */
export async function getSesionesCalendarioPersonalizado(
  params: GetSesionesCalendarioParams = {}
): Promise<{
  success: boolean;
  sesiones?: EventoSesionCalendario[];
  total?: number;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    if (!session?.user) {
      return { success: false, error: "No autenticado." };
    }

    const {
      fechaDesde,
      fechaHasta,
      socioId,
      entrenadorId,
      estado = "VIGENTES",
      soloVigentes = true,
    } = params;

    const whereClause: any = {};

    // 1. Filtro de fechas (America/Lima)
    if (fechaDesde && fechaHasta) {
      const startUtc = createLimaDateTime(fechaDesde, "00:00");
      const endUtc = createLimaDateTime(fechaHasta, "23:59");
      whereClause.fechaHoraInicio = {
        gte: startUtc,
        lte: endUtc,
      };
    } else if (fechaDesde) {
      const startUtc = createLimaDateTime(fechaDesde, "00:00");
      whereClause.fechaHoraInicio = {
        gte: startUtc,
      };
    } else if (fechaHasta) {
      const endUtc = createLimaDateTime(fechaHasta, "23:59");
      whereClause.fechaHoraInicio = {
        lte: endUtc,
      };
    }

    // 2. Filtro de Socio
    if (socioId && socioId !== "all" && socioId !== "TODOS") {
      whereClause.socioId = socioId;
    }

    // 3. Filtro de Entrenador
    if (entrenadorId && entrenadorId !== "all" && entrenadorId !== "TODOS") {
      whereClause.entrenadorId = entrenadorId;
    }

    // 4. Filtro de Estados y Regla de Reprogramación
    if (estado === "VIGENTES" || (soloVigentes && estado === "TODOS_VIGENTES")) {
      // Solo sesiones activas que no son reprogramadas
      whereClause.estado = "PROGRAMADA";
    } else if (estado === "CANCELADAS") {
      whereClause.estado = {
        in: ["CANCELADA_CLIENTE", "CANCELADA_ENTRENADOR", "CANCELADA_GIMNASIO"],
      };
    } else if (estado && estado !== "TODOS" && estado !== "all") {
      whereClause.estado = estado;
    } else if (soloVigentes && estado === "TODOS") {
      // Si se pide todos pero con soloVigentes por defecto, excluimos REPROGRAMADA
      whereClause.estado = {
        not: "REPROGRAMADA",
      };
    }

    const sesiones = await prisma.sesionEntrenamientoPersonalizado.findMany({
      where: whereClause,
      include: {
        socio: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            telefono: true,
          },
        },
        entrenador: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            telefono: true,
            rol: true,
          },
        },
        periodo: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
            objetivoAcordado: true,
          },
        },
        sesionOriginal: {
          select: {
            id: true,
            fecha: true,
            horaInicio: true,
            horaFin: true,
          },
        },
        sesionesDerivadas: {
          select: {
            id: true,
            fecha: true,
            horaInicio: true,
            horaFin: true,
          },
          take: 1,
        },
      },
      orderBy: {
        fechaHoraInicio: "asc",
      },
    });

    const formattedEvents: EventoSesionCalendario[] = sesiones.map((s) => {
      const socioNombre = `${s.socio.nombres || ""} ${s.socio.apellidos || ""}`.trim() || s.socio.codigo;
      const entrenadorNombre = `${s.entrenador.nombres || ""} ${s.entrenador.apellidos || ""}`.trim() || s.entrenador.codigo;
      const fechaStr = formatLimaDate(s.fecha);
      const sesionDerivada = s.sesionesDerivadas?.[0] || null;

      return {
        id: s.id,
        periodoId: s.periodoId,
        socioId: s.socioId,
        socioNombre,
        socioCodigo: s.socio.codigo,
        socioTelefono: s.socio.telefono,
        entrenadorId: s.entrenadorId,
        entrenadorNombre,
        entrenadorCodigo: s.entrenador.codigo,
        entrenadorTelefono: s.entrenador.telefono,
        entrenadorRol: s.entrenador.rol || "Entrenador",
        fecha: fechaStr,
        diaSemana: getLimaDayOfWeek(s.fecha),
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        fechaHoraInicio: s.fechaHoraInicio.toISOString(),
        fechaHoraFin: s.fechaHoraFin.toISOString(),
        duracionMinutos: s.duracionMinutos,
        estado: s.estado,
        esReprogramada: s.esReprogramada,
        sesionOriginalId: s.sesionOriginalId,
        reprogramadaEnSesionId: s.reprogramadaEnSesionId,
        motivoReprogramacion: s.motivoReprogramacion,
        motivoCancelacion: s.motivoCancelacion,
        observaciones: s.notasEntrenador,
        periodoResumen: s.periodo
          ? {
              fechaInicio: formatLimaDate(s.periodo.fechaInicio),
              fechaFin: formatLimaDate(s.periodo.fechaFin),
              objetivoAcordado: s.periodo.objetivoAcordado,
            }
          : undefined,
        sesionOriginalResumen: s.sesionOriginal
          ? {
              fecha: formatLimaDate(s.sesionOriginal.fecha),
              horaInicio: s.sesionOriginal.horaInicio,
              horaFin: s.sesionOriginal.horaFin,
            }
          : null,
        sesionDerivadaResumen: sesionDerivada
          ? {
              fecha: formatLimaDate(sesionDerivada.fecha),
              horaInicio: sesionDerivada.horaInicio,
              horaFin: sesionDerivada.horaFin,
            }
          : null,
      };
    });

    return {
      success: true,
      sesiones: formattedEvents,
      total: formattedEvents.length,
    };
  } catch (error: any) {
    console.error("Error en getSesionesCalendarioPersonalizado:", error);
    return {
      success: false,
      error: error.message || "Error al consultar las sesiones del calendario.",
    };
  }
}

