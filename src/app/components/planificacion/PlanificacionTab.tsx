"use client";

import { useState, useEffect, useTransition } from "react";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import {
  Dumbbell,
  Clock,
  Apple,
  ArrowLeft,
  ArrowRight,
  Plus,
  Edit,
  ArrowRightLeft,
  XCircle,
  CheckCircle2,
  Loader2,
  X,
  Eye,
  FileText,
  Sparkles,
  History,
  ClipboardList,
} from "lucide-react";
import {
  getActivePlanningProfile,
  getPlanningProfileHistory,
  createPlanningProfile,
  createPlanningProfileVersion,
  updatePlanningProfile,
  closePlanningProfile,
} from "@/app/actions/perfil-planificacion";
import {
  getCurrentTrainerAssignment,
  getAvailableTrainers,
} from "@/app/actions/asignacion-entrenador";
import { getMedidasBySocio } from "@/app/actions/medidas";
import {
  solicitarGeneracionPlanIA,
  obtenerGeneracionesSocio,
  obtenerGeneracionPorId,
  aprobarGeneracionIA,
  rechazarGeneracionIA,
  archivarGeneracionIA,
} from "@/app/actions/planes-ia";
import {
  getDetallePlanEntrenamientoActivo,
  getDetallePlanAlimentacionActivo,
} from "@/app/actions/operaciones-planes";

import RutinasDetalleSection from "./RutinasDetalleSection";
import RecetasDetalleSection from "./RecetasDetalleSection";
import HorarioSocioSection from "./HorarioSocioSection";
import EvaluacionPerfilSection from "./EvaluacionPerfilSection";
import ProposalViewerModal from "./ProposalViewerModal";
import ApprovalModal from "./ApprovalModal";
import RejectModal from "./RejectModal";

interface Props {
  socio: {
    id: string;
    codigo: string;
    nombres: string | null;
    apellidos: string | null;
    fechaNacimiento: Date | string;
    sexo: string;
    tipoDocumento: string;
    numeroDocumento: string;
    telefono: string | null;
    fotoUrl: string | null;
    estado: string;
  };
  permissions?: string[];
  isAdmin?: boolean;
  onSwitchTab?: (tab: string) => void;
}

const DIAS_SEMANA = [
  { key: "LUNES", label: "Lunes" },
  { key: "MARTES", label: "Martes" },
  { key: "MIERCOLES", label: "Miércoles" },
  { key: "JUEVES", label: "Jueves" },
  { key: "VIERNES", label: "Viernes" },
  { key: "SABADO", label: "Sábado" },
  { key: "DOMINGO", label: "Domingo" },
];

const OBJETIVOS = [
  { value: "HIPERTROFIA", label: "Hipertrofia Muscular" },
  { value: "PERDIDA_GRASA", label: "Pérdida de Grasa / Definición" },
  { value: "RECOMPOSICION", label: "Recomposición Corporal" },
  { value: "FUERZA", label: "Fuerza y Potencia" },
  { value: "RESISTENCIA", label: "Resistencia Cardio" },
  { value: "ACONDICIONAMIENTO", label: "Acondicionamiento Físico General" },
  { value: "MANTENIMIENTO", label: "Salud y Mantenimiento" },
  { value: "OTRO", label: "Otro / Específico" },
];

const NIVELES = [
  { value: "PRINCIPIANTE", label: "Principiante (< 6 meses)" },
  { value: "INTERMEDIO", label: "Intermedio (6 meses - 2 años)" },
  { value: "AVANZADO", label: "Avanzado (> 2 años)" },
];

