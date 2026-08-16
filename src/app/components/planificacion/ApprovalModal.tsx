"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
  Loader2,
  Dumbbell,
  Apple,
} from "lucide-react";

interface Props {
  generacion: any;
  onClose: () => void;
  onConfirm: (data: { confirmacionRevisionHumana: boolean; observacionesEntrenador: string }) => Promise<void>;
  loading?: boolean;
}

export default function ApprovalModal({
  generacion,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  if (!generacion) return null;

  const output = generacion.rawOutput || {};
  const requiresReview = generacion.requiresHumanReview ?? output.evaluacionSeguridad?.requiresHumanReview;
  const banderas = generacion.banderasAdvertencia || output.evaluacionSeguridad?.banderasAdvertencia || [];

  const handleApprove = async () => {
    if (requiresReview && !confirmedReview) return;
    await onConfirm({
      confirmacionRevisionHumana: confirmedReview,
      observacionesEntrenador: observaciones.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-base-200 bg-success/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success text-white rounded-xl shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-success">
                Aprobar y Materializar Plan
              </h3>
              <p className="text-xs opacity-70">
                Propuesta IA #{generacion.numeroGeneracion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost btn-circle btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="bg-base-200/50 p-3.5 rounded-xl space-y-2 border border-base-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
              Consecuencias de la aprobación:
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-base-content/80 text-xs">
              <li>Se materializará un <strong>Plan de Entrenamiento</strong> (6 niveles progresivos).</li>
              <li>Se materializará un <strong>Plan de Alimentación</strong> (recetario sugerido).</li>
              <li>Los planes activos anteriores del socio pasarán a estado <strong>ARCHIVADO</strong>.</li>
              <li>La generación IA quedará registrada permanentemente como <strong>APROBADO</strong>.</li>
            </ul>
          </div>

          {/* Advertencia obligatoria si requiresHumanReview */}
          {requiresReview && (
            <div className="bg-error/10 border border-error/30 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Advertencias de Seguridad Detectadas</span>
              </div>
              <p className="text-xs text-base-content/80">
                Esta propuesta contiene banderas de advertencia que deben ser confirmadas manualmente por el entrenador:
              </p>
              {banderas.length > 0 && (
                <ul className="text-xs list-disc list-inside text-error font-medium space-y-1">
                  {banderas.map((flag: string, idx: number) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              )}

              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedReview}
                  onChange={(e) => setConfirmedReview(e.target.checked)}
                  className="checkbox checkbox-error checkbox-sm mt-0.5"
                />
                <span className="text-xs font-bold text-error">
                  He revisado las advertencias y confirmo la revisión humana.
                </span>
              </label>
            </div>
          )}

          {/* Observaciones opcionales del entrenador */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-base-content/80 block">
              Observaciones del Entrenador (Opcional):
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Instrucciones adicionales, ajustes biomecánicos acordados o metas de inicio..."
              rows={3}
              className="textarea textarea-bordered w-full text-xs"
              maxLength={1000}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-200 bg-base-200/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost btn-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || (requiresReview && !confirmedReview)}
            className="btn btn-success btn-sm text-white font-bold gap-1.5 shadow-md shadow-success/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Materializando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar y Materializar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
