"use client";

import { useState } from "react";
import {
  FileCheck,
  RotateCcw,
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  Calendar,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  registrarDecisionMantenerPlan,
  solicitarAdaptacionPlan,
} from "@/app/actions/revision-plan";

interface Props {
  socioId: string;
  perfilId: string;
  perfilVersion: number;
  datosEvolucion: any;
  onClose: () => void;
  onSuccess: () => void;
}

const MOTIVOS_REVISION = [
  { value: "ESTANCAMIENTO", label: "Estancamiento en el progreso físico" },
  { value: "CAMBIO_OBJETIVO", label: "Cambio de objetivo principal" },
  { value: "EVOLUCION_INSUFICIENTE", label: "Evolución insuficiente respecto al tiempo" },
  { value: "NUEVA_MEDICION_FISICA", label: "Nueva evaluación física disponible" },
  { value: "CAMBIO_NIVEL", label: "Modificación de nivel de experiencia" },
  { value: "CAMBIO_DISPONIBILIDAD", label: "Cambio de disponibilidad semanal" },
  { value: "CAMBIO_PREFERENCIAS_ALIMENTARIAS", label: "Cambio de preferencias alimenticias" },
  { value: "AJUSTE_RUTINA", label: "Ajuste específico de la rutina actual" },
  { value: "REVISION_PERIODICA", label: "Revisión técnica periódica" },
  { value: "OTRO", label: "Otro motivo operativo" },
];

export default function RevisionPlanModal({
  socioId,
  perfilId,
  perfilVersion,
  datosEvolucion,
  onClose,
  onSuccess,
}: Props) {
  const [decision, setDecision] = useState<"MANTENER" | "ADAPTAR">("MANTENER");
  const [motivo, setMotivo] = useState<string>("REVISION_PERIODICA");
  const [observacion, setObservacion] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (decision === "MANTENER") {
        const res = await registrarDecisionMantenerPlan({
          socioId,
          perfilId,
          observacion,
        });

        if (res.success) {
          toast.success(res.mensaje || "Decisión registrada.");
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Error al registrar la decisión.");
        }
      } else {
        const res = await solicitarAdaptacionPlan({
          socioId,
          perfilId,
          motivoRevision: motivo as any,
          nuevoNivel: nuevoNivel || undefined,
          observacion,
        });

        if (res.success) {
          toast.success(res.mensaje || "Nueva propuesta IA solicitada.");
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Error al solicitar la adaptación.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la revisión.");
    } finally {
      setLoading(false);
    }
  };

  const perfil = datosEvolucion?.perfilPlanificacion || {};
  const comparativa = datosEvolucion?.comparativaActual;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl border border-base-300 shadow-2xl rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 pb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-extrabold text-lg text-base-content">
                Revisión Técnica y Adaptación del Plan (v{perfilVersion})
              </h3>
              <p className="text-xs text-base-content/70">
                Socio: <strong className="text-base-content">{datosEvolucion?.socio?.nombre}</strong> ({datosEvolucion?.socio?.codigo})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen Operativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4 bg-base-200/50 p-4 rounded-xl text-xs">
          <div>
            <span className="font-bold block opacity-70">Objetivo Vigente:</span>
            <p className="font-bold text-sm text-primary">{perfil.objetivoPrincipal || "Sin definir"}</p>
            <p className="text-[11px] opacity-80 mt-0.5">Nivel: {perfil.nivel || "N/A"} • Frecuencia: {perfil.diasPorSemana || 3} días/semana</p>
          </div>

          <div>
            <span className="font-bold block opacity-70">Evolución Antropométrica Reciente:</span>
            {comparativa ? (
              <p className="font-semibold mt-0.5">
                Peso: {comparativa.peso.actual} kg ({comparativa.peso.delta > 0 ? `+${comparativa.peso.delta}` : comparativa.peso.delta} kg) | % Grasa: {comparativa.porcentajeGrasa.actual || "-"}% ({comparativa.porcentajeGrasa.delta > 0 ? `+${comparativa.porcentajeGrasa.delta}` : comparativa.porcentajeGrasa.delta}%)
              </p>
            ) : (
              <p className="opacity-60 italic">Sin datos comparativos suficientes</p>
            )}
            <p className="text-[11px] font-bold text-info mt-0.5">Estado: {datosEvolucion?.estadoEvolucion}</p>
          </div>
        </div>

        {/* Selección de Decisión */}
        <div className="space-y-4 my-4">
          <label className="label text-xs font-bold uppercase text-base-content/80">
            Decisión Técnica del Entrenador:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("MANTENER")}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                decision === "MANTENER"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-base-300 bg-base-100 hover:bg-base-200/50"
              }`}
            >
              <RotateCcw className={`w-5 h-5 mt-0.5 ${decision === "MANTENER" ? "text-primary" : "opacity-60"}`} />
              <div>
                <h4 className="font-bold text-sm">Mantener Plan Activo</h4>
                <p className="text-xs opacity-70 mt-0.5">
                  El plan actual continuará vigente sin modificaciones. No genera nueva versión.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDecision("ADAPTAR")}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                decision === "ADAPTAR"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-base-300 bg-base-100 hover:bg-base-200/50"
              }`}
            >
              <Sparkles className={`w-5 h-5 mt-0.5 ${decision === "ADAPTAR" ? "text-primary" : "opacity-60"}`} />
              <div>
                <h4 className="font-bold text-sm">Solicitar Adaptación IA</h4>
                <p className="text-xs opacity-70 mt-0.5">
                  Prepara una nueva propuesta basada en la evolución actual. Requiere revisión humana.
                </p>
              </div>
            </button>
          </div>

          {/* Formulario de Adaptación */}
          {decision === "ADAPTAR" && (
            <div className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-3">
              <div className="form-control">
                <label className="label text-xs font-bold">Motivo de Revisión:</label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="select select-sm select-bordered text-xs"
                >
                  {MOTIVOS_REVISION.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold">Modificar Nivel (Opcional):</label>
                <select
                  value={nuevoNivel}
                  onChange={(e) => setNuevoNivel(e.target.value)}
                  className="select select-sm select-bordered text-xs"
                >
                  <option value="">Mantener nivel actual ({perfil.nivel || "N/A"})</option>
                  <option value="PRINCIPIANTE">Principiante</option>
                  <option value="INTERMEDIO">Intermedio</option>
                  <option value="AVANZADO">Avanzado</option>
                </select>
              </div>
            </div>
          )}

          {/* Observaciones Generales */}
          <div className="form-control">
            <label className="label text-xs font-bold">
              {decision === "MANTENER" ? "Observación Técnica (Opcional):" : "Comentarios para la Adaptación:"}
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="textarea textarea-bordered text-xs"
              placeholder="Detalles u observaciones técnicas para el historial contable..."
              maxLength={500}
              rows={3}
            />
            <span className="text-[10px] text-right opacity-60 mt-1">{observacion.length} / 500 caracteres</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="modal-action border-t border-base-200 pt-4">
          <button onClick={onClose} disabled={loading} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading} className="btn btn-primary btn-sm gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : decision === "MANTENER" ? "Confirmar Mantener Plan" : "Solicitar Adaptación IA"}
          </button>
        </div>
      </div>
    </div>
  );
}
