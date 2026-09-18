"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  AlertCircle,
  List,
  History,
  Phone,
  ArrowRightLeft,
  X,
  Loader2,
  CalendarDays,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  getSesionesCalendarioPersonalizado,
  reprogramarSesionPersonalizada,
  cancelarSesionPersonalizada,
  EventoSesionCalendario,
} from "@/app/actions/periodos-personalizados";
import { getAvailableTrainers } from "@/app/actions/asignacion-entrenador";

interface CalendarioPersonalizadoViewProps {
  socioId?: string;
  socioNombre?: string;
  canManage?: boolean;
}

type ViewMode = "semana" | "dia" | "mes" | "lista";

export default function CalendarioPersonalizadoView({
  socioId,
  socioNombre,
  canManage = true,
}: CalendarioPersonalizadoViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Datos
  const [sesiones, setSesiones] = useState<EventoSesionCalendario[]>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; nombres: string; apellidos: string | null; rol: string }>>([]);

  // Filtros
  const [selectedTrainer, setSelectedTrainer] = useState<string>("TODOS");
  const [selectedSocioFilter, setSelectedSocioFilter] = useState<string>(socioId || "TODOS");
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string>("VIGENTES");

  // Modal de Detalle
  const [selectedSession, setSelectedSession] = useState<EventoSesionCalendario | null>(null);

  // Modales de Acción (H4)
  const [sessionToReschedule, setSessionToReschedule] = useState<EventoSesionCalendario | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    nuevaFecha: "",
    nuevaHoraInicio: "",
    duracionMinutos: 60,
    nuevoEntrenadorId: "",
    motivoReprogramacion: "",
  });
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [sessionToCancel, setSessionToCancel] = useState<EventoSesionCalendario | null>(null);
  const [cancelForm, setCancelForm] = useState<{
    tipoCancelacion: "CANCELADA_CLIENTE" | "CANCELADA_ENTRENADOR" | "CANCELADA_GIMNASIO";
    motivoCancelacion: string;
  }>({
    tipoCancelacion: "CANCELADA_CLIENTE",
    motivoCancelacion: "",
  });
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Cargar lista de entrenadores al montar
  useEffect(() => {
    async function loadTrainers() {
      try {
        const res = await getAvailableTrainers();
        if (res.success && res.entrenadores) {
          setTrainers(res.entrenadores);
        }
      } catch (err) {
        console.error("Error al cargar entrenadores:", err);
      }
    }
    loadTrainers();
  }, []);

  // Calcular rango de fechas según vista actual
  const dateRange = useMemo(() => {
    if (viewMode === "dia") {
      const dStr = format(currentDate, "yyyy-MM-dd");
      return { fechaDesde: dStr, fechaHasta: dStr };
    }
    if (viewMode === "semana" || viewMode === "lista") {
      // Semana inicia en Lunes (weekStartsOn: 1)
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        fechaDesde: format(start, "yyyy-MM-dd"),
        fechaHasta: format(end, "yyyy-MM-dd"),
      };
    }
    if (viewMode === "mes") {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return {
        fechaDesde: format(start, "yyyy-MM-dd"),
        fechaHasta: format(end, "yyyy-MM-dd"),
      };
    }
    const dStr = format(currentDate, "yyyy-MM-dd");
    return { fechaDesde: dStr, fechaHasta: dStr };
  }, [currentDate, viewMode]);

  // Cargar sesiones
  const fetchSesiones = async () => {
    setLoading(true);
    try {
      const res = await getSesionesCalendarioPersonalizado({
        fechaDesde: dateRange.fechaDesde,
        fechaHasta: dateRange.fechaHasta,
        socioId: selectedSocioFilter === "TODOS" ? undefined : selectedSocioFilter,
        entrenadorId: selectedTrainer === "TODOS" ? undefined : selectedTrainer,
        estado: selectedEstadoFilter,
        soloVigentes: selectedEstadoFilter === "VIGENTES",
      });

      if (res.success && res.sesiones) {
        setSesiones(res.sesiones);
      } else {
        toast.error(res.error || "No se pudieron cargar las sesiones del calendario.");
        setSesiones([]);
      }
    } catch (err: any) {
      toast.error("Error de conexión al cargar sesiones.");
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSesiones();
  }, [dateRange, selectedTrainer, selectedSocioFilter, selectedEstadoFilter]);

  // Navegación temporal
  const handlePrev = () => {
    if (viewMode === "dia") setCurrentDate((d) => subDays(d, 1));
    else if (viewMode === "semana" || viewMode === "lista") setCurrentDate((d) => subWeeks(d, 1));
    else if (viewMode === "mes") setCurrentDate((d) => subMonths(d, 1));
  };

  const handleNext = () => {
    if (viewMode === "dia") setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === "semana" || viewMode === "lista") setCurrentDate((d) => addWeeks(d, 1));
    else if (viewMode === "mes") setCurrentDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Título del rango actual
  const currentRangeLabel = useMemo(() => {
    if (viewMode === "dia") {
      return format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
    }
    if (viewMode === "semana" || viewMode === "lista") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d 'de' MMM", { locale: es })} – ${format(end, "d 'de' MMM, yyyy", { locale: es })}`;
    }
    if (viewMode === "mes") {
      return format(currentDate, "MMMM 'de' yyyy", { locale: es });
    }
    return "";
  }, [currentDate, viewMode]);

  // Días de la semana para la vista semanal (Lunes a Domingo)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  // Días del mes para la vista mensual
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }, [currentDate]);

  // Helper para agrupar sesiones por fecha "YYYY-MM-DD"
  const sesionesByDate = useMemo(() => {
    const map = new Map<string, EventoSesionCalendario[]>();
    sesiones.forEach((s) => {
      const arr = map.get(s.fecha) || [];
      arr.push(s);
      map.set(s.fecha, arr);
    });
    return map;
  }, [sesiones]);

  // Manejo de Reprogramación
  const handleOpenReschedule = (session: EventoSesionCalendario) => {
    setSelectedSession(null);
    setSessionToReschedule(session);
    setRescheduleError(null);
    setRescheduleForm({
      nuevaFecha: session.fecha,
      nuevaHoraInicio: session.horaInicio,
      duracionMinutos: session.duracionMinutos,
      nuevoEntrenadorId: session.entrenadorId,
      motivoReprogramacion: "",
    });
  };

  const handleConfirmReschedule = async () => {
    if (!sessionToReschedule) return;
    if (!rescheduleForm.nuevaFecha) {
      setRescheduleError("Debes seleccionar una nueva fecha.");
      return;
    }
    if (!rescheduleForm.nuevaHoraInicio) {
      setRescheduleError("Debes seleccionar una nueva hora.");
      return;
    }
    if (!rescheduleForm.motivoReprogramacion || rescheduleForm.motivoReprogramacion.trim().length < 3) {
      setRescheduleError("El motivo de reprogramación debe tener al menos 3 caracteres.");
      return;
    }

    setRescheduleError(null);
    startTransition(async () => {
      try {
        const res = await reprogramarSesionPersonalizada({
          sesionId: sessionToReschedule.id,
          nuevaFecha: rescheduleForm.nuevaFecha,
          nuevaHoraInicio: rescheduleForm.nuevaHoraInicio,
          duracionMinutos: rescheduleForm.duracionMinutos,
          nuevoEntrenadorId: rescheduleForm.nuevoEntrenadorId !== sessionToReschedule.entrenadorId ? rescheduleForm.nuevoEntrenadorId : undefined,
          motivoReprogramacion: rescheduleForm.motivoReprogramacion.trim(),
        });

        if (res.success) {
          toast.success("Sesión reprogramada correctamente.");
          setSessionToReschedule(null);
          fetchSesiones();
        } else {
          setRescheduleError(res.error || "No se pudo reprogramar la sesión.");
        }
      } catch (err: any) {
        setRescheduleError("Error inesperado al conectar con el servidor.");
      }
    });
  };

  // Manejo de Cancelación
  const handleOpenCancel = (session: EventoSesionCalendario) => {
    setSelectedSession(null);
    setSessionToCancel(session);
    setCancelError(null);
    setCancelForm({
      tipoCancelacion: "CANCELADA_CLIENTE",
      motivoCancelacion: "",
    });
  };

  const handleConfirmCancel = async () => {
    if (!sessionToCancel) return;
    if (!cancelForm.motivoCancelacion || cancelForm.motivoCancelacion.trim().length < 3) {
      setCancelError("El motivo de cancelación debe tener al menos 3 caracteres.");
      return;
    }

    setCancelError(null);
    startTransition(async () => {
      try {
        const res = await cancelarSesionPersonalizada({
          sesionId: sessionToCancel.id,
          tipoCancelacion: cancelForm.tipoCancelacion,
          motivoCancelacion: cancelForm.motivoCancelacion.trim(),
        });

        if (res.success) {
          toast.success("Sesión cancelada correctamente (registro preservado).");
          setSessionToCancel(null);
          fetchSesiones();
        } else {
          setCancelError(res.error || "No se pudo cancelar la sesión.");
        }
      } catch (err: any) {
        setCancelError("Error inesperado al conectar con el servidor.");
      }
    });
  };

  // Helper de badges por estado
  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case "PROGRAMADA":
        return "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30";
      case "COMPLETADA":
        return "bg-blue-500/15 text-blue-600 border border-blue-500/30";
      case "CANCELADA_CLIENTE":
      case "CANCELADA_ENTRENADOR":
      case "CANCELADA_GIMNASIO":
        return "bg-rose-500/15 text-rose-600 border border-rose-500/30";
      case "REPROGRAMADA":
        return "bg-amber-500/15 text-amber-600 border border-amber-500/30";
      case "NO_ASISTIO":
        return "bg-slate-500/15 text-slate-600 border border-slate-500/30";
      default:
        return "bg-base-300 text-base-content";
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case "PROGRAMADA":
        return "Programada";
      case "COMPLETADA":
        return "Completada";
      case "CANCELADA_CLIENTE":
        return "Cancelada (Cliente)";
      case "CANCELADA_ENTRENADOR":
        return "Cancelada (Entrenador)";
      case "CANCELADA_GIMNASIO":
        return "Cancelada (Gimnasio)";
      case "REPROGRAMADA":
        return "Reprogramada";
      case "NO_ASISTIO":
        return "No Asistió";
      default:
        return estado;
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden space-y-0">
      {/* 1. Barra Superior / Controles del Calendario */}
      <div className="p-4 md:p-5 bg-base-200/40 border-b border-base-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Navegación y Rótulo */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center bg-base-100 rounded-xl border border-base-300 p-1 shadow-xs">
            <button
              onClick={handlePrev}
              className="btn btn-ghost btn-xs btn-square"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="btn btn-ghost btn-xs px-2.5 font-bold"
              title="Ir a la fecha actual"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="btn btn-ghost btn-xs btn-square"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-black text-base md:text-lg text-base-content capitalize flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <span>{currentRangeLabel}</span>
          </h3>
        </div>

        {/* Selector de Vistas y Botón de Recarga */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
          <div className="join bg-base-100 p-1 rounded-xl border border-base-300 shadow-xs">
            <button
              onClick={() => setViewMode("dia")}
              className={`join-item btn btn-xs ${viewMode === "dia" ? "btn-primary font-bold shadow-xs" : "btn-ghost"}`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode("semana")}
              className={`join-item btn btn-xs ${viewMode === "semana" ? "btn-primary font-bold shadow-xs" : "btn-ghost"}`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode("mes")}
              className={`join-item btn btn-xs ${viewMode === "mes" ? "btn-primary font-bold shadow-xs" : "btn-ghost"}`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode("lista")}
              className={`join-item btn btn-xs ${viewMode === "lista" ? "btn-primary font-bold shadow-xs" : "btn-ghost"}`}
            >
              <List className="w-3.5 h-3.5" /> Agenda
            </button>
          </div>

          <button
            onClick={fetchSesiones}
            disabled={loading}
            className="btn btn-ghost btn-sm btn-square"
            title="Refrescar calendario"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros */}
      <div className="p-3 md:px-5 md:py-3 bg-base-200/20 border-b border-base-200 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-base-content/70">
          <Filter className="w-3.5 h-3.5 text-primary" /> Filtros:
        </div>

        {/* Filtro Entrenador */}
        <div className="flex items-center gap-1.5">
          <label className="text-base-content/60 font-semibold">Entrenador:</label>
          <select
            value={selectedTrainer}
            onChange={(e) => setSelectedTrainer(e.target.value)}
            className="select select-bordered select-xs rounded-lg font-medium"
          >
            <option value="TODOS">Todos los entrenadores</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombres} {t.apellidos || ""} ({t.rol || "Instructor"})
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Socio */}
        {socioId ? (
          <div className="flex items-center gap-1.5">
            <label className="text-base-content/60 font-semibold">Socio:</label>
            <select
              value={selectedSocioFilter}
              onChange={(e) => setSelectedSocioFilter(e.target.value)}
              className="select select-bordered select-xs rounded-lg font-medium"
            >
              <option value={socioId}>{socioNombre ? `Solo ${socioNombre}` : "Socio Actual"}</option>
              <option value="TODOS">Todos los socios</option>
            </select>
          </div>
        ) : null}

        {/* Filtro Estado */}
        <div className="flex items-center gap-1.5">
          <label className="text-base-content/60 font-semibold">Estado:</label>
          <select
            value={selectedEstadoFilter}
            onChange={(e) => setSelectedEstadoFilter(e.target.value)}
            className="select select-bordered select-xs rounded-lg font-medium"
          >
            <option value="VIGENTES">Sesiones Activas (Programadas)</option>
            <option value="TODOS">Todos los estados</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="CANCELADAS">Canceladas</option>
            <option value="REPROGRAMADA">Reprogramadas (Histórico)</option>
          </select>
        </div>

        {/* Contador de eventos */}
        <div className="ml-auto text-[11px] font-bold text-base-content/60">
          Total: <span className="text-primary font-black">{sesiones.length}</span> sesión(es)
        </div>
      </div>

      {/* 3. Contenido del Calendario según Vista */}
      <div className="p-3 md:p-5 bg-base-100 min-h-[480px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-base-content/60 font-semibold">Cargando sesiones del calendario...</p>
          </div>
        ) : sesiones.length === 0 && viewMode === "lista" ? (
          <div className="p-12 text-center space-y-3 bg-base-200/30 rounded-2xl border border-dashed border-base-300">
            <CalendarIcon className="w-10 h-10 mx-auto text-base-content/30" />
            <h4 className="font-bold text-sm text-base-content">No hay sesiones para el rango seleccionado</h4>
            <p className="text-xs text-base-content/60 max-w-sm mx-auto">
              No se encontraron sesiones {selectedEstadoFilter === "VIGENTES" ? "activas" : ""} en este periodo con los filtros aplicados.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA 1: SEMANA (Cuadrícula de 7 columnas Lunes a Domingo) */}
            {viewMode === "semana" && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const daySessions = sesionesByDate.get(dateKey) || [];
                  const today = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[380px] ${
                        today
                          ? "bg-primary/5 border-primary/40 shadow-xs"
                          : "bg-base-200/30 border-base-200"
                      }`}
                    >
                      {/* Cabecera del día */}
                      <div
                        className={`p-3 border-b text-center rounded-t-2xl ${
                          today
                            ? "bg-primary text-primary-content font-black"
                            : "bg-base-200/60 border-base-200"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider block font-bold">
                          {format(day, "EEE", { locale: es })}
                        </span>
                        <span className="text-sm font-black block">
                          {format(day, "d MMM", { locale: es })}
                        </span>
                        {today && (
                          <span className="badge badge-xs bg-white text-primary font-black uppercase tracking-wider mt-1">
                            Hoy
                          </span>
                        )}
                      </div>

                      {/* Lista de eventos del día */}
                      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                        {daySessions.length === 0 ? (
                          <div className="h-full flex items-center justify-center p-4 text-center">
                            <span className="text-[11px] text-base-content/40 font-medium">
                              Libre
                            </span>
                          </div>
                        ) : (
                          daySessions.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => setSelectedSession(s)}
                              className="p-2.5 bg-base-100 rounded-xl border border-base-200 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all space-y-1.5 group"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-black text-xs text-primary flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {s.horaInicio}
                                </span>
                                <span className="text-[10px] text-base-content/60 font-semibold">
                                  {s.duracionMinutos}m
                                </span>
                              </div>

                              <div className="text-xs font-bold text-base-content line-clamp-1 group-hover:text-primary transition-colors">
                                🏋️ {s.socioNombre}
                              </div>

                              <div className="text-[11px] text-base-content/70 line-clamp-1 flex items-center gap-1">
                                <User className="w-3 h-3 shrink-0 opacity-70" />
                                <span>{s.entrenadorNombre}</span>
                              </div>

                              <div className="pt-1 flex items-center justify-between">
                                <span className={`badge badge-xs px-2 font-bold uppercase tracking-wider ${getBadgeStyle(s.estado)}`}>
                                  {getEstadoLabel(s.estado)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA 2: DÍA (Vista diaria enfocada) */}
            {viewMode === "dia" && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="p-4 bg-base-200/40 rounded-2xl border border-base-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-base text-base-content capitalize">
                      {format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </h4>
                    <p className="text-xs text-base-content/70">
                      {sesiones.length} sesión(es) agendada(s) para este día
                    </p>
                  </div>
                  {isToday(currentDate) && (
                    <span className="badge badge-primary font-black uppercase text-xs">Hoy</span>
                  )}
                </div>

                {sesiones.length === 0 ? (
                  <div className="p-12 text-center space-y-2 bg-base-200/20 rounded-2xl border border-dashed border-base-300">
                    <Clock className="w-8 h-8 mx-auto text-base-content/30" />
                    <p className="text-sm font-bold text-base-content">No hay sesiones para este día.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sesiones.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSession(s)}
                        className="p-4 bg-base-100 rounded-2xl border border-base-200 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex flex-col items-center justify-center shrink-0">
                            <span className="font-black text-sm">{s.horaInicio}</span>
                            <span className="text-[10px] font-bold opacity-75">{s.horaFin}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-base text-base-content group-hover:text-primary transition-colors">
                                🏋️ {s.socioNombre}
                              </h5>
                              <span className="badge badge-sm badge-ghost text-[10px] font-bold">
                                #{s.socioCodigo}
                              </span>
                            </div>
                            <div className="text-xs text-base-content/70 flex items-center gap-3">
                              <span className="flex items-center gap-1 font-medium">
                                <User className="w-3.5 h-3.5 text-secondary" /> {s.entrenadorNombre} ({s.entrenadorRol})
                              </span>
                              <span>•</span>
                              <span>⏱ {s.duracionMinutos} minutos</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          <span className={`badge badge-sm px-3 py-1 font-black uppercase tracking-wider ${getBadgeStyle(s.estado)}`}>
                            {getEstadoLabel(s.estado)}
                          </span>
                          <button className="btn btn-primary btn-xs btn-outline">
                            Ver Detalle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 3: MES (Grilla mensual compacta) */}
            {viewMode === "mes" && (
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-2 text-center font-bold text-xs text-base-content/70 uppercase">
                  <div>Lun</div>
                  <div>Mar</div>
                  <div>Mié</div>
                  <div>Jue</div>
                  <div>Vie</div>
                  <div>Sáb</div>
                  <div>Dom</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {/* Días vacíos para alinear el inicio del mes */}
                  {Array.from({ length: (startOfMonth(currentDate).getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[90px] bg-base-200/20 rounded-xl opacity-30 border border-transparent" />
                  ))}

                  {monthDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const daySessions = sesionesByDate.get(dateKey) || [];
                    const today = isToday(day);

                    return (
                      <div
                        key={dateKey}
                        onClick={() => {
                          setCurrentDate(day);
                          setViewMode("dia");
                        }}
                        className={`min-h-[90px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          today
                            ? "bg-primary/5 border-primary/50 shadow-xs"
                            : "bg-base-100 border-base-200 hover:border-primary/40 hover:bg-base-200/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${today ? "text-primary" : "text-base-content"}`}>
                            {format(day, "d")}
                          </span>
                          {daySessions.length > 0 && (
                            <span className="badge badge-xs badge-primary font-black">
                              {daySessions.length}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 my-1">
                          {daySessions.slice(0, 2).map((s) => (
                            <div
                              key={s.id}
                              className="text-[10px] font-bold truncate px-1.5 py-0.5 rounded bg-base-200/80 text-base-content/80 flex items-center gap-1"
                              title={`${s.horaInicio} - ${s.socioNombre}`}
                            >
                              <span className="text-primary font-black">{s.horaInicio}</span>
                              <span className="truncate">{s.socioNombre}</span>
                            </div>
                          ))}
                          {daySessions.length > 2 && (
                            <div className="text-[9px] text-base-content/50 font-bold pl-1">
                              +{daySessions.length - 2} más...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA 4: LISTA / AGENDA (Ideal para móviles y lista secuencial) */}
            {viewMode === "lista" && (
              <div className="space-y-4 max-w-3xl mx-auto">
                {Array.from(sesionesByDate.entries()).map(([dateStr, items]) => {
                  const dayObj = new Date(`${dateStr}T12:00:00`);
                  return (
                    <div key={dateStr} className="space-y-2">
                      <div className="sticky top-0 bg-base-100/90 backdrop-blur-xs py-1.5 px-3 rounded-lg border-b border-base-200 flex items-center justify-between font-bold text-xs text-base-content/80">
                        <span className="capitalize flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-primary" />
                          {format(dayObj, "EEEE d 'de' MMMM", { locale: es })}
                        </span>
                        <span className="badge badge-sm badge-ghost font-bold">
                          {items.length} sesión(es)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {items.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSession(s)}
                            className="p-3.5 bg-base-100 rounded-xl border border-base-200 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center shrink-0">
                                <span className="font-black text-xs">{s.horaInicio}</span>
                                <span className="text-[9px] font-semibold opacity-75">{s.horaFin}</span>
                              </div>
                              <div className="space-y-0.5">
                                <h5 className="font-black text-sm text-base-content line-clamp-1">
                                  🏋️ {s.socioNombre}
                                </h5>
                                <p className="text-xs text-base-content/70 flex items-center gap-2">
                                  <span>👤 {s.entrenadorNombre}</span>
                                  <span>•</span>
                                  <span>⏱ {s.duracionMinutos}m</span>
                                </p>
                              </div>
                            </div>

                            <span className={`badge badge-sm px-2.5 py-1 font-bold uppercase tracking-wider ${getBadgeStyle(s.estado)}`}>
                              {getEstadoLabel(s.estado)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DETALLE DE SESIÓN                                                */}
      {/* ========================================================================= */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-5 border-b border-base-200 bg-base-200/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-base-content">
                    Detalle de Sesión Personalizada
                  </h3>
                  <span className="text-[11px] text-base-content/60 font-medium">
                    ID: {selectedSession.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Badge de Estado Principal */}
              <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl border border-base-200">
                <span className="font-bold text-base-content/70 uppercase tracking-wider text-[10px]">
                  Estado Actual
                </span>
                <span className={`badge badge-sm px-3 py-1 font-black uppercase tracking-wider ${getBadgeStyle(selectedSession.estado)}`}>
                  {getEstadoLabel(selectedSession.estado)}
                </span>
              </div>

              {/* Información del Socio y Entrenador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-base-200/30 rounded-xl border border-base-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
                    🏋️ Socio
                  </span>
                  <p className="font-black text-sm text-base-content">{selectedSession.socioNombre}</p>
                  <p className="text-base-content/60">Código: #{selectedSession.socioCodigo}</p>
                  {selectedSession.socioTelefono && (
                    <p className="text-base-content/60 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedSession.socioTelefono}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-base-200/30 rounded-xl border border-base-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">
                    👤 Entrenador
                  </span>
                  <p className="font-black text-sm text-base-content">{selectedSession.entrenadorNombre}</p>
                  <p className="text-base-content/60">{selectedSession.entrenadorRol}</p>
                  {selectedSession.entrenadorTelefono && (
                    <p className="text-base-content/60 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedSession.entrenadorTelefono}
                    </p>
                  )}
                </div>
              </div>

              {/* Horario y Duración */}
              <div className="p-3 bg-base-200/30 rounded-xl border border-base-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-base-content/70 tracking-wider block">
                  📅 Fecha y Horario
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-base-content/60 block">Fecha:</span>
                    <strong className="text-base-content capitalize">
                      {selectedSession.diaSemana}, {selectedSession.fecha}
                    </strong>
                  </div>
                  <div>
                    <span className="text-base-content/60 block">Horario Acordado:</span>
                    <strong className="text-base-content">
                      {selectedSession.horaInicio} – {selectedSession.horaFin} ({selectedSession.duracionMinutos} min)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Trazabilidad e Historial */}
              {selectedSession.esReprogramada && selectedSession.sesionOriginalResumen && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                    <History className="w-4 h-4" /> Sesión Reprogramada
                  </div>
                  <p className="text-amber-800">
                    Proviene de la sesión original del {selectedSession.sesionOriginalResumen.fecha} a las {selectedSession.sesionOriginalResumen.horaInicio}-{selectedSession.sesionOriginalResumen.horaFin}.
                  </p>
                  {selectedSession.motivoReprogramacion && (
                    <p className="text-amber-900 font-medium pt-1">
                      <strong>Motivo:</strong> {selectedSession.motivoReprogramacion}
                    </p>
                  )}
                </div>
              )}

              {selectedSession.reprogramadaEnSesionId && selectedSession.sesionDerivadaResumen && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                    <ArrowRightLeft className="w-4 h-4" /> Reubicada en Nueva Sesión
                  </div>
                  <p className="text-amber-800">
                    Esta sesión fue trasladada al {selectedSession.sesionDerivadaResumen.fecha} a las {selectedSession.sesionDerivadaResumen.horaInicio}-{selectedSession.sesionDerivadaResumen.horaFin}.
                  </p>
                  {selectedSession.motivoReprogramacion && (
                    <p className="text-amber-900 font-medium pt-1">
                      <strong>Motivo:</strong> {selectedSession.motivoReprogramacion}
                    </p>
                  )}
                </div>
              )}

              {selectedSession.motivoCancelacion && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                    <XCircle className="w-4 h-4" /> Cancelación Registrada
                  </div>
                  <p className="text-rose-900 font-medium">
                    <strong>Motivo:</strong> {selectedSession.motivoCancelacion}
                  </p>
                </div>
              )}

              {/* Mensaje para sesiones históricas */}
              {selectedSession.estado !== "PROGRAMADA" && (
                <div className="p-3 bg-base-200 rounded-xl border border-base-300 text-base-content/70 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-base-content/50" />
                  <span>Esta sesión es histórica / no activa y se conserva únicamente con fines de auditoría y trazabilidad.</span>
                </div>
              )}
            </div>

            {/* Footer con Acciones H4 */}
            <div className="p-4 border-t border-base-200 bg-base-200/40 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setSelectedSession(null)}
                className="btn btn-ghost btn-sm"
              >
                Cerrar
              </button>

              {selectedSession.estado === "PROGRAMADA" && canManage && (
                <>
                  <button
                    onClick={() => handleOpenCancel(selectedSession)}
                    className="btn btn-outline btn-error btn-sm gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                  <button
                    onClick={() => handleOpenReschedule(selectedSession)}
                    className="btn btn-primary btn-sm gap-1.5 font-bold shadow-xs"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Reprogramar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REPROGRAMAR SESIÓN (H4)                                          */}
      {/* ========================================================================= */}
      {sessionToReschedule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-base-200 bg-base-200/50">
              <h3 className="font-black text-base flex items-center gap-2 text-base-content">
                <ArrowRightLeft className="w-5 h-5 text-primary" /> Reprogramar Sesión
              </h3>
              <button
                onClick={() => setSessionToReschedule(null)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-base-200/50 rounded-xl space-y-1">
                <p className="font-bold text-base-content">
                  Socio: {sessionToReschedule.socioNombre}
                </p>
                <p className="text-base-content/70">
                  Horario actual: {sessionToReschedule.fecha} ({sessionToReschedule.horaInicio} - {sessionToReschedule.horaFin})
                </p>
              </div>

              {rescheduleError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="label-text font-bold block mb-1">Nueva Fecha:</label>
                  <input
                    type="date"
                    value={rescheduleForm.nuevaFecha}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, nuevaFecha: e.target.value })}
                    className="input input-bordered input-sm w-full rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text font-bold block mb-1">Nueva Hora Inicio:</label>
                    <input
                      type="time"
                      value={rescheduleForm.nuevaHoraInicio}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, nuevaHoraInicio: e.target.value })}
                      className="input input-bordered input-sm w-full rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="label-text font-bold block mb-1">Duración (min):</label>
                    <input
                      type="number"
                      step={15}
                      min={15}
                      max={180}
                      value={rescheduleForm.duracionMinutos}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, duracionMinutos: Number(e.target.value) })}
                      className="input input-bordered input-sm w-full rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-text font-bold block mb-1">Entrenador Responsable:</label>
                  <select
                    value={rescheduleForm.nuevoEntrenadorId}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, nuevoEntrenadorId: e.target.value })}
                    className="select select-bordered select-sm w-full rounded-xl font-medium"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombres} {t.apellidos || ""} ({t.rol || "Instructor"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-text font-bold block mb-1">
                    Motivo de la Reprogramación <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={2}
                    value={rescheduleForm.motivoReprogramacion}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, motivoReprogramacion: e.target.value })}
                    placeholder="Ej. Solicitud del cliente por viaje de trabajo"
                    className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-base-200 bg-base-200/40 flex justify-end gap-2">
              <button
                onClick={() => setSessionToReschedule(null)}
                disabled={isPending}
                className="btn btn-ghost btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={isPending}
                className="btn btn-primary btn-sm font-bold gap-1.5"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                Confirmar Reprogramación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CANCELAR SESIÓN (H4)                                             */}
      {/* ========================================================================= */}
      {sessionToCancel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-base-200 bg-base-200/50">
              <h3 className="font-black text-base flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" /> Cancelar Sesión
              </h3>
              <button
                onClick={() => setSessionToCancel(null)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-base-200/50 rounded-xl space-y-1">
                <p className="font-bold text-base-content">
                  Socio: {sessionToCancel.socioNombre}
                </p>
                <p className="text-base-content/70">
                  Fecha: {sessionToCancel.fecha} ({sessionToCancel.horaInicio} - {sessionToCancel.horaFin})
                </p>
              </div>

              {cancelError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="label-text font-bold block mb-1">Tipo de Cancelación:</label>
                  <select
                    value={cancelForm.tipoCancelacion}
                    onChange={(e) => setCancelForm({ ...cancelForm, tipoCancelacion: e.target.value as any })}
                    className="select select-bordered select-sm w-full rounded-xl font-medium"
                  >
                    <option value="CANCELADA_CLIENTE">Cancelada por el Cliente / Socio</option>
                    <option value="CANCELADA_ENTRENADOR">Cancelada por el Entrenador</option>
                    <option value="CANCELADA_GIMNASIO">Cancelada por el Gimnasio (Fuerza mayor)</option>
                  </select>
                </div>

                <div>
                  <label className="label-text font-bold block mb-1">
                    Motivo de Cancelación <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    value={cancelForm.motivoCancelacion}
                    onChange={(e) => setCancelForm({ ...cancelForm, motivoCancelacion: e.target.value })}
                    placeholder="Describe el motivo de la cancelación..."
                    className="textarea textarea-bordered textarea-sm w-full rounded-xl"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-base-200/60 rounded-xl text-[11px] text-base-content/60 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                <span>La sesión no será eliminada; permanecerá en el historial con fines de auditoría.</span>
              </div>
            </div>

            <div className="p-4 border-t border-base-200 bg-base-200/40 flex justify-end gap-2">
              <button
                onClick={() => setSessionToCancel(null)}
                disabled={isPending}
                className="btn btn-ghost btn-sm"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isPending}
                className="btn btn-error btn-sm font-bold gap-1.5 text-white"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