export default function PlanificacionTab({
  socio,
  permissions = [],
  isAdmin = false,
  onSwitchTab,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const canManage =
    isAdmin ||
    permissions.includes("PLANES_PERSONALIZADOS_GESTIONAR") ||
    permissions.includes("ADMIN") ||
    permissions.includes("SUPERADMIN") ||
    permissions.length === 0;

  // Estado de navegación: "hub" | "entrenamiento" | "nutricion" | "horario"
  const [viewMode, setViewMode] = useState<"hub" | "entrenamiento" | "nutricion" | "horario">("hub");

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [historyProfiles, setHistoryProfiles] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [latestMeasure, setLatestMeasure] = useState<any>(null);
  const [planEntrenamientoActivo, setPlanEntrenamientoActivo] = useState<any>(null);
  const [planAlimentacionActivo, setPlanAlimentacionActivo] = useState<any>(null);

  // Estados de IA & Propuestas
  const [generaciones, setGeneraciones] = useState<any[]>([]);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [selectedGeneracion, setSelectedGeneracion] = useState<any | null>(null);
  const [generacionToApprove, setGeneracionToApprove] = useState<any | null>(null);
  const [generacionToReject, setGeneracionToReject] = useState<any | null>(null);
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [showEvaluacionModal, setShowEvaluacionModal] = useState(false);

  // Modales de Perfil
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Formulario inicial de perfil
  const defaultFormData = {
    socioId: socio.id,
    entrenadorId: "",
    asignacionId: "",
    fechaInicio: new Date().toISOString().split("T")[0],
    objetivoPrincipal: "HIPERTROFIA",
    objetivoSecundario: "",
    nivel: "PRINCIPIANTE",
    tiempoEntrenando: "",
    experienciaPrevia: "",
    capacidadCardiovascular: "MEDIA",
    capacidadFuerza: "MEDIA",
    equipamientoDisponible: "GIMNASIO_COMPLETO",
    diasPorSemana: 3,
    diasPreferidos: ["LUNES", "MIERCOLES", "VIERNES"],
    duracionMinutos: 60,
    horarioPreferido: "TARDE",
    tipoEntrenamiento: "Fuerza / Hipertrofia",
    ejerciciosEvitados: "",
    lesionesReportadas: "",
    preferenciaAlimenticia: "OMNIVORO",
    alergiasDeclaradas: "",
    alimentosEvitados: "",
    numeroComidasDia: 3,
    consumoAguaLitros: 2.5,
    observaciones: "",
    motivoVersionado: "",
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split("T")[0]);

  // Cargar datos principales
  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, histRes, assignRes, trainRes, medRes, genRes, planEntRes, planAliRes] =
        await Promise.all([
          getActivePlanningProfile(socio.id),
          getPlanningProfileHistory(socio.id),
          getCurrentTrainerAssignment(socio.id),
          getAvailableTrainers(),
          getMedidasBySocio(socio.id),
          obtenerGeneracionesSocio(socio.id),
          getDetallePlanEntrenamientoActivo(socio.id),
          getDetallePlanAlimentacionActivo(socio.id),
        ]);

      if (profRes.success) setActiveProfile(profRes.perfil);
      else setActiveProfile(null);

      if (histRes.success) setHistoryProfiles(histRes.historial || []);
      if (assignRes.success) setAssignment(assignRes.asignacion);
      if (trainRes.success) setTrainers(trainRes.entrenadores || []);

      if (medRes.success && medRes.medidas && medRes.medidas.length > 0) {
        const sorted = [...medRes.medidas].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        setLatestMeasure(sorted[0]);
      } else {
        setLatestMeasure(null);
      }

      if (genRes.success && genRes.data) {
        setGeneraciones(genRes.data);
      }

      if (planEntRes.success && planEntRes.plan) {
        setPlanEntrenamientoActivo(planEntRes.plan);
      } else {
        setPlanEntrenamientoActivo(null);
      }

      if (planAliRes.success && planAliRes.plan) {
        setPlanAlimentacionActivo(planAliRes.plan);
      } else {
        setPlanAlimentacionActivo(null);
      }
    } catch (err) {
      console.error("Error loading planning profile data:", err);
      toast.error("Error al cargar datos de planificación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [socio.id]);

  // Formateo seguro
  const safeFormatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    try {
      return format(new Date(d), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  // Cálculo de edad
  const edadCalculada = socio.fechaNacimiento
    ? differenceInYears(new Date(), new Date(socio.fechaNacimiento))
    : "—";

  // Manejo de checkboxes de días preferidos
  const handleToggleDay = (dayKey: string) => {
    const current = formData.diasPreferidos || [];
    if (current.includes(dayKey)) {
      setFormData({ ...formData, diasPreferidos: current.filter((d) => d !== dayKey) });
    } else {
      if (current.length >= formData.diasPorSemana) {
        toast.info(`Has configurado ${formData.diasPorSemana} días por semana.`);
      }
      setFormData({ ...formData, diasPreferidos: [...current, dayKey] });
    }
  };

  // Handlers de Modales de Perfil
  const handleOpenCreate = () => {
    const defaultTrainerId = assignment?.entrenadorId || (trainers[0]?.id || "");
    const defaultAssignId = assignment?.id || "";
    setFormData({
      ...defaultFormData,
      entrenadorId: defaultTrainerId,
      asignacionId: defaultAssignId,
      fechaInicio: new Date().toISOString().split("T")[0],
    });
    setShowCreateModal(true);
  };

  const handleOpenVersion = () => {
    if (!activeProfile) return;
    setFormData({
      socioId: socio.id,
      entrenadorId: activeProfile.entrenadorId || (assignment?.entrenadorId || trainers[0]?.id || ""),
      asignacionId: activeProfile.asignacionId || (assignment?.id || ""),
      fechaInicio: new Date().toISOString().split("T")[0],
      objetivoPrincipal: activeProfile.objetivoPrincipal,
      objetivoSecundario: activeProfile.objetivoSecundario || "",
      nivel: activeProfile.nivel,
      tiempoEntrenando: activeProfile.tiempoEntrenando || "",
      experienciaPrevia: activeProfile.experienciaPrevia || "",
      capacidadCardiovascular: (activeProfile as any).capacidadCardiovascular || "MEDIA",
      capacidadFuerza: (activeProfile as any).capacidadFuerza || "MEDIA",
      equipamientoDisponible: (activeProfile as any).equipamientoDisponible || "GIMNASIO_COMPLETO",
      diasPorSemana: activeProfile.diasPorSemana,
      diasPreferidos: Array.isArray(activeProfile.diasPreferidos) ? activeProfile.diasPreferidos : [],
      duracionMinutos: activeProfile.duracionMinutos,
      horarioPreferido: activeProfile.horarioPreferido || "TARDE",
      tipoEntrenamiento: activeProfile.tipoEntrenamiento || "",
      ejerciciosEvitados: activeProfile.ejerciciosEvitados || "",
      lesionesReportadas: activeProfile.lesionesReportadas || "",
      preferenciaAlimenticia: activeProfile.preferenciaAlimenticia || "OMNIVORO",
      alergiasDeclaradas: activeProfile.alergiasDeclaradas || "",
      alimentosEvitados: activeProfile.alimentosEvitados || "",
      numeroComidasDia: activeProfile.numeroComidasDia || 3,
      consumoAguaLitros: activeProfile.consumoAguaLitros || 2.5,
      observaciones: activeProfile.observaciones || "",
      motivoVersionado: "",
    });
    setShowVersionModal(true);
  };

  const handleOpenEdit = () => {
    if (!activeProfile) return;
    setFormData({
      ...defaultFormData,
      entrenadorId: activeProfile.entrenadorId,
      asignacionId: activeProfile.asignacionId || "",
      fechaInicio: activeProfile.fechaInicio.split("T")[0],
      objetivoPrincipal: activeProfile.objetivoPrincipal,
      objetivoSecundario: activeProfile.objetivoSecundario || "",
      nivel: activeProfile.nivel,
      tiempoEntrenando: activeProfile.tiempoEntrenando || "",
      experienciaPrevia: activeProfile.experienciaPrevia || "",
      capacidadCardiovascular: (activeProfile as any).capacidadCardiovascular || "MEDIA",
      capacidadFuerza: (activeProfile as any).capacidadFuerza || "MEDIA",
      equipamientoDisponible: (activeProfile as any).equipamientoDisponible || "GIMNASIO_COMPLETO",
      diasPorSemana: activeProfile.diasPorSemana,
      diasPreferidos: Array.isArray(activeProfile.diasPreferidos) ? activeProfile.diasPreferidos : [],
      duracionMinutos: activeProfile.duracionMinutos,
      horarioPreferido: activeProfile.horarioPreferido || "TARDE",
      tipoEntrenamiento: activeProfile.tipoEntrenamiento || "",
      ejerciciosEvitados: activeProfile.ejerciciosEvitados || "",
      lesionesReportadas: activeProfile.lesionesReportadas || "",
      preferenciaAlimenticia: activeProfile.preferenciaAlimenticia || "OMNIVORO",
      alergiasDeclaradas: activeProfile.alergiasDeclaradas || "",
      alimentosEvitados: activeProfile.alimentosEvitados || "",
      numeroComidasDia: activeProfile.numeroComidasDia || 3,
      consumoAguaLitros: activeProfile.consumoAguaLitros || 2.5,
      observaciones: activeProfile.observaciones || "",
      motivoVersionado: activeProfile.motivoVersionado || "",
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entrenadorId) {
      toast.error("Seleccione un entrenador.");
      return;
    }

    startTransition(async () => {
      const res = await createPlanningProfile({
        ...formData,
        fechaInicio: new Date(formData.fechaInicio),
        diasPorSemana: Number(formData.diasPorSemana),
        duracionMinutos: Number(formData.duracionMinutos),
        numeroComidasDia: formData.numeroComidasDia ? Number(formData.numeroComidasDia) : null,
        consumoAguaLitros: formData.consumoAguaLitros ? Number(formData.consumoAguaLitros) : null,
      } as any);

      if (res.success) {
        toast.success("Perfil de planificación creado exitosamente.");
        setShowCreateModal(false);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo crear el perfil.");
      }
    });
  };

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motivoVersionado.trim()) {
      toast.error("Debe especificar el motivo del versionado.");
      return;
    }

    startTransition(async () => {
      const res = await createPlanningProfileVersion({
        ...formData,
        fechaInicio: new Date(formData.fechaInicio),
        diasPorSemana: Number(formData.diasPorSemana),
        duracionMinutos: Number(formData.duracionMinutos),
        numeroComidasDia: formData.numeroComidasDia ? Number(formData.numeroComidasDia) : null,
        consumoAguaLitros: formData.consumoAguaLitros ? Number(formData.consumoAguaLitros) : null,
      } as any);

      if (res.success) {
        toast.success("Nueva versión del perfil creada correctamente.");
        setShowVersionModal(false);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo crear la versión.");
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    startTransition(async () => {
      const res = await updatePlanningProfile({
        id: activeProfile.id,
        objetivoPrincipal: formData.objetivoPrincipal as any,
        objetivoSecundario: formData.objetivoSecundario,
        nivel: formData.nivel as any,
        tiempoEntrenando: formData.tiempoEntrenando,
        experienciaPrevia: formData.experienciaPrevia,
        diasPorSemana: Number(formData.diasPorSemana),
        diasPreferidos: formData.diasPreferidos as any,
        duracionMinutos: Number(formData.duracionMinutos),
        horarioPreferido: formData.horarioPreferido,
        tipoEntrenamiento: formData.tipoEntrenamiento,
        ejerciciosEvitados: formData.ejerciciosEvitados,
        lesionesReportadas: formData.lesionesReportadas,
        preferenciaAlimenticia: formData.preferenciaAlimenticia,
        alergiasDeclaradas: formData.alergiasDeclaradas,
        alimentosEvitados: formData.alimentosEvitados,
        numeroComidasDia: formData.numeroComidasDia ? Number(formData.numeroComidasDia) : null,
        consumoAguaLitros: formData.consumoAguaLitros ? Number(formData.consumoAguaLitros) : null,
        observaciones: formData.observaciones,
      });

      if (res.success) {
        toast.success("Perfil actualizado correctamente.");
        setShowEditModal(false);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo actualizar el perfil.");
      }
    });
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    startTransition(async () => {
      const res = await closePlanningProfile({
        id: activeProfile.id,
        fechaFin: new Date(closeDate),
      });

      if (res.success) {
        toast.success("Perfil finalizado correctamente.");
        setShowCloseModal(false);
        await loadData();
      } else {
        toast.error(res.error || "No se pudo finalizar el perfil.");
      }
    });
  };

  // Handlers de Generación y Aprobación IA
  const handleGenerateIA = async () => {
    if (!activeProfile) {
      toast.error("Debe completar la Evaluación del Socio antes de generar propuestas con IA.");
      return;
    }
    setGeneratingIA(true);
    try {
      const res = await solicitarGeneracionPlanIA(socio.id);
      if (res.success && res.generacionId) {
        toast.success("¡Propuesta IA generada exitosamente!");
        const detailRes = await obtenerGeneracionPorId(res.generacionId);
        if (detailRes.success && detailRes.data) {
          setSelectedGeneracion(detailRes.data);
        }
        await loadData();
      } else {
        toast.error(res.error || "Ocurrió un error al generar la propuesta IA.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al solicitar generación IA.");
    } finally {
      setGeneratingIA(false);
    }
  };

  const handleConfirmApprove = async (data: {
    confirmacionRevisionHumana: boolean;
    observacionesEntrenador: string;
  }) => {
    if (!generacionToApprove) return;
    try {
      const res = await aprobarGeneracionIA({
        generacionId: generacionToApprove.id,
        confirmacionRevisionHumana: data.confirmacionRevisionHumana,
        observacionesEntrenador: data.observacionesEntrenador,
      });
      if (res.success) {
        toast.success("¡Propuesta aprobada y activada como Plan Oficial!");
        setGeneracionToApprove(null);
        setSelectedGeneracion(null);
        await loadData();
      } else {
        toast.error(res.error || "Error al aprobar la propuesta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Fallo al aprobar.");
    }
  };

  const handleConfirmReject = async (motivo: string) => {
    if (!generacionToReject) return;
    try {
      const res = await rechazarGeneracionIA({
        generacionId: generacionToReject.id,
        motivoRechazo: motivo,
      });
      if (res.success) {
        toast.info("Propuesta rechazada.");
        setGeneracionToReject(null);
        setSelectedGeneracion(null);
        await loadData();
      } else {
        toast.error(res.error || "Error al rechazar la propuesta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Fallo al rechazar.");
    }
  };

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

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm opacity-70">Cargando planificación del socio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CABECERA PRINCIPAL */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-5 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">Planificación</h2>
                  {activeProfile ? (
                    <span className="badge badge-primary badge-sm font-bold">
                      Perfil v{activeProfile.version} ACTIVO
                    </span>
                  ) : (
                    <span className="badge badge-warning badge-sm font-bold">
                      Sin Evaluación Activa
                    </span>
                  )}
                </div>
                <p className="text-xs text-base-content/70 mt-0.5">
                  Socio: <strong className="text-base-content">{socio.nombres} {socio.apellidos}</strong> ({socio.codigo}) • {socio.tipoDocumento}: {socio.numeroDocumento} • {edadCalculada} años
                </p>
              </div>
            </div>

            {/* Acciones de Cabecera */}
            {canManage && (
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {!activeProfile ? (
                  <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary btn-sm flex-1 md:flex-initial gap-1.5 font-bold"
                  >
                    <Plus className="w-4 h-4" /> Comenzar Evaluación
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleGenerateIA}
                      disabled={generatingIA}
                      className="btn btn-primary btn-sm flex-1 md:flex-initial gap-1.5 font-bold shadow-sm"
                      title="Generar propuesta de entrenamiento y nutrición con IA"
                    >
                      {generatingIA ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generar Propuesta IA
                    </button>
                    {generaciones.length > 0 && (
                      <button
                        onClick={() => setShowProposalsModal(true)}
                        className="btn btn-outline btn-sm flex-1 md:flex-initial gap-1.5"
                        title="Ver propuestas generadas"
                      >
                        <History className="w-4 h-4 text-primary" />
                        Propuestas ({generaciones.length})
                      </button>
                    )}
                    <button
                      onClick={() => setShowEvaluacionModal(true)}
                      className="btn btn-outline btn-sm flex-1 md:flex-initial gap-1.5"
                      title="Ver o gestionar ficha técnica de evaluación"
                    >
                      <ClipboardList className="w-4 h-4 text-primary" />
                      Evaluación Técnica
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA PRINCIPAL: HUB DE EXACTAMENTE TRES TARJETAS                         */}
      {/* ========================================================================= */}
      {viewMode === "hub" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TARJETA 1: ENTRENAMIENTO */}
          <div
            onClick={() => setViewMode("entrenamiento")}
            className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-200 cursor-pointer overflow-hidden group hover:border-primary/50"
          >
            <div className="card-body p-6 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                    ENTRENAMIENTO
                  </span>
                  <h3 className="text-lg font-black text-base-content mt-0.5">
                    Plan de Entrenamiento
                  </h3>
                  <p className="text-xs text-base-content/70 mt-1">
                    {planEntrenamientoActivo
                      ? `${planEntrenamientoActivo.titulo || "Personalizado"} • Nivel ${planEntrenamientoActivo.nivelActual || 1} • v${planEntrenamientoActivo.version}`
                      : "Rutinas progresivas, sesiones, ejercicios, series y repeticiones."}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("entrenamiento");
                }}
                className="btn btn-primary btn-sm w-full gap-2 font-bold shadow-sm"
              >
                VER DETALLE <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TARJETA 2: NUTRICIÓN */}
          <div
            onClick={() => setViewMode("nutricion")}
            className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-200 cursor-pointer overflow-hidden group hover:border-success/50"
          >
            <div className="card-body p-6 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Apple className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-success">
                    NUTRICIÓN
                  </span>
                  <h3 className="text-lg font-black text-base-content mt-0.5">
                    Plan de Alimentación
                  </h3>
                  <p className="text-xs text-base-content/70 mt-1">
                    {planAlimentacionActivo
                      ? `${planAlimentacionActivo.titulo || "Personalizado"} • ${planAlimentacionActivo.contenido?.recetas?.length || 20}+ recetas • v${planAlimentacionActivo.version}`
                      : "Pautas nutricionales, recetas, momentos de comida e hidratación."}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("nutricion");
                }}
                className="btn btn-success text-white btn-sm w-full gap-2 font-bold shadow-sm"
              >
                VER DETALLE <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TARJETA 3: COORDINACIÓN / MI HORARIO */}
          <div
            onClick={() => setViewMode("horario")}
            className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-200 cursor-pointer overflow-hidden group hover:border-info/50"
          >
            <div className="card-body p-6 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-info/10 text-info flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-info">
                    COORDINACIÓN
                  </span>
                  <h3 className="text-lg font-black text-base-content mt-0.5">
                    Mi Horario
                  </h3>
                  <p className="text-xs text-base-content/70 mt-1">
                    {activeProfile
                      ? `${activeProfile.diasPorSemana} días/semana • Turno ${activeProfile.horarioPreferido || "Flexible"} • ${activeProfile.duracionMinutos} min`
                      : "Entrenador asignado, días acordados, hora y duración."}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("horario");
                }}
                className="btn btn-info text-white btn-sm w-full gap-2 font-bold shadow-sm"
              >
                VER DETALLE <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA DETALLE: 1. PLAN DE ENTRENAMIENTO                                  */}
      {/* ========================================================================= */}
      {viewMode === "entrenamiento" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMode("hub")}
              className="btn btn-ghost btn-sm gap-2 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Planificación
            </button>
          </div>
          <RutinasDetalleSection
            socioId={socio.id}
            onOpenGenerateIA={handleGenerateIA}
            generatingIA={generatingIA}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA DETALLE: 2. PLAN DE ALIMENTACIÓN                                   */}
      {/* ========================================================================= */}
      {viewMode === "nutricion" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMode("hub")}
              className="btn btn-ghost btn-sm gap-2 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Planificación
            </button>
          </div>
          <RecetasDetalleSection
            socioId={socio.id}
            onOpenGenerateIA={handleGenerateIA}
            generatingIA={generatingIA}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA DETALLE: 3. MI HORARIO                                             */}
      {/* ========================================================================= */}
      {viewMode === "horario" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMode("hub")}
              className="btn btn-ghost btn-sm gap-2 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a Planificación
            </button>
          </div>
          <HorarioSocioSection
            socioId={socio.id}
            socioNombre={`${socio.nombres || ""} ${socio.apellidos || ""}`.trim() || socio.codigo}
            perfilActivo={activeProfile}
            assignment={assignment}
            canManage={canManage}
            onOpenEditSchedule={handleOpenEdit}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EVALUACIÓN TÉCNICA DEL SOCIO (ACCESO SECUNDARIO DE GESTIÓN)        */}
      {/* ========================================================================= */}
      {showEvaluacionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-base-200 bg-base-200/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Ficha Técnica de Evaluación
              </h3>
              <button onClick={() => setShowEvaluacionModal(false)} className="btn btn-ghost btn-circle btn-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <EvaluacionPerfilSection
                socio={socio}
                activeProfile={activeProfile}
                medidaActual={latestMeasure}
                canManage={canManage}
                onOpenCreate={handleOpenCreate}
                onOpenEdit={() => {
                  setShowEvaluacionModal(false);
                  handleOpenEdit();
                }}
                onOpenNewVersion={() => {
                  setShowEvaluacionModal(false);
                  handleOpenVersion();
                }}
                onOpenCloseProfile={() => {
                  setShowEvaluacionModal(false);
                  setShowCloseModal(true);
                }}
              />
            </div>
            <div className="p-4 border-t border-base-200 flex justify-end">
              <button onClick={() => setShowEvaluacionModal(false)} className="btn btn-ghost btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES: VISOR Y APROBACIÓN DE PROPUESTAS IA                              */}
      {/* ========================================================================= */}
      {selectedGeneracion && (
        <ProposalViewerModal
          generacion={selectedGeneracion}
          onClose={() => setSelectedGeneracion(null)}
          onApprove={(gen) => setGeneracionToApprove(gen)}
          onReject={(gen) => setGeneracionToReject(gen)}
          onArchive={(genId) => handleArchive(genId)}
          canManage={canManage}
        />
      )}

      {generacionToApprove && (
        <ApprovalModal
          generacion={generacionToApprove}
          onClose={() => setGeneracionToApprove(null)}
          onConfirm={handleConfirmApprove}
        />
      )}

      {generacionToReject && (
        <RejectModal
          generacion={generacionToReject}
          onClose={() => setGeneracionToReject(null)}
          onConfirm={handleConfirmReject}
        />
      )}

      {/* MODAL LISTA DE PROPUESTAS IA */}
      {showProposalsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-base-200 bg-base-200/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Historial de Propuestas IA
              </h3>
              <button onClick={() => setShowProposalsModal(false)} className="btn btn-ghost btn-circle btn-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {generaciones.length === 0 ? (
                <p className="text-center text-xs opacity-60 py-6">No hay propuestas generadas.</p>
              ) : (
                generaciones.map((gen) => (
                  <div
                    key={gen.id}
                    className="p-4 bg-base-200/50 rounded-xl border border-base-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Propuesta #{gen.numeroGeneracion}</span>
                        <span className={`badge badge-xs ${gen.estado === "APROBADO" ? "badge-success text-white" : gen.estado === "RECHAZADO" ? "badge-error text-white" : "badge-warning"}`}>
                          {gen.estado}
                        </span>
                      </div>
                      <span className="opacity-60 text-[11px]">
                        Fecha: {safeFormatDate(gen.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        const detailRes = await obtenerGeneracionPorId(gen.id);
                        if (detailRes.success && detailRes.data) {
                          setSelectedGeneracion(detailRes.data);
                          setShowProposalsModal(false);
                        }
                      }}
                      className="btn btn-primary btn-xs gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Detalle
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-base-200 flex justify-end">
              <button onClick={() => setShowProposalsModal(false)} className="btn btn-ghost btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES DE GESTIÓN DE PERFIL (CREAR / EDITAR / VERSIONAR / CERRAR)        */}
      {/* ========================================================================= */}
      {(showCreateModal || showVersionModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-base-200 bg-base-200/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                {showCreateModal && "Crear Perfil de Planificación Inicial (v1)"}
                {showVersionModal && `Crear Nueva Versión del Perfil (v${(activeProfile?.version || 1) + 1})`}
                {showEditModal && `Editar Perfil Activo Actual (v${activeProfile?.version})`}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowVersionModal(false);
                  setShowEditModal(false);
                }}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              onSubmit={
                showCreateModal
                  ? handleCreateSubmit
                  : showVersionModal
                  ? handleVersionSubmit
                  : handleEditSubmit
              }
              className="p-5 overflow-y-auto space-y-6 text-xs"
            >
              {showVersionModal && (
                <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-primary text-sm">
                    <ArrowRightLeft className="w-4 h-4" /> Versionado Secuencial
                  </div>
                  <p className="opacity-80 text-xs">
                    Al crear una nueva versión, el perfil actual (v{activeProfile?.version}) pasará automáticamente al historial como versión de solo lectura.
                  </p>
                  <div>
                    <label className="block font-bold mb-1">
                      Motivo del Versionado <span className="text-error">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. Reevaluación trimestral / Cambio de objetivo a hipertrofia"
                      value={formData.motivoVersionado}
                      onChange={(e) => setFormData({ ...formData, motivoVersionado: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
              )}

              {/* SECCIÓN 1: DATOS DE OBJETIVO Y ENTRENADOR */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  1. Objetivos y Nivel
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!showEditModal && (
                    <div>
                      <label className="block font-semibold mb-1">
                        Entrenador Responsable <span className="text-error">*</span>
                      </label>
                      <select
                        required
                        value={formData.entrenadorId}
                        onChange={(e) => setFormData({ ...formData, entrenadorId: e.target.value })}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value="">-- Seleccionar Entrenador --</option>
                        {trainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombres} {t.apellidos} ({t.rol})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold mb-1">
                      Objetivo Principal <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={formData.objetivoPrincipal}
                      onChange={(e) => setFormData({ ...formData, objetivoPrincipal: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      {OBJETIVOS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Nivel Atlético <span className="text-error">*</span>
                    </label>
                    <select
                      required
                      value={formData.nivel}
                      onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      {NIVELES.map((n) => (
                        <option key={n.value} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Fecha de Inicio del Perfil</label>
                    <input
                      type="date"
                      required
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Objetivo Específico / Secundario</label>
                    <input
                      type="text"
                      placeholder="Ej. Mejorar sentadilla, tonificar abdomen, ganar 2kg masa magra"
                      value={formData.objetivoSecundario}
                      onChange={(e) => setFormData({ ...formData, objetivoSecundario: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Tiempo Entrenando</label>
                    <input
                      type="text"
                      placeholder="Ej. 6 meses, 1 año, Primera vez"
                      value={formData.tiempoEntrenando}
                      onChange={(e) => setFormData({ ...formData, tiempoEntrenando: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Experiencia Previa en Deportes/Gimnasio</label>
                    <input
                      type="text"
                      placeholder="Ej. Fútbol amateur, natación, crossfit previo"
                      value={formData.experienciaPrevia}
                      onChange={(e) => setFormData({ ...formData, experienciaPrevia: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DISPONIBILIDAD */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  2. Disponibilidad y Horarios
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Días por Semana (Frecuencia)</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      required
                      value={formData.diasPorSemana}
                      onChange={(e) => setFormData({ ...formData, diasPorSemana: parseInt(e.target.value) || 3 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Duración por Sesión (Minutos)</label>
                    <input
                      type="number"
                      min={20}
                      max={180}
                      required
                      value={formData.duracionMinutos}
                      onChange={(e) => setFormData({ ...formData, duracionMinutos: parseInt(e.target.value) || 60 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Turno / Horario Preferido</label>
                    <select
                      value={formData.horarioPreferido}
                      onChange={(e) => setFormData({ ...formData, horarioPreferido: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="MAÑANA">Mañana (6:00 - 12:00)</option>
                      <option value="TARDE">Tarde (12:00 - 18:00)</option>
                      <option value="NOCHE">Noche (18:00 - 22:00)</option>
                      <option value="FLEXIBLE">Flexible / Rotativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Días Acordados para Entrenar</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DIAS_SEMANA.map((d) => {
                      const checked = (formData.diasPreferidos || []).includes(d.key);
                      return (
                        <button
                          type="button"
                          key={d.key}
                          onClick={() => handleToggleDay(d.key)}
                          className={`btn btn-xs ${checked ? "btn-primary text-white" : "btn-ghost bg-base-200"}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PREFERENCIAS Y SALUD */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  3. Preferencias de Entrenamiento y Salud
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Tipo de Entrenamiento Preferido</label>
                    <input
                      type="text"
                      placeholder="Ej. Pesas tradicionales, Funcional, Máquinas"
                      value={formData.tipoEntrenamiento}
                      onChange={(e) => setFormData({ ...formData, tipoEntrenamiento: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Ejercicios Excluidos o Evitados</label>
                    <input
                      type="text"
                      placeholder="Ej. Sentadilla libre, Peso muerto, Saltos"
                      value={formData.ejerciciosEvitados}
                      onChange={(e) => setFormData({ ...formData, ejerciciosEvitados: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-warning">
                      Lesiones / Restricciones Físicas Declaradas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Hernia discal L5-S1 (evitar carga axial), condromalacia rotuliana..."
                      value={formData.lesionesReportadas}
                      onChange={(e) => setFormData({ ...formData, lesionesReportadas: e.target.value })}
                      className="textarea textarea-bordered textarea-warning w-full text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: ALIMENTACIÓN */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  4. Pautas y Hábitos Alimentarios
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Preferencia Alimenticia</label>
                    <select
                      value={formData.preferenciaAlimenticia}
                      onChange={(e) => setFormData({ ...formData, preferenciaAlimenticia: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="OMNIVORO">Omnívoro</option>
                      <option value="VEGETARIANO">Vegetariano</option>
                      <option value="VEGANO">Vegano</option>
                      <option value="PESCETARIANO">Pescetariano</option>
                      <option value="KETO">Keto / Bajo en Carbohidratos</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Comidas al Día</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.numeroComidasDia}
                      onChange={(e) => setFormData({ ...formData, numeroComidasDia: parseInt(e.target.value) || 3 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Consumo de Agua (Litros/día)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.5}
                      max={10}
                      value={formData.consumoAguaLitros}
                      onChange={(e) => setFormData({ ...formData, consumoAguaLitros: parseFloat(e.target.value) || 2.5 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-error">Alergias o Intolerancias Alimentarias</label>
                    <input
                      type="text"
                      placeholder="Ej. Lactosa, Maní, Mariscos, Gluten"
                      value={formData.alergiasDeclaradas}
                      onChange={(e) => setFormData({ ...formData, alergiasDeclaradas: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Alimentos Evitados por Gusto</label>
                    <input
                      type="text"
                      placeholder="Ej. Pescado azul, Brócoli"
                      value={formData.alimentosEvitados}
                      onChange={(e) => setFormData({ ...formData, alimentosEvitados: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: OBSERVACIONES */}
              <div className="space-y-2">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  5. Observaciones del Entrenador
                </h4>
                <textarea
                  rows={2}
                  placeholder="Notas pedagógicas y recomendaciones del instructor..."
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="textarea textarea-bordered w-full text-xs"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-4 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowVersionModal(false);
                    setShowEditModal(false);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary btn-sm gap-2">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CERRAR / FINALIZAR PERFIL */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-error flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Finalizar Perfil Actual
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="btn btn-ghost btn-circle btn-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs opacity-80">
              ¿Está seguro de que desea finalizar el perfil actual (v{activeProfile?.version})? El perfil se conservará intacto en el historial como versión archivada.
            </p>

            <form onSubmit={handleCloseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Fecha de Cierre / Finalización</label>
                <input
                  type="date"
                  required
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCloseModal(false)} className="btn btn-ghost btn-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className="btn btn-error btn-sm text-white gap-2">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Finalizar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
