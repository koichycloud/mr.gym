"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  evaluarNecesidadAdaptacionPlan,
  ejecutarDecisionAdaptacionEntrenador,
  StateRevision,
} from "@/app/actions/adaptacion-inteligente";
import RevisionPlanModal from "./RevisionPlanModal";

interface Props {
  socioId: string;
}

export default function AdaptacionInteligenteSection({ socioId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [processingDecision, setProcessingDecision] = useState(false);

  const loadEvaluation = async () => {
    setLoading(true);
    try {
      const res = await evaluarNecesidadAdaptacionPlan(socioId);
      if (res.success && res.data) {
        setData(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error("Error al evaluar necesidad de adaptación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluation();
  }, [socioId]);

  const handleKeepPlan = async () => {
    if (!data?.perfilActivo?.id) return;
    setProcessingDecision(true);
    try {
      const res = await ejecutarDecisionAdaptacionEntrenador({
        socioId,
        perfilId: data.perfilActivo.id,
        decision: "CONTINUAR_PLAN",
        observacion: "Entrenador confirmó mantener el plan activo tras revisión operativa.",
      });

      if (res.success) {
        toast.success(res.mensaje || "Decisión registrada. Plan activo continuado.");
        loadEvaluation();
      } else {
        toast.error(res.error || "Error al registrar la decisión.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la decisión.");
    } finally {
      setProcessingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
        <span className="text-xs opacity-70">Analizando señales de adaptación inteligente...</span>
      </div>
    );
  }

  if (!data) return null;

  const { estadoRevision, senalesAdaptacion = [], explicaciones = [], perfilActivo, diasPlanActivo } = data;

  const getStatusBadge = (status: StateRevision) => {
    switch (status) {
      case "REVISION_PRIORITARIA":
        return <span className="badge badge-error text-white font-bold gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Revisión Prioritaria</span>;
      case "REVISION_RECOMENDADA":
        return <span className="badge badge-warning font-bold gap-1"><RefreshCw className="w-3.5 h-3.5" /> Revisión Recomendada</span>;
      case "PLAN_ACTUALIZADO":
        return <span className="badge badge-info text-white font-bold gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Plan Actualizado</span>;
      default:
        return <span className="badge badge-success text-white font-bold gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Plan Vigente y Óptimo</span>;
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <h3 className="font-extrabold text-lg text-base-content flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Revisión y Adaptación Inteligente del Plan
          </h3>
          <p className="text-xs text-base-content/70 mt-0.5">
            Detección asistida por señales operativas de evolución, adherencia y antigüedad del plan.
          </p>
        </div>

        <div>{getStatusBadge(estadoRevision)}</div>
      </div>

      {/* Explicaciones Operativas de Adaptación */}
      {explicaciones.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          estadoRevision === "REVISION_PRIORITARIA"
            ? "bg-error/10 border-error/30 text-error-content"
            : estadoRevision === "REVISION_RECOMENDADA"
            ? "bg-warning/10 border-warning/30 text-warning-content"
            : "bg-base-200/50 border-base-300"
        } space-y-2`}>
          <h4 className="font-bold text-xs flex items-center gap-1.5 uppercase">
            <ShieldAlert className="w-4 h-4" />
            Diagnóstico Operativo de Necesidad de Adaptación:
          </h4>
          <ul className="list-disc list-inside text-xs space-y-1 opacity-90">
            {explicaciones.map((exp: string, idx: number) => (
              <li key={idx}>{exp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botones de Acción del Entrenador */}
      {perfilActivo && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            onClick={handleKeepPlan}
            disabled={processingDecision}
            className="btn btn-outline btn-sm gap-2"
          >
            {processingDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar Plan Actual"}
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-sm text-white gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Revisar y Adaptar Plan (IA)
          </button>
        </div>
      )}

      {showModal && perfilActivo && (
        <RevisionPlanModal
          socioId={socioId}
          perfilId={perfilActivo.id}
          perfilVersion={perfilActivo.version || 1}
          datosEvolucion={data.evolucion || {}}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadEvaluation();
          }}
        />
      )}
    </div>
  );
}
