"use client";

import { useState, useEffect, useTransition } from "react";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import {
  Dumbbell,
  UserCheck,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  History,
  Activity,
  Plus,
  Edit,
  ArrowRightLeft,
  XCircle,
  CheckCircle2,
  Loader2,
  X,
  Eye,
  ShieldAlert,
  Apple,
  FileText,
  TrendingUp,
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
import PlanIASection from "./PlanIASection";
import EvolucionSocioSection from "./EvolucionSocioSection";
import RutinasDetalleSection from "./RutinasDetalleSection";
import RecetasDetalleSection from "./RecetasDetalleSection";
import AdherenciaSection from "./AdherenciaSection";
import AdaptacionInteligenteSection from "./AdaptacionInteligenteSection";

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

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [historyProfiles, setHistoryProfiles] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [latestMeasure, setLatestMeasure] = useState<any>(null);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [viewDetailModal, setViewDetailModal] = useState<any>(null);

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

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, histRes, assignRes, trainRes, medRes] = await Promise.all([
        getActivePlanningProfile(socio.id),
        getPlanningProfileHistory(socio.id),
        getCurrentTrainerAssignment(socio.id),
        getAvailableTrainers(),
        getMedidasBySocio(socio.id),
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

  // Handlers
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

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm opacity-70">Cargando perfil de planificación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. CABECERA: RESUMEN DE ASIGNACIÓN & SOCIO */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-5 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Planificación Personalizada</h2>
                  {activeProfile && (
                    <span className="badge badge-primary badge-sm font-semibold">
                      Versión v{activeProfile.version}
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-70 mt-0.5">
                  Socio: <strong className="text-base-content">{socio.nombres} {socio.apellidos}</strong> ({socio.codigo}) • {socio.tipoDocumento}: {socio.numeroDocumento} • {edadCalculada} años • Sexo: {socio.sexo === "M" ? "Masculino" : "Femenino"}
                </p>
              </div>
            </div>

            {/* Acciones principales de cabecera */}
            {canManage && (
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {!activeProfile ? (
                  <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary btn-sm flex-1 md:flex-initial gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Crear Perfil
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleOpenEdit}
                      className="btn btn-outline btn-sm flex-1 md:flex-initial gap-1.5"
                    >
                      <Edit className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={handleOpenVersion}
                      className="btn btn-primary btn-sm flex-1 md:flex-initial gap-1.5"
                    >
                      <ArrowRightLeft className="w-4 h-4" /> Nueva Versión
                    </button>
                    <button
                      onClick={() => {
                        setCloseDate(new Date().toISOString().split("T")[0]);
                        setShowCloseModal(true);
                      }}
                      className="btn btn-ghost btn-sm text-error flex-1 md:flex-initial gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Finalizar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tarjeta de Entrenador Asignado */}
          <div className="mt-4 p-3.5 bg-base-200/60 rounded-xl border border-base-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-primary" />
              <span>
                Entrenador Asignado:{" "}
                <strong className="text-base-content text-sm">
                  {assignment
                    ? `${assignment.entrenador.nombres} ${assignment.entrenador.apellidos} (${assignment.entrenador.rol})`
                    : "Sin entrenador formalmente asignado"}
                </strong>
              </span>
            </div>
            {assignment && (
              <div className="flex items-center gap-4 opacity-80">
                <span>Inicio: <strong>{safeFormatDate(assignment.fechaInicio)}</strong></span>
                <span>Plan: <strong>{assignment.mesesPlan} mes(es)</strong></span>
                <span className="badge badge-success badge-sm text-white font-bold">Activo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. RESUMEN FÍSICO ACTUAL (MedidaFisica) */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-5 md:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base">Medidas Físicas y Antropométricas Actuales</h3>
            </div>
            {onSwitchTab && (
              <button
                onClick={() => onSwitchTab("medidas")}
                className="btn btn-ghost btn-xs text-primary gap-1"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Ver Evolución y Modelo 3D
              </button>
            )}
          </div>

          {latestMeasure ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-center text-xs">
                <div className="bg-base-200/80 p-2.5 rounded-xl">
                  <span className="opacity-70 block text-[11px]">Peso</span>
                  <strong className="text-sm text-primary font-bold">{latestMeasure.peso || "—"} kg</strong>
                </div>
                <div className="bg-base-200/80 p-2.5 rounded-xl">
                  <span className="opacity-70 block text-[11px]">Talla</span>
                  <strong className="text-sm font-bold">{latestMeasure.altura || "—"} cm</strong>
                </div>
                <div className="bg-base-200/80 p-2.5 rounded-xl">
                  <span className="opacity-70 block text-[11px]">% Grasa</span>
                  <strong className="text-sm font-bold">{latestMeasure.porcentajeGrasa ? `${latestMeasure.porcentajeGrasa}%` : "—"}</strong>
                </div>
                <div className="bg-base-200/80 p-2.5 rounded-xl">
                  <span className="opacity-70 block text-[11px]">% Músculo</span>
                  <strong className="text-sm font-bold">{latestMeasure.porcentajeMusculo ? `${latestMeasure.porcentajeMusculo}%` : "—"}</strong>
                </div>
                <div className="bg-base-200/80 p-2.5 rounded-xl">
                  <span className="opacity-70 block text-[11px]">Pecho</span>
                  <strong className="text-sm font-bold">{latestMeasure.pecho ? `${latestMeasure.pecho} cm` : "—"}</strong>
                </div>
                <div className="bg-base-200/80 p-2.5 rounded-xl">
                  <span className="opacity-70 block text-[11px]">Cintura</span>
                  <strong className="text-sm font-bold">{latestMeasure.cintura ? `${latestMeasure.cintura} cm` : "—"}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px] opacity-80 pt-1">
                <div>Cuello: <strong>{latestMeasure.cuello || "—"} cm</strong></div>
                <div>Hombros: <strong>{latestMeasure.hombros || "—"} cm</strong></div>
                <div>Bíceps: <strong>{latestMeasure.biceps || "—"} cm</strong></div>
                <div>Glúteos: <strong>{latestMeasure.gluteos || "—"} cm</strong></div>
                <div>Cuádriceps: <strong>{latestMeasure.cuadriceps || "—"} cm</strong></div>
                <div>Pantorrillas: <strong>{latestMeasure.pantorrillas || "—"} cm</strong></div>
              </div>
              <p className="text-[11px] text-right opacity-60">
                Última medición registrada: {safeFormatDate(latestMeasure.fecha)}
              </p>
            </div>
          ) : (
            <div className="p-6 bg-base-200/40 rounded-xl text-center text-xs opacity-70">
              No hay medidas físicas registradas para este socio.
              {onSwitchTab && (
                <div className="mt-2">
                  <button onClick={() => onSwitchTab("medidas")} className="btn btn-outline btn-xs">
                    Registrar Primera Medida
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sección de Adaptación Inteligente y Recomendación de Revisión del Plan */}
      <AdaptacionInteligenteSection socioId={socio.id} />

      {/* Sección de Evolución y Seguimiento del Plan */}
      <EvolucionSocioSection socioId={socio.id} />

      {/* Sección de Adherencia y Cumplimiento */}
      <AdherenciaSection socioId={socio.id} />

      {/* Sección de Gestión Operativa de Rutinas (6 Niveles) */}
      <RutinasDetalleSection socioId={socio.id} />

      {/* Sección de Gestión Operativa de Plan de Alimentación y Recetas */}
      <RecetasDetalleSection socioId={socio.id} />

      {/* 3. PERFIL DE PLANIFICACIÓN VIGENTE / ESTADO VACÍO */}
      {activeProfile ? (
        <div className="card bg-base-100 shadow-xl border border-base-200">
          <div className="card-body p-5 md:p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-base-200 pb-3">
              <div>
                <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Perfil de Planificación Actual (v{activeProfile.version})
                </h3>
                <p className="text-xs opacity-70">
                  En vigor desde {safeFormatDate(activeProfile.fechaInicio)} • Creado por: {activeProfile.entrenador?.nombres} {activeProfile.entrenador?.apellidos}
                </p>
              </div>
              <span className="badge badge-success text-white font-bold">Activo</span>
            </div>

            {/* SECCIÓN A: OBJETIVO Y NIVEL */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">1. Objetivos y Nivel</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="text-xs opacity-70 block">Objetivo Principal</span>
                  <span className="font-bold text-sm text-base-content">
                    {OBJETIVOS.find((o) => o.value === activeProfile.objetivoPrincipal)?.label || activeProfile.objetivoPrincipal}
                  </span>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="text-xs opacity-70 block">Nivel Atlético</span>
                  <span className="font-bold text-sm text-base-content">
                    {NIVELES.find((n) => n.value === activeProfile.nivel)?.label || activeProfile.nivel}
                  </span>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="text-xs opacity-70 block">Objetivo Específico</span>
                  <span className="font-medium text-xs text-base-content">
                    {activeProfile.objetivoSecundario || "Sin objetivo secundario especificado"}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN B: EXPERIENCIA Y DISPONIBILIDAD */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">2. Disponibilidad y Horarios</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Frecuencia Semanal</span>
                  <strong className="text-sm">{activeProfile.diasPorSemana} días por semana</strong>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Duración de Sesión</span>
                  <strong className="text-sm">{activeProfile.duracionMinutos} minutos</strong>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Turno Habitual</span>
                  <strong className="text-sm">{activeProfile.horarioPreferido || "Flexible"}</strong>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Tiempo Entrenando</span>
                  <strong className="text-sm">{activeProfile.tiempoEntrenando || "No declarado"}</strong>
                </div>
              </div>

              {/* Días preferidos */}
              {Array.isArray(activeProfile.diasPreferidos) && activeProfile.diasPreferidos.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs opacity-70">Días acordados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfile.diasPreferidos.map((d: string) => (
                      <span key={d} className="badge badge-sm badge-outline font-semibold">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN C: METODOLOGÍA Y RESTRICCIONES DECLARADAS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">3. Adaptaciones y Restricciones Físicas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block font-semibold">Tipo de Entrenamiento Preferido:</span>
                  <p className="mt-1">{activeProfile.tipoEntrenamiento || "Pesas tradicionales / Hipertrofia"}</p>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block font-semibold">Ejercicios Excluidos / Evitados:</span>
                  <p className="mt-1">{activeProfile.ejerciciosEvitados || "Ninguno reportado"}</p>
                </div>
              </div>

              {/* Lesiones reportadas + Advertencia */}
              <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2 text-warning font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Restricciones físicas y molestias reportadas por el socio:</span>
                </div>
                <p className="text-base-content font-medium pl-6">
                  {activeProfile.lesionesReportadas || "Sin lesiones ni limitaciones físicas declaradas."}
                </p>
                <div className="text-[11px] opacity-75 italic border-t border-warning/20 pt-1.5 pl-6">
                  ℹ️ <strong>Advertencia:</strong> Información declarada por el socio o registrada por el entrenador. No constituye diagnóstico médico ni autorización para realizar ejercicio.
                </div>
              </div>
            </div>

            {/* SECCIÓN D: ALIMENTACIÓN DECLARADA */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Apple className="w-4 h-4" /> 4. Pautas y Hábitos Alimentarios Declarados
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Preferencia Dietética:</span>
                  <strong>{activeProfile.preferenciaAlimenticia || "Omnívoro"}</strong>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Alergias / Intolerancias:</span>
                  <strong>{activeProfile.alergiasDeclaradas || "Ninguna reportada"}</strong>
                </div>
                <div className="bg-base-200/70 p-3 rounded-xl">
                  <span className="opacity-70 block">Comidas / Hidratación:</span>
                  <strong>{activeProfile.numeroComidasDia || 3} comidas/día • {activeProfile.consumoAguaLitros || 2.5} L agua</strong>
                </div>
              </div>
              <div className="text-[11px] opacity-75 italic p-2 bg-base-200/40 rounded-lg">
                ℹ️ <strong>Nota:</strong> La información alimentaria registrada es declarativa y no constituye un plan nutricional profesional.
              </div>
            </div>

            {/* SECCIÓN E: OBSERVACIONES TÉCNICAS */}
            {activeProfile.observaciones && (
              <div className="space-y-1 text-xs bg-base-200/60 p-3 rounded-xl">
                <span className="opacity-70 font-semibold block">Observaciones y Criterios del Entrenador:</span>
                <p className="text-base-content">{activeProfile.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ESTADO VACÍO CUANDO NO HAY PERFIL ACTIVO */
        <div className="card bg-base-100 shadow-xl border border-base-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold">Este socio aún no tiene un perfil de planificación activo</h3>
          <p className="text-xs opacity-70 max-w-md mx-auto mt-1 mb-4">
            Cree el perfil de planificación para establecer objetivos, nivel, disponibilidad, restricciones y pautas declaradas.
          </p>
          {canManage && (
            <div>
              <button onClick={handleOpenCreate} className="btn btn-primary btn-sm gap-2">
                <Plus className="w-4 h-4" /> Crear Perfil de Planificación
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. SECCIÓN DE PLANIFICACIÓN IA & PLANES MATERIALIZADOS */}
      <PlanIASection
        socio={socio}
        perfilActivo={activeProfile}
        canManage={canManage}
      />

      {/* 5. HISTORIAL DE VERSIONES */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Historial de Versiones del Perfil</h3>
          </div>

          {historyProfiles.length === 0 ? (
            <p className="text-xs opacity-70 text-center py-4">No hay versiones registradas en el historial.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm text-xs">
                <thead>
                  <tr className="border-b border-base-200 opacity-70">
                    <th>Versión</th>
                    <th>Objetivo</th>
                    <th>Nivel</th>
                    <th>Entrenador</th>
                    <th>Vigencia</th>
                    <th>Motivo de Versión</th>
                    <th>Estado</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historyProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-base-200/40">
                      <td className="font-bold font-mono">v{p.version}</td>
                      <td>{p.objetivoPrincipal}</td>
                      <td>{p.nivel}</td>
                      <td>{p.entrenador ? `${p.entrenador.nombres} ${p.entrenador.apellidos}` : "—"}</td>
                      <td>{safeFormatDate(p.fechaInicio)} → {safeFormatDate(p.fechaFin)}</td>
                      <td className="max-w-xs truncate">{p.motivoVersionado || "Versión inicial"}</td>
                      <td>
                        {p.activo ? (
                          <span className="badge badge-success badge-sm text-white font-bold">Activo</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm opacity-70">Histórico</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => setViewDetailModal(p)}
                          className="btn btn-ghost btn-xs text-primary gap-1"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREAR PERFIL INICIAL / MODAL 2: NUEVA VERSIÓN / MODAL 3: EDITAR PERFIL */}
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
                    <label className="block font-semibold mb-1">Objetivo Específico / Secundario</label>
                    <input
                      type="text"
                      placeholder="Ej. Enfoque en glúteos y hombros"
                      value={formData.objetivoSecundario}
                      onChange={(e) => setFormData({ ...formData, objetivoSecundario: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DISPONIBILIDAD Y TIEMPOS */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  2. Disponibilidad y Experiencia
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Días por Semana (1-7)</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={formData.diasPorSemana}
                      onChange={(e) => setFormData({ ...formData, diasPorSemana: parseInt(e.target.value) || 3 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Duración Sesión (min)</label>
                    <input
                      type="number"
                      min={15}
                      max={240}
                      value={formData.duracionMinutos}
                      onChange={(e) => setFormData({ ...formData, duracionMinutos: parseInt(e.target.value) || 60 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Horario Preferido</label>
                    <input
                      type="text"
                      placeholder="Ej. Mañanas / Tardes 6pm"
                      value={formData.horarioPreferido}
                      onChange={(e) => setFormData({ ...formData, horarioPreferido: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>

                {/* Días preferidos checkboxes */}
                <div>
                  <label className="block font-semibold mb-1.5">Días Preferidos de la Semana:</label>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map((d) => {
                      const isSelected = formData.diasPreferidos?.includes(d.key);
                      return (
                        <button
                          type="button"
                          key={d.key}
                          onClick={() => handleToggleDay(d.key)}
                          className={`btn btn-xs ${isSelected ? "btn-primary font-bold" : "btn-outline opacity-70"}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Tiempo Entrenando Previo</label>
                    <input
                      type="text"
                      placeholder="Ej. 1 año continuo"
                      value={formData.tiempoEntrenando}
                      onChange={(e) => setFormData({ ...formData, tiempoEntrenando: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Experiencia / Deportes Previos</label>
                    <input
                      type="text"
                      placeholder="Ej. Natación, Calistenia"
                      value={formData.experienciaPrevia}
                      onChange={(e) => setFormData({ ...formData, experienciaPrevia: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Capacidad Cardiovascular</label>
                    <select
                      value={formData.capacidadCardiovascular}
                      onChange={(e) => setFormData({ ...formData, capacidadCardiovascular: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="BAJA">Baja</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="EXCELENTE">Excelente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Capacidad de Fuerza</label>
                    <select
                      value={formData.capacidadFuerza}
                      onChange={(e) => setFormData({ ...formData, capacidadFuerza: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="BAJA">Baja</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="AVANZADA">Avanzada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Equipamiento Disponible</label>
                    <select
                      value={formData.equipamientoDisponible}
                      onChange={(e) => setFormData({ ...formData, equipamientoDisponible: e.target.value })}
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="GIMNASIO_COMPLETO">Gimnasio Completo</option>
                      <option value="MANCUERNAS_BANCOS">Mancuernas y Bancos</option>
                      <option value="PESO_CORPORAL">Peso Corporal / Calistenia</option>
                      <option value="BANDAS_RESISTENCIA">Bandas de Resistencia</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: ENTRENAMIENTO Y RESTRICCIONES */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider">
                  3. Entrenamiento y Restricciones
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Tipo de Entrenamiento Preferido</label>
                    <input
                      type="text"
                      placeholder="Ej. Hipertrofia con peso libre"
                      value={formData.tipoEntrenamiento}
                      onChange={(e) => setFormData({ ...formData, tipoEntrenamiento: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Ejercicios Evitados</label>
                    <input
                      type="text"
                      placeholder="Ej. Press tras nuca, Sentadilla profunda"
                      value={formData.ejerciciosEvitados}
                      onChange={(e) => setFormData({ ...formData, ejerciciosEvitados: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-warning flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Lesiones / Limitaciones Reportadas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Declaración de molestias articulares o limitaciones de rango..."
                    value={formData.lesionesReportadas}
                    onChange={(e) => setFormData({ ...formData, lesionesReportadas: e.target.value })}
                    className="textarea textarea-bordered w-full text-xs"
                  />
                  <span className="text-[10px] opacity-70 block mt-0.5">
                    Nota: Información declarada por el socio. No constituye diagnóstico médico.
                  </span>
                </div>
              </div>

              {/* SECCIÓN 4: PAUTAS ALIMENTARIAS DECLARADAS */}
              <div className="space-y-3">
                <h4 className="font-bold text-primary text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Apple className="w-4 h-4" /> 4. Pautas y Hábitos Alimentarios Declarados
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Preferencia Dietética</label>
                    <input
                      type="text"
                      placeholder="Ej. Omnívoro / Vegetariano"
                      value={formData.preferenciaAlimenticia}
                      onChange={(e) => setFormData({ ...formData, preferenciaAlimenticia: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Comidas al Día</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
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
                      min={0}
                      max={20}
                      value={formData.consumoAguaLitros}
                      onChange={(e) => setFormData({ ...formData, consumoAguaLitros: parseFloat(e.target.value) || 2.5 })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Alergias / Intolerancias Declaradas</label>
                    <input
                      type="text"
                      placeholder="Ej. Intolerancia a la lactosa"
                      value={formData.alergiasDeclaradas}
                      onChange={(e) => setFormData({ ...formData, alergiasDeclaradas: e.target.value })}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Alimentos Evitados</label>
                    <input
                      type="text"
                      placeholder="Ej. Mariscos, picantes"
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

      {/* MODAL 4: FINALIZAR PERFIL */}
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

      {/* MODAL 5: VER DETALLE HISTÓRICO COMPLETO (SOLO LECTURA) */}
      {viewDetailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-base-200 bg-base-200/50">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Detalle de Versión v{viewDetailModal.version} (Histórico)
                </h3>
                <p className="text-xs opacity-70">
                  Vigencia: {safeFormatDate(viewDetailModal.fechaInicio)} → {safeFormatDate(viewDetailModal.fechaFin)}
                </p>
              </div>
              <button onClick={() => setViewDetailModal(null)} className="btn btn-ghost btn-circle btn-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-base-200/50 p-3 rounded-xl">
                <div>
                  <span className="opacity-70 block">Objetivo Principal:</span>
                  <strong className="text-sm">{viewDetailModal.objetivoPrincipal}</strong>
                </div>
                <div>
                  <span className="opacity-70 block">Nivel:</span>
                  <strong className="text-sm">{viewDetailModal.nivel}</strong>
                </div>
                <div>
                  <span className="opacity-70 block">Entrenador Autor:</span>
                  <strong>{viewDetailModal.entrenador?.nombres} {viewDetailModal.entrenador?.apellidos}</strong>
                </div>
                <div>
                  <span className="opacity-70 block">Motivo de Versión:</span>
                  <strong>{viewDetailModal.motivoVersionado || "Versión inicial"}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-primary block">Disponibilidad:</span>
                <p>{viewDetailModal.diasPorSemana} días por semana ({viewDetailModal.duracionMinutos} min/sesión) • Horario: {viewDetailModal.horarioPreferido || "Flexible"}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-primary block">Restricciones declaradas:</span>
                <p>{viewDetailModal.lesionesReportadas || "Ninguna reportada"}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-primary block">Alimentación declarada:</span>
                <p>{viewDetailModal.preferenciaAlimenticia || "Omnívoro"} • {viewDetailModal.numeroComidasDia || 3} comidas/día • {viewDetailModal.consumoAguaLitros || 2.5} L agua • Alergias: {viewDetailModal.alergiasDeclaradas || "Ninguna"}</p>
              </div>

              {viewDetailModal.observaciones && (
                <div className="space-y-1">
                  <span className="font-bold text-primary block">Observaciones:</span>
                  <p>{viewDetailModal.observaciones}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-base-200 flex justify-end">
              <button onClick={() => setViewDetailModal(null)} className="btn btn-ghost btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
