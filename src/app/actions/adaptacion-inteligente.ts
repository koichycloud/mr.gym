"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { getEvolucionYSeguimientoSocio } from "@/app/actions/evolucion-plan";
import { getAdherenciaYCumplimientoSocio } from "@/app/actions/adherencia-plan";
import { registrarDecisionMantenerPlan, solicitarAdaptacionPlan } from "@/app/actions/revision-plan";

const SocioIdSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
});

const DecisionAdaptacionSchema = z.object({
  socioId: z.string().uuid("ID de socio inválido"),
  perfilId: z.string().uuid("ID de perfil inválido"),
  decision: z.enum(["REVISAR_PLAN", "CONTINUAR_PLAN"]),
  motivoRevision: z.string().optional(),
  observacion: z.string().max(500, "La observación no debe exceder 500 caracteres").optional(),
});

export type StateRevision =
  | "SIN_REVISION_REQUERIDA"
  | "REVISION_RECOMENDADA"
  | "REVISION_PRIORITARIA"
  | "PLAN_ACTUALIZADO";

/**
 * Motor Determinista de Evaluación de Señales de Adaptación Inteligente.
 * Analiza el plan activo, días sin revisión, mediciones antropométricas y adherencia real.
 */
export async function evaluarNecesidadAdaptacionPlan(socioId: string) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    SocioIdSchema.parse({ socioId });

    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: { id: true, codigo: true, nombres: true, apellidos: true },
    });

    if (!socio) {
      return { success: false, error: "El socio especificado no existe." };
    }

    // 1. Obtener Perfil y Planes Activos
    const [perfilActivo, planEntrenamientoActivo, planAlimentacionActivo] = await Promise.all([
      prisma.perfilPlanificacion.findFirst({
        where: { socioId, activo: true },
        select: { id: true, version: true, nivel: true, objetivoPrincipal: true, objetivoSecundario: true, diasPorSemana: true, fechaInicio: true, updatedAt: true },
      }),
      prisma.planEntrenamiento.findFirst({
        where: { socioId, activo: true },
        select: { id: true, titulo: true, version: true, fechaInicio: true, updatedAt: true },
      }),
      prisma.planAlimentacion.findFirst({
        where: { socioId, activo: true },
        select: { id: true, titulo: true, version: true, fechaInicio: true, updatedAt: true },
      }),
    ]);

    if (!perfilActivo) {
      return {
        success: true,
        data: {
          socio: { id: socio.id, nombre: `${socio.nombres} ${socio.apellidos}`, codigo: socio.codigo },
          estadoRevision: "SIN_REVISION_REQUERIDA" as StateRevision,
          senalesAdaptacion: [],
          explicaciones: ["El socio no cuenta aún con un perfil de planificación activo."],
          perfilActivo: null,
          planEntrenamientoActivo: null,
          planAlimentacionActivo: null,
          evolucion: null,
          adherencia: null,
        },
      };
    }

    // 2. Obtener Evolución Física y Adherencia de los módulos existentes
    const [evoRes, adhRes] = await Promise.all([
      getEvolucionYSeguimientoSocio(socioId),
      getAdherenciaYCumplimientoSocio(socioId, 30),
    ]);

    const evolucionData = evoRes.success ? evoRes.data : null;
    const adherenciaData = adhRes.success ? adhRes.data : null;

    // 3. Cálculo de Señales Deterministas de Adaptación
    const senalesAdaptacion: string[] = [];
    const explicaciones: string[] = [];

    const diasPlanActivo = differenceInDays(new Date(), perfilActivo.fechaInicio || perfilActivo.updatedAt);
    if (diasPlanActivo >= 45) {
      senalesAdaptacion.push("DIAS_ACTIVO_EXCESIVOS");
      explicaciones.push(`El plan actual lleva ${diasPlanActivo} días activo sin una revisión estructural.`);
    }

    if (adherenciaData && adherenciaData.porcentajeAdherencia < 50 && adherenciaData.sesionesRegistradas > 0) {
      senalesAdaptacion.push("ADHERENCIA_INSUFICIENTE");
      explicaciones.push(`La adherencia registrada (${adherenciaData.porcentajeAdherencia}%) es significativamente inferior a la frecuencia programada (${adherenciaData.diasProgramadosPorSemana} días/semana).`);
    }

    if (evolucionData && evolucionData.estadoEvolucion === "EVOLUCION_ESTABLE" && (evolucionData.medidasHistorial?.length || 0) >= 2) {
      senalesAdaptacion.push("EVOLUCION_ESTANCADA");
      explicaciones.push("Las mediciones físicas muestran un estancamiento sostenido en peso y porcentaje de grasa corporal.");
    }

    if (evolucionData && evolucionData.medidasHistorial && evolucionData.medidasHistorial.length > 0) {
      const ultimaMedida = evolucionData.medidasHistorial[0];
      const diasUltimaMedida = differenceInDays(new Date(), new Date(ultimaMedida.fecha));
      if (diasUltimaMedida >= 45) {
        senalesAdaptacion.push("MEDICION_ANTIGUA");
        explicaciones.push(`La última evaluación física fue realizada hace ${diasUltimaMedida} días.`);
      }
    } else {
      senalesAdaptacion.push("SIN_MEDICIONES");
      explicaciones.push("No se registran evaluaciones físicas para este socio.");
    }

    // 4. Clasificación del Estado Operativo Derivado de Revisión
    let estadoRevision: StateRevision = "SIN_REVISION_REQUERIDA";

    if (diasPlanActivo < 14 && senalesAdaptacion.length === 0) {
      estadoRevision = "PLAN_ACTUALIZADO";
      explicaciones.push("Plan recientemente actualizado.");
    } else if (senalesAdaptacion.length >= 2 || senalesAdaptacion.includes("ADHERENCIA_INSUFICIENTE")) {
      estadoRevision = "REVISION_PRIORITARIA";
    } else if (senalesAdaptacion.length >= 1) {
      estadoRevision = "REVISION_RECOMENDADA";
    } else {
      estadoRevision = "SIN_REVISION_REQUERIDA";
    }

    // Registra en AuditLog la recomendación
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "RECOMENDAR_REVISION_PLAN",
        detalles: JSON.stringify({
          socioId,
          estadoRevision,
          senalesCount: senalesAdaptacion.length,
          diasPlanActivo,
        }),
      },
    });

    return {
      success: true,
      data: {
        socio: { id: socio.id, nombre: `${socio.nombres} ${socio.apellidos}`, codigo: socio.codigo },
        estadoRevision,
        diasPlanActivo,
        senalesAdaptacion,
        explicaciones,
        perfilActivo,
        planEntrenamientoActivo,
        planAlimentacionActivo,
        evolucion: evolucionData,
        adherencia: adherenciaData,
      },
    };
  } catch (err: any) {
    console.error("Error en evaluarNecesidadAdaptacionPlan:", err);
    return { success: false, error: err.message || "Error al evaluar necesidad de adaptación." };
  }
}

