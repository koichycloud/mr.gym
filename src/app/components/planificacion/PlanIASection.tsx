"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sparkles,
  Dumbbell,
  AlertTriangle,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  Archive,
  Eye,
  Loader2,
  ShieldAlert,
  User,
  Plus,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import {
  solicitarGeneracionPlanIA,
  obtenerGeneracionesSocio,
  obtenerGeneracionPorId,
  aprobarGeneracionIA,
  rechazarGeneracionIA,
  archivarGeneracionIA,
  obtenerPlanesActivosSocio,
  obtenerHistorialPlanesSocio,
} from "@/app/actions/planes-ia";
import { obtenerHistorialOperativoPlan } from "@/app/actions/planes-operaciones";

import ProposalViewerModal from "./ProposalViewerModal";
import ApprovalModal from "./ApprovalModal";
import RejectModal from "./RejectModal";
import PlanesActivosSection from "./PlanesActivosSection";

interface Props {
  socio: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
  };
  perfilActivo: any | null;
  canManage?: boolean;
}

export default function PlanIASection({
  socio,
  perfilActivo,
  canManage = true,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Estados de datos
  const [generaciones, setGeneraciones] = useState<any[]>([]);
  const [planesActivos, setPlanesActivos] = useState<any>(null);
  const [historialPlanes, setHistorialPlanes] = useState<any>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Estados de modales
  const [selectedGeneracion, setSelectedGeneracion] = useState<any | null>(null);
  const [generacionToApprove, setGeneracionToApprove] = useState<any | null>(null);
  const [generacionToReject, setGeneracionToReject] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar datos de planes y generaciones
  const loadData = async () => {
    try {
      const [genRes, actRes, histRes, operRes] = await Promise.all([
        obtenerGeneracionesSocio(socio.id),
        obtenerPlanesActivosSocio(socio.id),
        obtenerHistorialPlanesSocio(socio.id),
        obtenerHistorialOperativoPlan(socio.id),
      ]);

      if (genRes.success && genRes.data) {
        setGeneraciones(genRes.data);
      }
      if (actRes.success && actRes.data) {
        setPlanesActivos(actRes.data);
      }
      if (histRes.success && histRes.data) {
        setHistorialPlanes(histRes.data);
      }
      if (operRes.success && operRes.data) {
        setTimelineEvents(operRes.data.timelineEvents || []);
      }
    } catch (err: any) {
      console.error("Error al cargar datos de IA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [socio.id]);

  // Generar propuesta IA
  const handleGenerate = async () => {
    if (!perfilActivo) {
      toast.error("Debe existir un Perfil de Planificación activo para generar propuestas.");
      return;
    }

    setGenerating(true);
    try {
      const res = await solicitarGeneracionPlanIA(socio.id);
      if (res.success && res.generacionId) {
        toast.success("¡Propuesta IA generada exitosamente!");
        await loadData();

        // Cargar y abrir inmediatamente la propuesta generada
        const detailRes = await obtenerGeneracionPorId(res.generacionId);
        if (detailRes.success && detailRes.data) {
          setSelectedGeneracion(detailRes.data);
        }
      } else {
        toast.error(res.error || "Ocurrió un error al generar la propuesta IA.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al solicitar la generación IA.");
    } finally {
      setGenerating(false);
    }
  };

  // Abrir modal de aprobación
  const handleOpenApprove = (gen: any) => {
    setGeneracionToApprove(gen);
  };

  // Confirmar aprobación
  const handleConfirmApprove = async (data: {
    confirmacionRevisionHumana: boolean;
    observacionesEntrenador: string;
  }) => {
    if (!generacionToApprove) return;
    setActionLoading(true);
    try {
      const res = await aprobarGeneracionIA({
        generacionId: generacionToApprove.id,
        confirmacionRevisionHumana: data.confirmacionRevisionHumana,
        observacionesEntrenador: data.observacionesEntrenador,
      });

      if (res.success) {
        toast.success("¡Plan aprobado y materializado con éxito!");
        setGeneracionToApprove(null);
        setSelectedGeneracion(null);
        await loadData();
      } else {
        toast.error(res.error || "Error al aprobar la propuesta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Fallo inesperado en la aprobación.");
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir modal de rechazo
  const handleOpenReject = (gen: any) => {
    setGeneracionToReject(gen);
  };

  // Confirmar rechazo
  const handleConfirmReject = async (motivo: string) => {
    if (!generacionToReject) return;
    setActionLoading(true);
    try {
      const res = await rechazarGeneracionIA({
        generacionId: generacionToReject.id,
        motivoRechazo: motivo,
      });

      if (res.success) {
        toast.success("Propuesta rechazada.");
        setGeneracionToReject(null);
        setSelectedGeneracion(null);
        await loadData();
      } else {
        toast.error(res.error || "Error al rechazar la propuesta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Fallo inesperado al rechazar.");
    } finally {
      setActionLoading(false);
    }
  };

  // Archivar generación
  const handleArchive = async (generacionId: string) => {
    try {
      const res = await archivarGeneracionIA({ generacionId });
      if (res.success) {
        toast.success("Generación archivada.");
        if (selectedGeneracion?.id === generacionId) {
          setSelectedGeneracion(null);
        }
        await loadData();
      } else {
        toast.error(res.error || "Error al archivar generación.");
      }
    } catch (err: any) {
      toast.error(err.message || "Fallo al archivar.");
    }
  };

  // Abrir visor de plan materializado desde PlanesActivosSection
  const handleViewMaterializedPlan = (plan: any, tipo: "entrenamiento" | "alimentacion") => {
    // Reconstruir un objeto de vista compatible con ProposalViewerModal
    const syntheticGen = {
      id: plan.generacionIAId || plan.id,
      numeroGeneracion: plan.version,
      estado: plan.estado || "APROBADO",
      modeloUtilizado: "Plan Materializado",
      requiresHumanReview: false,
      createdAt: plan.fechaInicio || plan.createdAt,
      rawOutput: {
        metadataGeneracion: {
          resumenEstrategia: plan.descripcion || "Plan personalizado materializado.",
          nivelInicialRecomendado: plan.nivelActual || 1,
          justificacionNivelInicial: "Aprobado por el entrenador.",
          versionSchema: "2.0",
        },
        planEntrenamiento:
          tipo === "entrenamiento"
            ? plan.contenido
            : {
                titulo: plan.titulo,
                descripcionGeneral: plan.descripcion,
                splitSugerido: plan.splitSugerido,
                frecuenciaSemanal: plan.frecuenciaSemanal,
                niveles: [],
              },
        planAlimentacion:
          tipo === "alimentacion"
            ? plan.contenido
            : {
                titulo: plan.titulo,
                descripcionGeneral: plan.descripcion,
                lineamientosGenerales: plan.lineamientosGenerales || [],
                recomendacionHidratacion: plan.recomendacionHidratacion,
                recetas: plan.contenido?.recetas || [],
              },
      },
    };
    setSelectedGeneracion(syntheticGen);
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "APROBADO":
        return <span className="badge badge-success badge-xs gap-1 text-white"><CheckCircle2 className="w-3 h-3" /> Aprobado</span>;
      case "RECHAZADO":
        return <span className="badge badge-error badge-xs gap-1 text-white"><XCircle className="w-3 h-3" /> Rechazado</span>;
      case "ARCHIVADO":
        return <span className="badge badge-neutral badge-xs gap-1"><Archive className="w-3 h-3" /> Archivado</span>;
      case "ERROR":
        return <span className="badge badge-error badge-xs gap-1"><AlertTriangle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="badge badge-warning badge-xs gap-1"><Clock className="w-3 h-3" /> Generado</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CABECERA Y BOTÓN GENERADOR */}
      <div className="bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 border border-primary/20 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary text-primary-content rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              Motor de Planificación IA
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-base-content/80">
            Genera propuestas de entrenamiento progresivo (6 niveles) y nutrición adaptable (20+ recetas) basadas en el perfil físico y biométrico del socio.
          </p>
          {perfilActivo ? (
            <div className="flex items-center gap-3 pt-1 text-xs text-base-content/70 flex-wrap">
              <span>
                🎯 Objetivo: <strong>{perfilActivo.objetivoPrincipal}</strong>
              </span>
              <span>•</span>
              <span>
                ⚡ Nivel: <strong>{perfilActivo.nivel}</strong>
              </span>
              <span>•</span>
              <span>
                📅 {perfilActivo.diasPorSemana} días/sem ({perfilActivo.duracionMinutos} min)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-warning font-semibold pt-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Se requiere configurar un Perfil de Planificación activo previo a la generación.</span>
            </div>
          )}
        </div>

        {canManage && (
          <button
            onClick={handleGenerate}
            disabled={generating || !perfilActivo}
            className="btn btn-primary btn-md gap-2 font-black shadow-lg shadow-primary/25 shrink-0 w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando propuesta...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generar Propuesta IA
              </>
            )}
          </button>
        )}
      </div>

      {/* 2. PLANES ACTIVOS MATERIALIZADOS & OPERACIÓN REAL */}
      <PlanesActivosSection
        socioId={socio.id}
        socioNombre={`${socio.nombres || ""} ${socio.apellidos || ""}`}
        planesActivos={planesActivos}
        historialPlanes={historialPlanes}
        timelineEvents={timelineEvents}
        onViewPlan={handleViewMaterializedPlan}
        onRefresh={loadData}
      />

      {/* 3. HISTORIAL DE GENERACIONES IA */}
      <div className="bg-base-100 border border-base-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-black flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historial de Propuestas IA
            </h4>
            <p className="text-xs opacity-70">
              Registro inmutable de todas las propuestas generadas por el motor para este socio.
            </p>
          </div>
          <button
            onClick={loadData}
            className="btn btn-ghost btn-circle btn-xs"
            title="Refrescar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-base-content/60 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Cargando historial de propuestas...</span>
          </div>
        ) : generaciones.length === 0 ? (
          <div className="py-8 text-center text-xs text-base-content/60 bg-base-200/30 rounded-2xl border border-dashed border-base-200">
            No se han generado propuestas IA todavía para este socio.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full text-xs">
              <thead>
                <tr className="bg-base-200/50 text-base-content/70">
                  <th># Gen</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Modelo</th>
                  <th>Seguridad / Salud</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {generaciones.map((gen) => {
                  const requiresRev = gen.requiresHumanReview;
                  const banderas = gen.banderasAdvertencia || [];
                  return (
                    <tr key={gen.id} className="hover:bg-base-200/30 transition-colors">
                      <td className="font-bold text-primary">#{gen.numeroGeneracion}</td>
                      <td>{getStatusBadge(gen.estado)}</td>
                      <td className="text-base-content/80">
                        {gen.createdAt
                          ? format(new Date(gen.createdAt), "dd/MM/yyyy HH:mm")
                          : "N/A"}
                      </td>
                      <td className="text-base-content/70">{gen.modeloUtilizado || "IA Mock"}</td>
                      <td>
                        {requiresRev ? (
                          <div className="flex items-center gap-1.5 text-error font-bold">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>Revisión Requerida ({banderas.length} banderas)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Seguro</span>
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedGeneracion(gen)}
                            className="btn btn-primary btn-outline btn-xs gap-1 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Propuesta
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: VISOR DE PROPUESTA COMPLETA */}
      {selectedGeneracion && (
        <ProposalViewerModal
          generacion={selectedGeneracion}
          onClose={() => setSelectedGeneracion(null)}
          onApprove={(gen) => handleOpenApprove(gen)}
          onReject={(gen) => handleOpenReject(gen)}
          onArchive={(id) => handleArchive(id)}
          canManage={canManage}
        />
      )}

      {/* MODAL 2: CONFIRMACIÓN DE APROBACIÓN */}
      {generacionToApprove && (
        <ApprovalModal
          generacion={generacionToApprove}
          onClose={() => setGeneracionToApprove(null)}
          onConfirm={handleConfirmApprove}
          loading={actionLoading}
        />
      )}

      {/* MODAL 3: MOTIVO DE RECHAZO */}
      {generacionToReject && (
        <RejectModal
          generacion={generacionToReject}
          onClose={() => setGeneracionToReject(null)}
          onConfirm={handleConfirmReject}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
