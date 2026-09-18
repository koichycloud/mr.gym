"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
  Sliders,
  PowerOff,
  CalendarDays,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  previewPeriodoPersonalizado,
  confirmarPeriodoPersonalizado,
  cambiarEstadoPeriodoPersonalizado,
  actualizarAcuerdoPeriodoPersonalizado,
  PreviewPeriodoResultado,
} from "@/app/actions/periodos-personalizados";
import { getAvailableTrainers } from "@/app/actions/asignacion-entrenador";
import { DIAS_SEMANA_VALIDOS, DiaSemana } from "@/lib/personalized-training-generator";

interface GestionPeriodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  socioId: string;
  socioNombre: string;
  periodoActivo: any | null;
  onSuccess: () => void;
  initialMode?: "crear" | "editar" | "estado";
}

const DURACIONES_VALIDAS = [45, 60, 75, 90, 120];

export default function GestionPeriodoModal({
  isOpen,
  onClose,
  socioId,
  socioNombre,
  periodoActivo,
  onSuccess,
  initialMode = "crear",
}: GestionPeriodoModalProps) {
  const [mode, setMode] = useState<"crear" | "editar" | "estado">(
    periodoActivo ? initialMode : "crear"
  );
  const [trainers, setTrainers] = useState<Array<{ id: string; nombres: string; apellidos: string | null; rol: string }>>([]);
  const [isPending, startTransition] = useTransition();

  // Formulario Crear / Editar
  const [entrenadorId, setEntrenadorId] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [mesesPeriodo, setMesesPeriodo] = useState<number>(1);
  const [frecuenciaRecomendada, setFrecuenciaRecomendada] = useState<number>(3);
  const [frecuenciaAcordada, setFrecuenciaAcordada] = useState<number>(3);
  const [diasAcordados, setDiasAcordados] = useState<DiaSemana[]>(["LUNES", "MIERCOLES", "VIERNES"]);
  const [horaInicioAcordada, setHoraInicioAcordada] = useState<string>("08:00");
  const [duracionMinutos, setDuracionMinutos] = useState<number>(60);
  const [objetivoAcordado, setObjetivoAcordado] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [motivoCambio, setMotivoCambio] = useState<string>("");

  // Estado Modal Cambio de Estado
  const [nuevoEstado, setNuevoEstado] = useState<"ACTIVO" | "PAUSADO" | "FINALIZADO" | "CANCELADO">("ACTIVO");
  const [motivoEstado, setMotivoEstado] = useState<string>("");

  // Previsualización de sesiones y conflictos
  const [previewData, setPreviewData] = useState<PreviewPeriodoResultado | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Cargar entrenadores y valores iniciales
  useEffect(() => {
    async function loadTrainers() {
      try {
        const res = await getAvailableTrainers();
        if (res.success && res.entrenadores) {
          setTrainers(res.entrenadores);
          if (!entrenadorId && res.entrenadores.length > 0) {
            setEntrenadorId(res.entrenadores[0].id);
          }
        }
      } catch (err) {
        console.error("Error al cargar entrenadores:", err);
      }
    }
    if (isOpen) {
      loadTrainers();
    }
  }, [isOpen]);

  // Inicializar campos según periodo activo
  useEffect(() => {
    if (periodoActivo && isOpen) {
      setEntrenadorId(periodoActivo.entrenadorId || periodoActivo.entrenador?.id || "");
      setFechaInicio(periodoActivo.fechaInicio ? periodoActivo.fechaInicio.substring(0, 10) : "");
      setFechaFin(periodoActivo.fechaFin ? periodoActivo.fechaFin.substring(0, 10) : "");
      setMesesPeriodo(periodoActivo.mesesPeriodo || 1);
      setFrecuenciaRecomendada(periodoActivo.frecuenciaRecomendada || 3);
      setFrecuenciaAcordada(periodoActivo.frecuenciaAcordada || 3);
      setDiasAcordados(
        Array.isArray(periodoActivo.diasAcordados)
          ? (periodoActivo.diasAcordados as DiaSemana[])
          : ["LUNES", "MIERCOLES", "VIERNES"]
      );
      setHoraInicioAcordada(periodoActivo.horaInicioAcordada || "08:00");
      setDuracionMinutos(periodoActivo.duracionMinutos || 60);
      setObjetivoAcordado(periodoActivo.objetivoAcordado || "");
      setObservaciones(periodoActivo.observaciones || "");
      setNuevoEstado(periodoActivo.estado || "ACTIVO");
      setMode(initialMode);
    } else if (isOpen) {
      // Valores por defecto para nuevo periodo
      const today = new Date();
      const inOneMonth = new Date(today);
      inOneMonth.setMonth(today.getMonth() + 1);

      const y1 = today.getFullYear();
      const m1 = String(today.getMonth() + 1).padStart(2, "0");
      const d1 = String(today.getDate()).padStart(2, "0");

      const y2 = inOneMonth.getFullYear();
      const m2 = String(inOneMonth.getMonth() + 1).padStart(2, "0");
      const d2 = String(inOneMonth.getDate()).padStart(2, "0");

      setFechaInicio(`${y1}-${m1}-${d1}`);
      setFechaFin(`${y2}-${m2}-${d2}`);
      setMesesPeriodo(1);
      setFrecuenciaRecomendada(3);
      setFrecuenciaAcordada(3);
      setDiasAcordados(["LUNES", "MIERCOLES", "VIERNES"]);
      setHoraInicioAcordada("08:00");
      setDuracionMinutos(60);
      setObjetivoAcordado("");
      setObservaciones("");
      setMode("crear");
    }
  }, [isOpen, periodoActivo, initialMode]);

  // Manejo de cálculo de fecha fin a partir de meses
  const handleMesesChange = (meses: number) => {
    setMesesPeriodo(meses);
    if (fechaInicio) {
      const [y, m, d] = fechaInicio.split("-").map(Number);
      const start = new Date(y, m - 1, d);
      start.setMonth(start.getMonth() + meses);
      const y2 = start.getFullYear();
      const m2 = String(start.getMonth() + 1).padStart(2, "0");
      const d2 = String(start.getDate()).padStart(2, "0");
      setFechaFin(`${y2}-${m2}-${d2}`);
    }
  };

  const toggleDia = (dia: DiaSemana) => {
    if (diasAcordados.includes(dia)) {
      if (diasAcordados.length > 1) {
        const updated = diasAcordados.filter((d) => d !== dia);
        setDiasAcordados(updated);
        if (frecuenciaAcordada > updated.length) {
          setFrecuenciaAcordada(updated.length);
        }
      } else {
        toast.error("Debe conservar al menos un día acordado.");
      }
    } else {
      setDiasAcordados([...diasAcordados, dia]);
    }
  };

  // Previsualización interactiva de sesiones y conflictos
  const handleGenerarPreview = async () => {
    if (!socioId || !entrenadorId || !fechaInicio || !fechaFin) {
      toast.error("Complete el socio, entrenador y rango de fechas.");
      return;
    }
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await previewPeriodoPersonalizado({
        socioId,
        entrenadorId,
        fechaInicio,
        fechaFin,
        frecuenciaRecomendada,
        frecuenciaAcordada,
        diasAcordados,
        horaInicioAcordada,
        duracionMinutos,
      });

      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        setPreviewError(res.error || "No se pudo generar la previsualización.");
        setPreviewData(null);
      }
    } catch (err: any) {
      setPreviewError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Guardar creación de periodo
  const handleConfirmarCreacion = () => {
    if (diasAcordados.length === 0) {
      toast.error("Debe seleccionar al menos un día acordado.");
      return;
    }
    if (frecuenciaAcordada > diasAcordados.length) {
      toast.error(`La frecuencia acordada (${frecuenciaAcordada}) no puede superar los días seleccionados (${diasAcordados.length}).`);
      return;
    }

    startTransition(async () => {
      try {
        const res = await confirmarPeriodoPersonalizado({
          socioId,
          entrenadorId,
          fechaInicio,
          fechaFin,
          mesesPeriodo,
          frecuenciaRecomendada,
          frecuenciaAcordada,
          diasAcordados,
          horaInicioAcordada,
          duracionMinutos,
          objetivoAcordado: objetivoAcordado.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
        });

        if (res.success) {
          toast.success(`Periodo creado exitosamente con ${res.totalSesiones} sesiones.`);
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Error al crear el periodo.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error inesperado al guardar el periodo.");
      }
    });
  };

  // Guardar ajuste de acuerdo
  const handleConfirmarAjuste = () => {
    if (!periodoActivo?.id) return;
    if (!motivoCambio || motivoCambio.trim().length < 3) {
      toast.error("Debe ingresar un motivo para el ajuste del acuerdo (mín. 3 caracteres).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await actualizarAcuerdoPeriodoPersonalizado({
          periodoId: periodoActivo.id,
          frecuenciaRecomendada,
          frecuenciaAcordada,
          diasAcordados,
          horaInicioAcordada,
          duracionMinutos,
          objetivoAcordado: objetivoAcordado.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          motivoCambio: motivoCambio.trim(),
        });

        if (res.success) {
          toast.success(`Acuerdo actualizado exitosamente (${res.totalNuevasSesiones} sesiones generadas para el tramo futuro).`);
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Error al actualizar el acuerdo.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error inesperado al actualizar el acuerdo.");
      }
    });
  };

  // Guardar cambio de estado
  const handleConfirmarCambioEstado = () => {
    if (!periodoActivo?.id) return;

    startTransition(async () => {
      try {
        const res = await cambiarEstadoPeriodoPersonalizado({
          periodoId: periodoActivo.id,
          nuevoEstado,
          motivo: motivoEstado.trim() || undefined,
        });

        if (res.success) {
          toast.success(`Estado del periodo actualizado a ${res.estado}.`);
          onSuccess();
          onClose();
        } else {
          toast.error(res.error || "Error al cambiar estado del periodo.");
        }
      } catch (err: any) {
        toast.error(err.message || "Error al cambiar estado.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-base-100 border border-base-200 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-base-200 bg-base-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-base-content">
                {mode === "crear"
                  ? "Nuevo Periodo de Entrenamiento Personalizado"
                  : mode === "editar"
                  ? "Ajustar Acuerdo de Entrenamiento"
                  : "Estado del Periodo Personalizado"}
              </h3>
              <p className="text-xs text-base-content/70">
                Socio: <strong className="text-base-content">{socioNombre}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Modo si ya existe periodo */}
        {periodoActivo && (
          <div className="flex border-b border-base-200 bg-base-200/20 px-4 pt-2 gap-2 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setMode("editar")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                mode === "editar"
                  ? "border-primary text-primary"
                  : "border-transparent text-base-content/60 hover:text-base-content"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Ajustar Acuerdo
            </button>
            <button
              onClick={() => setMode("estado")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                mode === "estado"
                  ? "border-warning text-warning"
                  : "border-transparent text-base-content/60 hover:text-base-content"
              }`}
            >
              <PowerOff className="w-3.5 h-3.5" /> Cambiar Estado ({periodoActivo.estado})
            </button>
            <button
              onClick={() => setMode("crear")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                mode === "crear"
                  ? "border-secondary text-secondary"
                  : "border-transparent text-base-content/60 hover:text-base-content"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Contratar Nuevo Periodo
            </button>
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-5 flex-1">
          {/* MODO CAMBIAR ESTADO */}
          {mode === "estado" && periodoActivo && (
            <div className="space-y-4">
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl text-xs space-y-1 text-warning-content">
                <p className="font-bold flex items-center gap-1.5 text-warning">
                  <AlertTriangle className="w-4 h-4" /> Cambio de Estado Operativo
                </p>
                <p className="opacity-90">
                  Cambiar el estado preserva todas las sesiones y el historial intacto (Principio NO DELETE).
                </p>
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold">Estado del Periodo</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(["ACTIVO", "PAUSADO", "FINALIZADO", "CANCELADO"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNuevoEstado(st)}
                      className={`btn btn-sm font-bold ${
                        nuevoEstado === st
                          ? st === "ACTIVO"
                            ? "btn-success text-white"
                            : st === "PAUSADO"
                            ? "btn-warning text-white"
                            : st === "FINALIZADO"
                            ? "btn-info text-white"
                            : "btn-error text-white"
                          : "btn-outline btn-neutral"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold">Motivo del Cambio de Estado</label>
                <textarea
                  className="textarea textarea-bordered text-xs h-20"
                  placeholder="Explique el motivo (ej. Viaje temporal del socio, culminación anticipada, etc.)..."
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* MODO CREAR O EDITAR ACUERDO */}
          {(mode === "crear" || mode === "editar") && (
            <div className="space-y-5">
              {/* Sección 1: Entrenador y Vigencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-xs font-bold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-primary" /> Entrenador Responsable
                  </label>
                  <select
                    className="select select-bordered select-sm text-xs"
                    value={entrenadorId}
                    onChange={(e) => setEntrenadorId(e.target.value)}
                    disabled={mode === "editar"}
                  >
                    <option value="">Seleccione Entrenador</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombres} {t.apellidos || ""} ({t.rol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold">Meses Contratados</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 6, 12].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMesesChange(m)}
                        disabled={mode === "editar"}
                        className={`btn btn-xs flex-1 font-bold ${
                          mesesPeriodo === m ? "btn-primary text-white" : "btn-ghost border border-base-200"
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-info" /> Fecha Inicio
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-sm text-xs font-mono"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    disabled={mode === "editar"}
                  />
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-info" /> Fecha Fin
                  </label>
                  <input
                    type="date"
                    className="input input-bordered input-sm text-xs font-mono"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    disabled={mode === "editar"}
                  />
                </div>
              </div>

              {/* Sección 2: Frecuencia Recomendada vs Acordada */}
              <div className="p-4 bg-base-200/40 rounded-2xl border border-base-200 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-secondary flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Frecuencia y Acuerdo Operativo
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label text-xs font-bold text-base-content/80">
                      Frecuencia Recomendada (Técnica)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="7"
                        className="input input-bordered input-sm text-xs w-20 font-bold"
                        value={frecuenciaRecomendada}
                        onChange={(e) => setFrecuenciaRecomendada(Number(e.target.value))}
                      />
                      <span className="text-xs text-base-content/60">días/semana sugeridos</span>
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label text-xs font-bold text-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Frecuencia Acordada (Pactada)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="7"
                        className="input input-bordered input-sm text-xs w-20 font-bold border-primary text-primary"
                        value={frecuenciaAcordada}
                        onChange={(e) => setFrecuenciaAcordada(Number(e.target.value))}
                      />
                      <span className="text-xs text-base-content/80 font-semibold">días/semana a programar</span>
                    </div>
                  </div>
                </div>

                {/* Días Acordados */}
                <div className="space-y-1.5 pt-2 border-t border-base-300/40">
                  <label className="text-xs font-bold text-base-content/80 block">
                    Días Acordados ({diasAcordados.length} seleccionados):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_SEMANA_VALIDOS.map((dia) => {
                      const isSelected = diasAcordados.includes(dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => toggleDia(dia)}
                          className={`btn btn-xs font-bold transition-all ${
                            isSelected
                              ? "btn-secondary text-white shadow-sm"
                              : "btn-outline btn-neutral opacity-60 hover:opacity-100"
                          }`}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Horario y Duración */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-base-300/40">
                  <div className="form-control">
                    <label className="label text-xs font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Hora de Inicio
                    </label>
                    <input
                      type="time"
                      className="input input-bordered input-sm text-xs font-mono"
                      value={horaInicioAcordada}
                      onChange={(e) => setHoraInicioAcordada(e.target.value)}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label text-xs font-bold">Duración por Sesión</label>
                    <select
                      className="select select-bordered select-sm text-xs"
                      value={duracionMinutos}
                      onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                    >
                      {DURACIONES_VALIDAS.map((dur) => (
                        <option key={dur} value={dur}>
                          {dur} minutos
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Objetivo y Observaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label text-xs font-bold">Objetivo Acordado</label>
                  <input
                    type="text"
                    className="input input-bordered input-sm text-xs"
                    placeholder="Ej. Hipertrofia y fuerza funcional"
                    value={objetivoAcordado}
                    onChange={(e) => setObjetivoAcordado(e.target.value)}
                  />
                </div>

                {mode === "editar" ? (
                  <div className="form-control">
                    <label className="label text-xs font-bold text-warning flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Motivo del Ajuste (Obligatorio)
                    </label>
                    <input
                      type="text"
                      className="input input-bordered input-sm text-xs border-warning"
                      placeholder="Ej. Cambio de turno laboral del socio"
                      value={motivoCambio}
                      onChange={(e) => setMotivoCambio(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label text-xs font-bold">Observaciones</label>
                    <input
                      type="text"
                      className="input input-bordered input-sm text-xs"
                      placeholder="Notas adicionales..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Botón de Previsualización */}
              <div className="flex justify-between items-center p-3 bg-base-200/50 rounded-xl border border-base-200">
                <div className="text-xs text-base-content/70">
                  Valide colisiones y disponibilidad antes de confirmar.
                </div>
                <button
                  type="button"
                  onClick={handleGenerarPreview}
                  disabled={loadingPreview}
                  className="btn btn-outline btn-primary btn-xs gap-1.5 font-bold"
                >
                  {loadingPreview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Previsualizar Sesiones
                </button>
              </div>

              {/* Resultado de Previsualización */}
              {previewError && (
                <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {previewData && (
                <div className="p-4 bg-base-100 border border-primary/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Previsualización: {previewData.resumen.totalSesiones} sesiones generadas
                    </span>
                    {previewData.conflictos.length > 0 ? (
                      <span className="badge badge-error text-white font-bold text-[10px]">
                        {previewData.conflictos.length} Conflictos
                      </span>
                    ) : (
                      <span className="badge badge-success text-white font-bold text-[10px]">
                        Sin Conflictos
                      </span>
                    )}
                  </div>

                  {previewData.conflictos.length > 0 && (
                    <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs space-y-1.5 text-error">
                      <p className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Conflictos detectados:
                      </p>
                      <ul className="list-disc list-inside space-y-1 opacity-90">
                        {previewData.conflictos.map((c, idx) => (
                          <li key={idx}>{c.descripcion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs border border-base-200 rounded-xl p-2 bg-base-200/30 font-mono">
                    {previewData.sesiones.slice(0, 10).map((s, idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-base-200/50">
                        <span>{s.fecha} ({s.diaSemana})</span>
                        <span className="font-bold text-primary">{s.horaInicio} - {s.horaFin}</span>
                      </div>
                    ))}
                    {previewData.sesiones.length > 10 && (
                      <p className="text-[10px] text-center opacity-60 pt-1 font-sans">
                        ...y {previewData.sesiones.length - 10} sesiones adicionales dentro del periodo.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="p-4 border-t border-base-200 bg-base-200/30 flex justify-between items-center">
          <button onClick={onClose} className="btn btn-ghost btn-sm text-xs">
            Cancelar
          </button>

          {mode === "estado" && (
            <button
              onClick={handleConfirmarCambioEstado}
              disabled={isPending}
              className="btn btn-warning text-white btn-sm gap-2 font-bold shadow-sm"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Estado ({nuevoEstado})
            </button>
          )}

          {mode === "editar" && (
            <button
              onClick={handleConfirmarAjuste}
              disabled={isPending}
              className="btn btn-primary text-white btn-sm gap-2 font-bold shadow-sm"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Aplicar Nuevo Acuerdo
            </button>
          )}

          {mode === "crear" && (
            <button
              onClick={handleConfirmarCreacion}
              disabled={isPending}
              className="btn btn-primary text-white btn-sm gap-2 font-bold shadow-sm"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar y Generar Periodo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