/**
 * Ejecuta la decisión del entrenador (Revisar Plan -> Propuesta IA / Continuar Plan -> Log auditoría).
 */
export async function ejecutarDecisionAdaptacionEntrenador(input: {
  socioId: string;
  perfilId: string;
  decision: "REVISAR_PLAN" | "CONTINUAR_PLAN";
  motivoRevision?: string;
  observacion?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = DecisionAdaptacionSchema.parse(input);

    if (parsed.decision === "CONTINUAR_PLAN") {
      return await registrarDecisionMantenerPlan({
        socioId: parsed.socioId,
        perfilId: parsed.perfilId,
        observacion: parsed.observacion || "Entrenador decidió continuar con el plan activo actual.",
      });
    }

    // Decision: REVISAR_PLAN -> Disparar Adaptación Estructural asistida por IA
    return await solicitarAdaptacionPlan({
      socioId: parsed.socioId,
      perfilId: parsed.perfilId,
      motivoRevision: (parsed.motivoRevision as any) || "REVISION_PERIODICA",
      observacion: parsed.observacion,
    });
  } catch (err: any) {
    console.error("Error en ejecutarDecisionAdaptacionEntrenador:", err);
    return { success: false, error: err.message || "Error al ejecutar la decisión del entrenador." };
  }
}
