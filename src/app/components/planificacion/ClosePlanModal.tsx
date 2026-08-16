"use client";

import { useState } from "react";
import { Archive, AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import { cerrarPlanPersonalizado } from "@/app/actions/planes-operaciones";

interface Props {
  planId: string;
  tipo: "entrenamiento" | "alimentacion";
  tituloPlan: string;
  socioNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClosePlanModal({
  planId,
  tipo,
  tituloPlan,
  socioNombre,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [motivoCierre, setMotivoCierre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await cerrarPlanPersonalizado({
        planId,
        tipo,
        motivoCierre: motivoCierre.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "No se pudo cerrar el plan personalizado.");
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar el cierre del plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open z-50 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="modal-box max-w-lg bg-base-100 p-6 rounded-2xl shadow-2xl border border-base-200">
        <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-error/10 text-error rounded-xl">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Cerrar / Archivar Plan Activo</h3>
              <p className="text-xs opacity-60">{socioNombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="alert alert-error text-xs mb-4 rounded-xl py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-base-200/50 p-3 rounded-xl text-xs space-y-1">
            <span className="opacity-60 block">Plan a finalizar:</span>
            <strong className="text-base-content block text-sm font-bold">{tituloPlan}</strong>
            <span className="badge badge-error badge-outline badge-xs mt-1">
              {tipo === "entrenamiento" ? "Plan de Entrenamiento" : "Plan de Alimentación"}
            </span>
          </div>

          <div>
            <label className="label text-xs font-bold">Motivo de Cierre (Opcional):</label>
            <textarea
              className="textarea textarea-bordered w-full text-xs rounded-xl focus:textarea-error"
              rows={3}
              placeholder="Ej. Cumplimiento del periodo de 3 meses. Socio pasa a nuevo objetivo de hipertrofia."
              value={motivoCierre}
              onChange={(e) => setMotivoCierre(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="bg-error/10 border border-error/20 p-3 rounded-xl text-[11px] text-error-content flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-error mt-0.5" />
            <div>
              <strong className="block">Confirmación de Archivado Lógico:</strong>
              El plan pasará a estado <strong>ARCHIVADO</strong> y dejará de estar activo. Toda la información histórica y versiones anteriores se mantendrán preservadas intactas en la base de datos (Política NO-DELETE).
            </div>
          </div>

          <div className="modal-action border-t border-base-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-ghost btn-sm text-xs rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-error btn-sm text-xs rounded-xl gap-1.5 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cerrando...
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  Confirmar Cierre del Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
