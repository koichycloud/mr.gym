"use client";

import { useState } from "react";
import { XCircle, X, Loader2, AlertCircle } from "lucide-react";

interface Props {
  generacion: any;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
  loading?: boolean;
}

export default function RejectModal({
  generacion,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!generacion) return null;

  const handleReject = async () => {
    if (!motivo.trim()) {
      setError("El motivo del rechazo es obligatorio para mantener la trazabilidad.");
      return;
    }
    if (motivo.length > 500) {
      setError("El motivo no puede exceder los 500 caracteres.");
      return;
    }
    setError(null);
    await onConfirm(motivo.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-base-200 bg-error/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-error text-white rounded-xl shadow-sm">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-error">
                Rechazar Propuesta IA
              </h3>
              <p className="text-xs opacity-70">
                Propuesta #{generacion.numeroGeneracion}
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
          <p className="text-xs text-base-content/80">
            Al rechazar la propuesta, no se materializará ningún plan y la generación quedará registrada como <strong>RECHAZADO</strong> para control histórico.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-base-content/80 flex items-center justify-between">
              <span>Motivo del rechazo (Obligatorio):</span>
              <span className="text-[10px] opacity-60">{motivo.length}/500</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Explique la razón (ej. volumen excesivo para la rodilla del socio, preferencias alimenticias no contempladas, etc.)..."
              rows={4}
              className={`textarea textarea-bordered w-full text-xs ${error ? "textarea-error" : ""}`}
              maxLength={500}
            />
            {error && (
              <p className="text-xs text-error flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
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
            onClick={handleReject}
            disabled={loading || !motivo.trim()}
            className="btn btn-error btn-sm text-white font-bold gap-1.5 shadow-md shadow-error/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Confirmar Rechazo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
