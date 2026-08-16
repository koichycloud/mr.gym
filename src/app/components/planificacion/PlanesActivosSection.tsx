"use client";

import { useState } from "react";
import {
  Dumbbell,
  Apple,
  CheckCircle2,
  History,
  Calendar,
  Eye,
  User,
  Shield,
  Layers,
  Archive,
  AlertCircle,
  Sparkles,
  FileDown,
  Printer,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import LevelChangeModal from "./LevelChangeModal";
import ClosePlanModal from "./ClosePlanModal";
import MedidasFisicasSummaryCard from "./MedidasFisicasSummaryCard";
import HistorialOperativoTimeline from "./HistorialOperativoTimeline";
import {
  exportarPlanEntrenamientoPDF,
  exportarPlanAlimentacionPDF,
  exportarPlanCompletoPDF,
} from "@/app/actions/planes-export";

interface Props {
  socioId: string;
  socioNombre: string;
  planesActivos: {
    planEntrenamiento: any | null;
    planAlimentacion: any | null;
  } | null;
  historialPlanes: {
    planesEntrenamiento: any[];
    planesAlimentacion: any[];
  } | null;
  ultimaMedida?: any | null;
  timelineEvents?: any[];
  onViewPlan: (plan: any, tipo: "entrenamiento" | "alimentacion") => void;
  onRefresh?: () => void;
}

export default function PlanesActivosSection({
  socioId,
  socioNombre,
  planesActivos,
  historialPlanes,
  ultimaMedida,
  timelineEvents = [],
  onViewPlan,
  onRefresh,
}: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Helper para descarga directa de PDF Base64
  const triggerPdfDownload = (base64: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportEntrenamiento = async (planId: string) => {
    try {
      setIsExporting("entrenamiento");
      const res = await exportarPlanEntrenamientoPDF({ planId });
      if (res.success && res.base64Pdf && res.filename) {
        triggerPdfDownload(res.base64Pdf, res.filename);
      } else {
        alert(res.error || "Error al generar el PDF de entrenamiento.");
      }
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportAlimentacion = async (planId: string) => {
    try {
      setIsExporting("alimentacion");
      const res = await exportarPlanAlimentacionPDF({ planId });
      if (res.success && res.base64Pdf && res.filename) {
        triggerPdfDownload(res.base64Pdf, res.filename);
      } else {
        alert(res.error || "Error al generar el PDF de alimentación.");
      }
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportCompleto = async () => {
    try {
      setIsExporting("completo");
      const res = await exportarPlanCompletoPDF({ socioId });
      if (res.success && res.base64Pdf && res.filename) {
        triggerPdfDownload(res.base64Pdf, res.filename);
      } else {
        alert(res.error || "Error al generar el PDF completo.");
      }
    } finally {
      setIsExporting(null);
    }
  };

  // State for modals
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<{
    id: string;
    tipo: "entrenamiento" | "alimentacion";
    titulo: string;
  } | null>(null);

  const activeEntr = planesActivos?.planEntrenamiento;
  const activeAlim = planesActivos?.planAlimentacion;

  const allEntr = historialPlanes?.planesEntrenamiento || [];
  const allAlim = historialPlanes?.planesAlimentacion || [];

  const handleOpenCloseModal = (id: string, tipo: "entrenamiento" | "alimentacion", titulo: string) => {
    setCloseTarget({ id, tipo, titulo });
    setCloseModalOpen(true);
  };

  const handleOperationSuccess = () => {
    if (onRefresh) onRefresh();
  };

  if (!activeEntr && !activeAlim && allEntr.length === 0 && allAlim.length === 0) {
    return (
      <div className="space-y-4">
        <MedidasFisicasSummaryCard socioId={socioId} ultimaMedida={ultimaMedida} />
        <div className="bg-base-100 rounded-2xl border border-base-200 p-6 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-base-200 flex items-center justify-center mx-auto text-base-content/40 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm">Sin planes materializados todavía</h4>
          <p className="text-xs text-base-content/60 max-w-md mx-auto mt-1">
            Genere una propuesta con IA y apruébela para materializar el Plan de Entrenamiento y Plan de Alimentación activos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen antropométrico compacto */}
      <MedidasFisicasSummaryCard socioId={socioId} ultimaMedida={ultimaMedida} />

      {/* Encabezado y controles */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-black flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Planes Activos y Operación Real del Socio
          </h4>
          <p className="text-xs opacity-70">
            Consulta operativa diaria, control de niveles, personalización de recetas e historial.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(activeEntr || activeAlim) && (
            <button
              onClick={handleExportCompleto}
              disabled={isExporting === "completo"}
              className="btn btn-primary btn-xs gap-1.5 shadow-sm text-white rounded-xl"
              title="Exportar Plan Personalizado Completo (PDF)"
            >
              {isExporting === "completo" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              Exportar Plan Completo
            </button>
          )}
          {timelineEvents.length > 0 && (
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="btn btn-ghost btn-xs gap-1.5 text-secondary"
            >
              <History className="w-3.5 h-3.5" />
              {showTimeline ? "Ocultar Timeline" : `Timeline (${timelineEvents.length})`}
            </button>
          )}
          {(allEntr.length > 1 || allAlim.length > 1) && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn btn-ghost btn-xs gap-1.5 text-primary"
            >
              <Layers className="w-3.5 h-3.5" />
              {showHistory ? "Ocultar Versiones" : `Versiones (${allEntr.length + allAlim.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de Planes Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PLAN ENTRENAMIENTO ACTIVO */}
        <div className="bg-base-100 border border-primary/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-primary font-bold badge-xs">
                      v{activeEntr?.version || 1} ACTIVO
                    </span>
                    <span className="badge badge-success badge-outline badge-xs font-semibold">
                      {activeEntr?.estado || "APROBADO"}
                    </span>
                    {activeEntr?.generacionIAId && (
                      <span className="badge badge-secondary badge-ghost badge-xs gap-1 font-mono">
                        <Sparkles className="w-2.5 h-2.5" /> Originado por IA
                      </span>
                    )}
                  </div>
                  <h5 className="font-bold text-sm mt-1">
                    {activeEntr?.titulo || "Plan de Entrenamiento Personalizado"}
                  </h5>
                </div>
              </div>
            </div>

            {activeEntr ? (
              <div className="space-y-2 text-xs">
                <p className="text-base-content/80 line-clamp-2">
                  {activeEntr.descripcion || "Programa progresivo de acondicionamiento e hipertrofia."}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-base-200/50 p-2.5 rounded-xl text-[11px]">
                  <div>
                    <span className="opacity-60 block">Split Sugerido:</span>
                    <strong className="text-base-content">{activeEntr.splitSugerido || "Full Body"}</strong>
                  </div>
                  <div>
                    <span className="opacity-60 block">Frecuencia:</span>
                    <strong className="text-base-content">{activeEntr.frecuenciaSemanal || 3} días/sem</strong>
                  </div>
                  <div>
                    <span className="opacity-60 block">Nivel Actual (1-6):</span>
                    <strong className="text-primary font-bold">Nivel {activeEntr.nivelActual || 1}</strong>
                  </div>
                  <div>
                    <span className="opacity-60 block">Vigencia desde:</span>
                    <strong className="text-base-content">
                      {activeEntr.fechaInicio
                        ? format(new Date(activeEntr.fechaInicio), "dd/MM/yyyy")
                        : "N/A"}
                    </strong>
                  </div>
                </div>

                {activeEntr.entrenador && (
                  <div className="flex items-center gap-1.5 text-[11px] opacity-70">
                    <User className="w-3 h-3" />
                    <span>Entrenador Responsable: {activeEntr.entrenador.nombres} {activeEntr.entrenador.apellidos}</span>
                  </div>
                )}

                {activeEntr.observaciones && (
                  <div className="text-[11px] bg-primary/5 border border-primary/10 p-2 rounded-xl text-primary font-medium">
                    <span className="block font-bold">Observaciones:</span>
                    <span className="line-clamp-2">{activeEntr.observaciones}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-base-content/60 italic py-2">
                No hay un plan de entrenamiento activo asignado.
              </p>
            )}
          </div>

          {activeEntr && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLevelModalOpen(true)}
                  className="btn btn-outline btn-primary btn-xs flex-1 gap-1 text-[11px] rounded-xl"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Cambiar Nivel ({activeEntr.nivelActual})
                </button>
                <button
                  onClick={() => handleExportEntrenamiento(activeEntr.id)}
                  disabled={isExporting === "entrenamiento"}
                  className="btn btn-outline btn-secondary btn-xs gap-1 text-[11px] rounded-xl"
                  title="Exportar PDF de Entrenamiento"
                >
                  {isExporting === "entrenamiento" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Exportar PDF
                </button>
                <button
                  onClick={() => handleOpenCloseModal(activeEntr.id, "entrenamiento", activeEntr.titulo)}
                  className="btn btn-ghost btn-xs text-error gap-1 text-[11px] rounded-xl hover:bg-error/10"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Cerrar
                </button>
              </div>

              <button
                onClick={() => onViewPlan(activeEntr, "entrenamiento")}
                className="btn btn-primary btn-sm w-full gap-1.5 rounded-xl"
              >
                <Eye className="w-4 h-4" />
                Consultar Plan Completo (6 Niveles)
              </button>
            </div>
          )}
        </div>

        {/* PLAN ALIMENTACIÓN ACTIVO */}
        <div className="bg-base-100 border border-success/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-bl-full pointer-events-none" />
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-success/10 text-success rounded-xl">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success font-bold badge-xs text-white">
                      v{activeAlim?.version || 1} ACTIVO
                    </span>
                    <span className="badge badge-success badge-outline badge-xs font-semibold">
                      {activeAlim?.estado || "APROBADO"}
                    </span>
                    {activeAlim?.generacionIAId && (
                      <span className="badge badge-secondary badge-ghost badge-xs gap-1 font-mono">
                        <Sparkles className="w-2.5 h-2.5" /> Originado por IA
                      </span>
                    )}
                  </div>
                  <h5 className="font-bold text-sm mt-1">
                    {activeAlim?.titulo || "Plan de Alimentación Sugerido"}
                  </h5>
                </div>
              </div>
            </div>

            {activeAlim ? (
              <div className="space-y-2 text-xs">
                <p className="text-base-content/80 line-clamp-2">
                  {activeAlim.descripcion || "Guía nutricional y recetario adaptable."}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-base-200/50 p-2.5 rounded-xl text-[11px]">
                  <div>
                    <span className="opacity-60 block">Recetas Disponibles:</span>
                    <strong className="text-success font-bold">{activeAlim.contenido?.recetasSugeridas?.length || 20}+ recetas</strong>
                  </div>
                  <div>
                    <span className="opacity-60 block">Hidratación:</span>
                    <strong className="text-base-content">{activeAlim.recomendacionHidratacion || "2.5L a 3L diarios"}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="opacity-60 block">Vigencia desde:</span>
                    <strong className="text-base-content">
                      {activeAlim.fechaInicio
                        ? format(new Date(activeAlim.fechaInicio), "dd/MM/yyyy")
                        : "N/A"}
                    </strong>
                  </div>
                </div>

                {/* Banner Legal Nutricional */}
                <div className="flex items-center gap-1.5 text-[10px] text-base-content/60 bg-base-200/40 p-2 rounded-xl border border-base-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-success" />
                  <span>Plan alimentario personalizado sugerido. Carácter exclusivamente orientativo.</span>
                </div>

                {activeAlim.entrenador && (
                  <div className="flex items-center gap-1.5 text-[11px] opacity-70">
                    <User className="w-3 h-3" />
                    <span>Entrenador Responsable: {activeAlim.entrenador.nombres} {activeAlim.entrenador.apellidos}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-base-content/60 italic py-2">
                No hay un plan alimentario activo asignado.
              </p>
            )}
          </div>

          {activeAlim && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handleExportAlimentacion(activeAlim.id)}
                  disabled={isExporting === "alimentacion"}
                  className="btn btn-outline btn-success btn-xs gap-1 text-[11px] rounded-xl"
                  title="Exportar PDF de Alimentación"
                >
                  {isExporting === "alimentacion" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Exportar PDF Nutricional
                </button>

                <button
                  onClick={() => handleOpenCloseModal(activeAlim.id, "alimentacion", activeAlim.titulo)}
                  className="btn btn-ghost btn-xs text-error gap-1 text-[11px] rounded-xl hover:bg-error/10"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Cerrar Plan
                </button>
              </div>

              <button
                onClick={() => onViewPlan(activeAlim, "alimentacion")}
                className="btn btn-success btn-sm w-full gap-1.5 text-white rounded-xl"
              >
                <Eye className="w-4 h-4" />
                Consultar Plan Alimentario (20+ Recetas)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Operativo */}
      {showTimeline && <HistorialOperativoTimeline events={timelineEvents} />}

      {/* Historial de Versiones Anteriores */}
      {showHistory && (
        <div className="bg-base-200/40 border border-base-200 rounded-2xl p-4 space-y-3">
          <h5 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
            <History className="w-4 h-4" />
            Historial de Versiones Anteriores (Archivados de Solo Lectura)
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Historial Entrenamiento */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-primary block">Entrenamiento:</span>
              {allEntr.length === 0 ? (
                <p className="text-xs opacity-60">Sin registros históricos.</p>
              ) : (
                allEntr.map((p: any) => (
                  <div
                    key={p.id}
                    className="bg-base-100 border border-base-200 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-primary">v{p.version}</strong>
                        <span className={`badge badge-xs ${p.activo ? "badge-success text-white" : "badge-neutral"}`}>
                          {p.activo ? "ACTIVO" : "ARCHIVADO"}
                        </span>
                        <span className="text-[10px] font-mono opacity-60">Nivel {p.nivelActual || 1}</span>
                      </div>
                      <span className="text-[11px] opacity-70 block mt-0.5">
                        {p.fechaInicio ? format(new Date(p.fechaInicio), "dd/MM/yyyy") : ""}
                        {p.fechaFin ? ` → ${format(new Date(p.fechaFin), "dd/MM/yyyy")}` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => onViewPlan(p, "entrenamiento")}
                      className="btn btn-ghost btn-xs text-primary"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Historial Alimentación */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-success block">Alimentación:</span>
              {allAlim.length === 0 ? (
                <p className="text-xs opacity-60">Sin registros históricos.</p>
              ) : (
                allAlim.map((p: any) => (
                  <div
                    key={p.id}
                    className="bg-base-100 border border-base-200 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-success">v{p.version}</strong>
                        <span className={`badge badge-xs ${p.activo ? "badge-success text-white" : "badge-neutral"}`}>
                          {p.activo ? "ACTIVO" : "ARCHIVADO"}
                        </span>
                      </div>
                      <span className="text-[11px] opacity-70 block mt-0.5">
                        {p.fechaInicio ? format(new Date(p.fechaInicio), "dd/MM/yyyy") : ""}
                        {p.fechaFin ? ` → ${format(new Date(p.fechaFin), "dd/MM/yyyy")}` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => onViewPlan(p, "alimentacion")}
                      className="btn btn-ghost btn-xs text-success"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambio de Nivel */}
      {activeEntr && (
        <LevelChangeModal
          planId={activeEntr.id}
          nivelActual={activeEntr.nivelActual || 1}
          socioNombre={socioNombre}
          isOpen={levelModalOpen}
          onClose={() => setLevelModalOpen(false)}
          onSuccess={handleOperationSuccess}
        />
      )}

      {/* Modal Cierre de Plan */}
      {closeTarget && (
        <ClosePlanModal
          planId={closeTarget.id}
          tipo={closeTarget.tipo}
          tituloPlan={closeTarget.titulo}
          socioNombre={socioNombre}
          isOpen={closeModalOpen}
          onClose={() => {
            setCloseModalOpen(false);
            setCloseTarget(null);
          }}
          onSuccess={handleOperationSuccess}
        />
      )}
    </div>
  );
}
