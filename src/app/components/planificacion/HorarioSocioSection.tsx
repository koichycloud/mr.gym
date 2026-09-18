"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  UserCheck,
  Phone,
  Edit,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  CalendarDays,
  PlusCircle,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  XCircle,
} from "lucide-react";
import CalendarioPersonalizadoView from "./CalendarioPersonalizadoView";
import GestionPeriodoModal from "./GestionPeriodoModal";
import { getPeriodoActivoSocio } from "@/app/actions/periodos-personalizados";

interface HorarioSocioSectionProps {
  socioId?: string;
  socioNombre?: string;
  perfilActivo: any | null;
  assignment: any | null;
  canManage: boolean;
  onOpenEditSchedule: () => void;
}

export default function HorarioSocioSection({
  socioId,
  socioNombre = "Socio",
  perfilActivo,
  assignment,
  canManage,
  onOpenEditSchedule,
}: HorarioSocioSectionProps) {
  const [showAgreementSummary, setShowAgreementSummary] = useState(true);
  const [periodoActivo, setPeriodoActivo] = useState<any | null>(null);
  const [loadingPeriodo, setLoadingPeriodo] = useState<boolean>(true);
  const [showGestionModal, setShowGestionModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"crear" | "editar" | "estado">("crear");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const loadPeriodo = useCallback(async () => {
    if (!socioId) return;
    setLoadingPeriodo(true);
    try {
      const res = await getPeriodoActivoSocio(socioId);
      if (res.success && res.data) {
        setPeriodoActivo(res.data);
      } else {
        setPeriodoActivo(null);
      }
    } catch (err) {
      console.error("Error al cargar periodo activo:", err);
    } finally {
      setLoadingPeriodo(false);
    }
  }, [socioId]);

  useEffect(() => {
    loadPeriodo();
  }, [loadPeriodo, refreshKey]);

  const handleOpenCrear = () => {
    setModalMode("crear");
    setShowGestionModal(true);
  };

  const handleOpenEditar = () => {
    setModalMode("editar");
    setShowGestionModal(true);
  };

  const handleOpenEstado = () => {
    setModalMode("estado");
    setShowGestionModal(true);
  };

  const handleModalSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  // Datos para renderizar
  const entrenadorObj = periodoActivo?.entrenador || assignment?.entrenador || perfilActivo?.entrenador;
  const entrenadorNombre = entrenadorObj
    ? `${entrenadorObj.nombres} ${entrenadorObj.apellidos || ""}`.trim()
    : "Sin entrenador asignado";
  const entrenadorTelefono = entrenadorObj?.telefono || null;
  const entrenadorRol = entrenadorObj?.rol || "Entrenador";

  const diasArray: string[] = Array.isArray(periodoActivo?.diasAcordados)
    ? periodoActivo.diasAcordados
    : Array.isArray(perfilActivo?.diasPreferidos)
    ? perfilActivo.diasPreferidos
    : [];

  return (
    <div className="space-y-6">
      {/* 1. Calendario Visual Interactivo de H5 (Elemento Principal) */}
      <CalendarioPersonalizadoView
        key={`cal-${refreshKey}`}
        socioId={socioId}
        socioNombre={socioNombre}
        canManage={canManage}
      />

      {/* 2. Resumen Compacto del Periodo Personalizado (FASE H6) */}
      <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
        <div
          onClick={() => setShowAgreementSummary(!showAgreementSummary)}
          className="p-4 bg-base-200/30 border-b border-base-200 flex justify-between items-center cursor-pointer hover:bg-base-200/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-base-content flex items-center gap-2">
                Periodo de Entrenamiento Personalizado
                {periodoActivo && (
                  <span
                    className={`badge badge-xs font-bold ${
                      periodoActivo.estado === "ACTIVO"
                        ? "badge-success text-white"
                        : periodoActivo.estado === "PAUSADO"
                        ? "badge-warning text-white"
                        : "badge-ghost"
                    }`}
                  >
                    {periodoActivo.estado}
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-base-content/60">
                {periodoActivo
                  ? `Vigencia: ${periodoActivo.fechaInicio} al ${periodoActivo.fechaFin} (${periodoActivo.mesesPeriodo || 1} mes/es) • Frecuencia acordada: ${periodoActivo.frecuenciaAcordada} d/sem`
                  : "Contrato operativo por periodo, acuerdos de frecuencia y horario."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                {periodoActivo ? (
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={handleOpenEditar}
                      className="btn btn-outline btn-primary btn-xs gap-1 font-bold"
                      title="Ajustar acuerdo del periodo activo"
                    >
                      <Sliders className="w-3 h-3" /> Ajustar Acuerdo
                    </button>
                    <button
                      onClick={handleOpenEstado}
                      className="btn btn-ghost btn-xs text-warning font-bold"
                      title="Cambiar estado del periodo"
                    >
                      Estado
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCrear();
                    }}
                    className="btn btn-primary btn-xs gap-1 text-white font-bold"
                  >
                    <PlusCircle className="w-3 h-3" /> Contratar Periodo
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost btn-xs btn-square">
              {showAgreementSummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showAgreementSummary && (
          <div className="p-5 md:p-6 animate-in fade-in duration-200">
            {periodoActivo ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tarjeta 1: Entrenador Responsable */}
                  <div className="p-4 bg-base-200/40 rounded-2xl border border-base-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-black text-base">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                          Entrenador
                        </span>
                        <h5 className="font-black text-sm text-base-content leading-tight">
                          {entrenadorNombre}
                        </h5>
                        <span className="text-[10px] opacity-70">{entrenadorRol}</span>
                      </div>
                    </div>

                    {entrenadorTelefono && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-base-300/40">
                        <span className="opacity-70 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-secondary" /> Teléfono:
                        </span>
                        <strong className="text-base-content">{entrenadorTelefono}</strong>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 2: Frecuencias y Horarios */}
                  <div className="p-4 bg-base-200/40 rounded-2xl border border-base-200 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center border-b border-base-300/40 pb-1.5">
                      <span className="opacity-70">Frecuencia Recomendada:</span>
                      <strong className="text-base-content">
                        {periodoActivo.frecuenciaRecomendada} días/sem
                      </strong>
                    </div>

                    <div className="flex justify-between items-center border-b border-base-300/40 pb-1.5">
                      <span className="font-bold text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Frecuencia Acordada:
                      </span>
                      <strong className="text-primary font-black">
                        {periodoActivo.frecuenciaAcordada} días/sem
                      </strong>
                    </div>

                    <div className="flex justify-between items-center border-b border-base-300/40 pb-1.5">
                      <span className="opacity-70">Horario y Duración:</span>
                      <strong className="text-base-content font-mono">
                        {periodoActivo.horaInicioAcordada} ({periodoActivo.duracionMinutos} min)
                      </strong>
                    </div>

                    <div className="pt-0.5">
                      <span className="text-[10px] uppercase font-bold opacity-60 block mb-1">
                        Días acordados:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {diasArray.map((dia) => (
                          <span
                            key={dia}
                            className="badge badge-xs badge-secondary text-white font-bold px-2 py-0.5"
                          >
                            {dia}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 3: Métricas de Sesiones del Periodo */}
                  <div className="p-4 bg-base-200/40 rounded-2xl border border-base-200 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-info flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> Métricas de Sesiones
                    </span>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 bg-base-100 rounded-xl border border-base-200 text-center">
                        <span className="text-[10px] opacity-60 block">Generadas</span>
                        <strong className="text-sm font-black text-base-content">
                          {periodoActivo.metricas?.total || 0}
                        </strong>
                      </div>
                      <div className="p-2 bg-base-100 rounded-xl border border-base-200 text-center">
                        <span className="text-[10px] opacity-60 block text-primary">Programadas</span>
                        <strong className="text-sm font-black text-primary">
                          {periodoActivo.metricas?.programadas || 0}
                        </strong>
                      </div>
                      <div className="p-2 bg-base-100 rounded-xl border border-base-200 text-center">
                        <span className="text-[10px] opacity-60 block text-success">Completadas</span>
                        <strong className="text-sm font-black text-success">
                          {periodoActivo.metricas?.completadas || 0}
                        </strong>
                      </div>
                      <div className="p-2 bg-base-100 rounded-xl border border-base-200 text-center">
                        <span className="text-[10px] opacity-60 block text-error">Canceladas</span>
                        <strong className="text-sm font-black text-error">
                          {periodoActivo.metricas?.canceladas || 0}
                        </strong>
                      </div>
                    </div>

                    {periodoActivo.metricas?.reprogramadas > 0 && (
                      <div className="flex justify-between items-center text-[11px] pt-1 text-warning">
                        <span className="flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" /> Reprogramadas (origen):
                        </span>
                        <strong className="font-bold">{periodoActivo.metricas.reprogramadas}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Objetivo y Observaciones si existen */}
                {(periodoActivo.objetivoAcordado || periodoActivo.observaciones) && (
                  <div className="p-3 bg-base-200/30 rounded-xl border border-base-200 text-xs flex flex-col md:flex-row gap-4">
                    {periodoActivo.objetivoAcordado && (
                      <div className="flex-1">
                        <span className="font-bold opacity-70">Objetivo:</span>{" "}
                        <span className="text-base-content">{periodoActivo.objetivoAcordado}</span>
                      </div>
                    )}
                    {periodoActivo.observaciones && (
                      <div className="flex-1">
                        <span className="font-bold opacity-70">Observaciones:</span>{" "}
                        <span className="text-base-content/80">{periodoActivo.observaciones}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-base-content/70 bg-base-200/30 rounded-2xl border border-dashed border-base-200 space-y-3">
                <Clock className="w-8 h-8 text-primary mx-auto opacity-50" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-base-content">
                    Sin periodo de entrenamiento personalizado activo
                  </p>
                  <p className="max-w-md mx-auto">
                    El servicio se gestiona por periodo (1, 2, 3 meses) generando sesiones automáticas según la frecuencia acordada.
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={handleOpenCrear}
                    className="btn btn-primary btn-sm text-white font-bold gap-1.5 shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" /> Contratar Periodo Personalizado
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Gestión Operativa (Crear / Editar Acuerdo / Cambiar Estado) */}
      <GestionPeriodoModal
        isOpen={showGestionModal}
        onClose={() => setShowGestionModal(false)}
        socioId={socioId || ""}
        socioNombre={socioNombre}
        periodoActivo={periodoActivo}
        onSuccess={handleModalSuccess}
        initialMode={modalMode}
      />
    </div>
  );
}
