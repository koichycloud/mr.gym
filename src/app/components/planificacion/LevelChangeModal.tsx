"use client";

import { useState } from "react";
import { Layers, AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import { cambiarNivelPlanEntrenamiento } from "@/app/actions/planes-operaciones";

interface Props {
  planId: string;
  nivelActual: number;
  socioNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LevelChangeModal({
  planId,
  nivelActual,
  socioNombre,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [targetNivel, setTargetNivel] = useState<number>(nivelActual);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetNivel === nivelActual) {
      setError(`El plan ya se encuentra en el Nivel ${nivelActual}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await cambiarNivelPlanEntrenamiento({
        planId,
        nuevoNivel: targetNivel,
        motivo: motivo.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "No se pudo cambiar el nivel del plan.");
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar el cambio de nivel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open z-50 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="modal-box max-w-lg bg-base-100 p-6 rounded-2xl shadow-2xl border border-base-200">
        <div className="flex items-center justify-between border-b border-base-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Cambiar Nivel Actual del Plan</h3>
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
          <div className="bg-base-200/50 p-3 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="opacity-60 block">Nivel Actual Vigente:</span>
              <span className="font-bold text-primary text-sm">Nivel {nivelActual}</span>
            </div>
            <div className="text-right">
              <span className="opacity-60 block">Nivel Objetivo:</span>
              <span className="font-bold text-secondary text-sm">Nivel {targetNivel}</span>
            </div>
          </div>

          <div>
            <label className="label text-xs font-bold">Seleccionar Nuevo Nivel (1 al 6):</label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTargetNivel(n)}
                  className={`btn btn-sm text-xs ${
                    targetNivel === n
                      ? "btn-primary font-black shadow-md"
                      : n === nivelActual
                      ? "btn-outline btn-primary opacity-60"
                      : "btn-ghost bg-base-200"
                  }`}
                >
                  N{n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label text-xs font-bold">Motivo del Cambio (Opcional):</label>
            <textarea
              className="textarea textarea-bordered w-full text-xs rounded-xl focus:textarea-primary"
              rows={2}
              placeholder="Ej. Evaluación semanal superada. Se incrementa la intensidad al Nivel 3."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="bg-warning/10 border border-warning/20 p-3 rounded-xl text-[11px] text-warning-content flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-warning mt-0.5" />
            <div>
              <strong className="block">Confirmación Requerida:</strong>
              ¿Confirmas cambiar el nivel actual del plan de <strong>Nivel {nivelActual}</strong> a <strong>Nivel {targetNivel}</strong>? Los 6 niveles del plan histórico se conservarán intactos.
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
              disabled={loading || targetNivel === nivelActual}
              className="btn btn-primary btn-sm text-xs rounded-xl gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmar Cambio de Nivel
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
