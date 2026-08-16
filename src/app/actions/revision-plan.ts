"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";
import { format } from "date-fns";
import { getEvolucionYSeguimientoSocio } from "@/app/actions/evolucion-plan";
import { solicitarGeneracionPlanIA } from "@/app/actions/planes-ia";

const SocioIdSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
});

const DecisionMantenerSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
  perfilId: z.string().uuid("ID de perfil inválido"),
  observacion: z.string().max(500, "La observación no debe exceder 500 caracteres").optional(),
});

const MotivoRevisionEnum = z.enum([
  "CAMBIO_OBJETIVO",
  "EVOLUCION_INSUFICIENTE",
  "ESTANCAMIENTO",
  "CAMBIO_DISPONIBILIDAD",
  "CAMBIO_NIVEL",
  "NUEVA_MEDICION_FISICA",
  "CAMBIO_PREFERENCIAS_ALIMENTARIAS",
  "AJUSTE_RUTINA",
  "REVISION_PERIODICA",
  "OTRO",
]);

const SolicitarAdaptacionSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
  perfilId: z.string().uuid("ID de perfil inválido"),
  motivoRevision: MotivoRevisionEnum,
  nuevoObjetivo: z.string().optional(),
  nuevoNivel: z.string().optional(),
  observacion: z.string().max(500, "El comentario no debe exceder 500 caracteres").optional(),
});

/**
 * Consulta de datos unificados para el Panel de Revisión del Plan.
 */
export async function getDatosRevisionPlan(socioId: string) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    SocioIdSchema.parse({ socioId });

    const evoRes = await getEvolucionYSeguimientoSocio(socioId);
    if (!evoRes.success || !evoRes.data) {
      return { success: false, error: evoRes.error || "Error al obtener datos de evolución." };
    }

    // Historial de decisiones anteriores en AuditLog
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        detalles: { contains: socioId },
        accion: {
          in: [
            "REVISAR_PLAN",
            "MANTENER_PLAN",
            "SOLICITAR_NUEVA_PROPUESTA",
            "CAMBIAR_NIVEL_PLAN_ENTRENAMIENTO",
            "APROBAR_PLAN_IA",
          ],
        },
      },
      orderBy: { fecha: "desc" },
      take: 20,
    });

    const historialRevisiones = auditLogs.map((log) => {
      let detallesParsed: any = {};
      try {
        detallesParsed = JSON.parse(log.detalles || "{}");
      } catch {}

      return {
        id: log.id,
        fecha: format(log.fecha, "dd/MM/yyyy HH:mm"),
        usuario: log.usuario,
        accion: log.accion,
        motivo: detallesParsed.motivoRevision || detallesParsed.observacion || "Sin detalle",
        decision: detallesParsed.decision || log.accion,
      };
    });

    return {
      success: true,
      data: {
        ...evoRes.data,
        historialRevisiones,
      },
    };
  } catch (err: any) {
    console.error("Error en getDatosRevisionPlan:", err);
    return { success: false, error: err.message || "Error al obtener datos para revisión." };
  }
}

/**
 * Decisión A: MANTENER PLAN ACTIVO
 * Registra la decisión del entrenador de continuar con el plan sin generar una nueva versión.
 */
export async function registrarDecisionMantenerPlan(input: {
  socioId: string;
  perfilId: string;
  observacion?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = DecisionMantenerSchema.parse(input);

    const perfil = await prisma.perfilPlanificacion.findUnique({
      where: { id: parsed.perfilId },
      select: { id: true, socioId: true, version: true },
    });

    if (!perfil || perfil.socioId !== parsed.socioId) {
      return { success: false, error: "El perfil de planificación no coincide con el socio." };
    }

    const log = await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "MANTENER_PLAN",
        detalles: JSON.stringify({
          socioId: parsed.socioId,
          perfilId: parsed.perfilId,
          versionActual: perfil.version,
          decision: "MANTENER_PLAN",
          observacion: parsed.observacion || "Sin observaciones",
        }),
      },
    });

    return { success: true, logId: log.id, mensaje: "Decisión registrada. El plan activo continuará sin modificaciones." };
  } catch (err: any) {
    console.error("Error en registrarDecisionMantenerPlan:", err);
    return { success: false, error: err.message || "Error al registrar la decisión de mantener el plan." };
  }
}

/**
 * Decisión B/C: SOLICITAR NIVELES / ADAPTACIÓN DE PLAN IA
 * Traspasa el contexto de evolución y plan anterior a una nueva propuesta de generación IA.
 */
export async function solicitarAdaptacionPlan(input: {
  socioId: string;
  perfilId: string;
  motivoRevision: z.infer<typeof MotivoRevisionEnum>;
  nuevoObjetivo?: string;
  nuevoNivel?: string;
  observacion?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = SolicitarAdaptacionSchema.parse(input);

    const perfilActual = await prisma.perfilPlanificacion.findUnique({
      where: { id: parsed.perfilId },
      select: {
        id: true,
        socioId: true,
        entrenadorId: true,
        version: true,
        nivel: true,
        objetivoPrincipal: true,
      },
    });

    if (!perfilActual || perfilActual.socioId !== parsed.socioId) {
      return { success: false, error: "El perfil especificado no pertenece al socio." };
    }

    // Si hubo cambio de nivel explícito, registrar en AuditLog
    if (parsed.nuevoNivel && parsed.nuevoNivel !== perfilActual.nivel) {
      await prisma.auditLog.create({
        data: {
          usuario: user.name || user.userId || "Sistema",
          accion: "CAMBIAR_NIVEL_PLAN_ENTRENAMIENTO",
          detalles: JSON.stringify({
            socioId: parsed.socioId,
            nivelAnterior: perfilActual.nivel,
            nivelNuevo: parsed.nuevoNivel,
            motivo: parsed.motivoRevision,
          }),
        },
      });
    }

    // Registrar intención de nueva propuesta IA en AuditLog
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "SOLICITAR_NUEVA_PROPUESTA",
        detalles: JSON.stringify({
          socioId: parsed.socioId,
          perfilId: parsed.perfilId,
          versionAnterior: perfilActual.version,
          motivoRevision: parsed.motivoRevision,
          nuevoObjetivo: parsed.nuevoObjetivo || perfilActual.objetivoPrincipal,
          nuevoNivel: parsed.nuevoNivel || perfilActual.nivel,
          observacion: parsed.observacion || "",
          contexto: "REVISIÓN / ADAPTACIÓN DE PLAN EXISTENTE",
        }),
      },
    });

    // Disparar generación de nueva propuesta IA reutilizando el pipeline existente
    const genRes = await solicitarGeneracionPlanIA(parsed.socioId, { bypassLock: true });

    if (!genRes.success) {
      return { success: false, error: genRes.error || "Error al solicitar la propuesta IA." };
    }

    return {
      success: true,
      generacionId: genRes.generacionId,
      requiresHumanReview: genRes.requiresHumanReview,
      mensaje: "Nueva propuesta IA solicitada. Pase a la pestaña de Revisión para evaluar y aprobar la versión v" + (perfilActual.version + 1),
    };
  } catch (err: any) {
    console.error("Error en solicitarAdaptacionPlan:", err);
    return { success: false, error: err.message || "Error al procesar la solicitud de adaptación." };
  }
}
