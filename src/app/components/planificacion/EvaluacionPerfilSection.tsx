"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Plus,
  History,
  Activity,
  Target,
  Award,
  Calendar,
  Dumbbell,
  ShieldAlert,
  Apple,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  XCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EvaluacionPerfilSectionProps {
  socio: {
    id: string;
    codigo: string;
    nombres?: string | null;
    apellidos?: string | null;
    fechaNacimiento?: string | Date | null;
    sexo?: string | null;
  };
  activeProfile: any;
  medidaActual?: any;
  canManage: boolean;
  onOpenCreate: () => void;
  onOpenEdit: () => void;
  onOpenNewVersion: () => void;
  onOpenCloseProfile: () => void;
}

export default function EvaluacionPerfilSection({
  socio,
  activeProfile,
  medidaActual,
  canManage,
  onOpenCreate,
  onOpenEdit,
  onOpenNewVersion,
  onOpenCloseProfile,
}: EvaluacionPerfilSectionProps) {
  // Estado para controlar qué acordeón está abierto. Por defecto, cerrado para que no ocupe toda la pantalla.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const expandAll = () => {
    setOpenGroups({
      fisicos: true,
      objetivos: true,
      experiencia: true,
      disponibilidad: true,
      metodologia: true,
      salud: true,
      alimentacion: true,
      criterio: true,
    });
  };

  const collapseAll = () => {
    setOpenGroups({});
  };

  const safeFormatDate = (d: any) => {
    if (!d) return "—";
    try {
      return format(new Date(d), "dd/MM/yyyy", { locale: es });
    } catch {
      return "—";
    }
  };

  // Cálculo del porcentaje de completitud de la evaluación
  const getCompletitud = () => {
    if (!activeProfile) return { porcentaje: 0, faltantes: ["Perfil no creado"] };

    const checks = [
      { nombre: "Objetivo Principal", ok: Boolean(activeProfile.objetivoPrincipal) },
      { nombre: "Nivel", ok: Boolean(activeProfile.nivel) },
      { nombre: "Días por Semana", ok: typeof activeProfile.diasPorSemana === "number" },
      { nombre: "Duración de Sesión", ok: typeof activeProfile.duracionMinutos === "number" },
      { nombre: "Preferencia Alimenticia", ok: Boolean(activeProfile.preferenciaAlimenticia) },
      { nombre: "Medición Física (Peso/Talla)", ok: Boolean(medidaActual?.peso && medidaActual?.altura) },
    ];

    const completados = checks.filter((c) => c.ok).length;
    const faltantes = checks.filter((c) => !c.ok).map((c) => c.nombre);
    const porcentaje = Math.round((completados / checks.length) * 100);

    return { porcentaje, faltantes };
  };

  const { porcentaje, faltantes } = getCompletitud();

  if (!activeProfile) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-base-content flex items-center gap-2">
                1. Evaluación del Socio
              </h3>
              <p className="text-xs text-base-content/70">
                El socio no cuenta con una evaluación técnica activa. Requiere completar la ficha para personalizar entrenamientos y alimentación.
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={onOpenCreate}
              className="btn btn-primary btn-sm gap-2 whitespace-nowrap shadow-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Comenzar Evaluación
            </button>
          )}
        </div>
      </div>
    );
  }

  const anyOpen = Object.values(openGroups).some(Boolean);

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
      {/* 1. ENCABEZADO DE EVALUACIÓN DEL SOCIO */}
      <div className="p-5 bg-base-200/40 border-b border-base-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-lg text-base-content flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              1. Evaluación del Socio (v{activeProfile.version})
            </h3>
            <span className="badge badge-success text-white font-bold text-xs">ACTIVO</span>
            {porcentaje === 100 ? (
              <span className="badge badge-outline badge-success text-xs font-semibold">100% Completo</span>
            ) : (
              <span className="badge badge-outline badge-warning text-xs font-semibold">
                {porcentaje}% Completo ({faltantes.length} pendientes)
              </span>
            )}
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            En vigor desde {safeFormatDate(activeProfile.fechaInicio)} • Evaluador:{" "}
            <strong>
              {activeProfile.entrenador?.nombres} {activeProfile.entrenador?.apellidos || ""}
            </strong>
          </p>
        </div>

        {/* Acciones de Evaluación */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <button
                onClick={onOpenEdit}
                className="btn btn-outline btn-sm gap-1.5 font-semibold"
                title="Editar evaluación actual"
              >
                <FileEdit className="w-3.5 h-3.5" />
                Editar Evaluación
              </button>
              <button
                onClick={onOpenNewVersion}
                className="btn btn-outline btn-secondary btn-sm gap-1.5 font-semibold"
                title="Crear nueva versión formal del perfil"
              >
                <History className="w-3.5 h-3.5" />
                Nueva Versión
              </button>
            </>
          )}
          <button
            onClick={anyOpen ? collapseAll : expandAll}
            className="btn btn-ghost btn-sm gap-1 text-xs"
            title={anyOpen ? "Colapsar todos los grupos" : "Expandir todos los grupos"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {anyOpen ? "Colapsar Todo" : "Ver Detalle Completo"}
          </button>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-4">
        {/* RESUMEN EJECUTIVO COMPACTO (Siempre visible para vista rápida del entrenador) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs bg-base-200/50 p-3.5 rounded-xl border border-base-200">
          <div>
            <span className="opacity-60 block text-[10px] uppercase font-bold">Objetivo</span>
            <strong className="text-xs text-primary truncate block font-black">
              {activeProfile.objetivoPrincipal || "No especificado"}
            </strong>
          </div>
          <div>
            <span className="opacity-60 block text-[10px] uppercase font-bold">Nivel</span>
            <strong className="text-xs text-base-content truncate block font-bold">
              {activeProfile.nivel || "Principiante"}
            </strong>
          </div>
          <div>
            <span className="opacity-60 block text-[10px] uppercase font-bold">Frecuencia</span>
            <strong className="text-xs text-base-content truncate block font-bold">
              {activeProfile.diasPorSemana} días ({activeProfile.duracionMinutos} min)
            </strong>
          </div>
          <div>
            <span className="opacity-60 block text-[10px] uppercase font-bold">Peso / Talla</span>
            <strong className="text-xs text-base-content truncate block font-bold">
              {medidaActual?.peso ? `${medidaActual.peso} kg` : "—"} / {medidaActual?.altura ? `${medidaActual.altura} cm` : "—"}
            </strong>
          </div>
          <div>
            <span className="opacity-60 block text-[10px] uppercase font-bold">Alimentación</span>
            <strong className="text-xs text-base-content truncate block font-bold">
              {activeProfile.preferenciaAlimenticia || "Omnívoro"}
            </strong>
          </div>
          <div>
            <span className="opacity-60 block text-[10px] uppercase font-bold">Salud / Restricción</span>
            <strong className={`text-xs truncate block font-bold ${activeProfile.lesionesReportadas ? "text-warning" : "text-success"}`}>
              {activeProfile.lesionesReportadas ? "Con observaciones" : "Sin lesiones"}
            </strong>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 8 GRUPOS DE EVALUACIÓN ORGANIZADOS EN SECCIONES COLAPSABLES INTERACTIVAS  */}
        {/* ========================================================================= */}
        <div className="space-y-2 pt-1">
          {/* GRUPO 1: DATOS FÍSICOS Y ANTROPOMÉTRICOS */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("fisicos")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className="font-bold text-xs text-base-content flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                1. Datos Físicos y Antropométricos (Última Medición)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70 hidden sm:inline">
                  {medidaActual?.peso ? `${medidaActual.peso} kg • ${medidaActual.altura || "—"} cm` : "Sin medidas registradas"}
                </span>
                {openGroups.fisicos ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.fisicos && (
              <div className="p-4 bg-base-100 border-t border-base-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                <div className="bg-base-200/50 p-2.5 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Peso</span>
                  <strong className="text-xs text-base-content">{medidaActual?.peso ? `${medidaActual.peso} kg` : "No registrado"}</strong>
                </div>
                <div className="bg-base-200/50 p-2.5 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Talla</span>
                  <strong className="text-xs text-base-content">{medidaActual?.altura ? `${medidaActual.altura} cm` : "No registrado"}</strong>
                </div>
                <div className="bg-base-200/50 p-2.5 rounded-lg">
                  <span className="opacity-60 block text-[10px]">% Grasa</span>
                  <strong className="text-xs text-base-content">{medidaActual?.porcentajeGrasa ? `${medidaActual.porcentajeGrasa}%` : "—"}</strong>
                </div>
                <div className="bg-base-200/50 p-2.5 rounded-lg">
                  <span className="opacity-60 block text-[10px]">% Músculo</span>
                  <strong className="text-xs text-base-content">{medidaActual?.porcentajeMusculo ? `${medidaActual.porcentajeMusculo}%` : "—"}</strong>
                </div>
                <div className="bg-base-200/50 p-2.5 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Cintura</span>
                  <strong className="text-xs text-base-content">{medidaActual?.cintura ? `${medidaActual.cintura} cm` : "—"}</strong>
                </div>
                <div className="bg-base-200/50 p-2.5 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Muslos</span>
                  <strong className="text-xs text-base-content">{medidaActual?.muslos ? `${medidaActual.muslos} cm` : "—"}</strong>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 2: OBJETIVOS */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("objetivos")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className="font-bold text-xs text-base-content flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                2. Objetivos del Socio
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70 text-primary font-semibold hidden sm:inline">
                  {activeProfile.objetivoPrincipal || "General"}
                </span>
                {openGroups.objetivos ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.objetivos && (
              <div className="p-4 bg-base-100 border-t border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px] font-semibold">Objetivo Principal:</span>
                  <strong className="text-sm text-primary block mt-0.5">{activeProfile.objetivoPrincipal || "No especificado"}</strong>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px] font-semibold">Objetivo Específico / Secundario:</span>
                  <p className="mt-0.5 text-base-content font-medium">{activeProfile.objetivoSecundario || "Sin objetivo secundario especificado."}</p>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 3: EXPERIENCIA Y NIVEL */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("experiencia")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className="font-bold text-xs text-base-content flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                3. Experiencia y Nivel Atlético
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70 hidden sm:inline">
                  {activeProfile.nivel || "Principiante"} • {activeProfile.tiempoEntrenando || "Sin tiempo declarado"}
                </span>
                {openGroups.experiencia ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.experiencia && (
              <div className="p-4 bg-base-100 border-t border-base-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Nivel Inicial:</span>
                  <strong className="text-xs text-base-content block mt-0.5">{activeProfile.nivel || "PRINCIPIANTE"}</strong>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Tiempo Entrenando:</span>
                  <strong className="text-xs text-base-content block mt-0.5">{activeProfile.tiempoEntrenando || "No declarado"}</strong>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Experiencia Previa:</span>
                  <p className="mt-0.5 text-base-content">{activeProfile.experienciaPrevia || "Sin historial previo reportado"}</p>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 4: DISPONIBILIDAD */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("disponibilidad")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className="font-bold text-xs text-base-content flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                4. Disponibilidad y Horarios
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70 hidden sm:inline">
                  {activeProfile.diasPorSemana} días/sem • Turno {activeProfile.horarioPreferido || "Flexible"}
                </span>
                {openGroups.disponibilidad ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.disponibilidad && (
              <div className="p-4 bg-base-100 border-t border-base-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-base-200/50 p-3 rounded-lg">
                    <span className="opacity-60 block text-[10px]">Frecuencia Semanal:</span>
                    <strong className="text-xs text-base-content block mt-0.5">{activeProfile.diasPorSemana} días por semana</strong>
                  </div>
                  <div className="bg-base-200/50 p-3 rounded-lg">
                    <span className="opacity-60 block text-[10px]">Duración por Sesión:</span>
                    <strong className="text-xs text-base-content block mt-0.5">{activeProfile.duracionMinutos} minutos</strong>
                  </div>
                  <div className="bg-base-200/50 p-3 rounded-lg">
                    <span className="opacity-60 block text-[10px]">Turno Preferido:</span>
                    <strong className="text-xs text-base-content block mt-0.5">{activeProfile.horarioPreferido || "Flexible"}</strong>
                  </div>
                </div>
                {Array.isArray(activeProfile.diasPreferidos) && activeProfile.diasPreferidos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="opacity-70 text-[11px]">Días acordados:</span>
                    <div className="flex flex-wrap gap-1">
                      {activeProfile.diasPreferidos.map((d: string) => (
                        <span key={d} className="badge badge-xs badge-outline font-semibold">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GRUPO 5: METODOLOGÍA Y EQUIPAMIENTO */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("metodologia")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className="font-bold text-xs text-base-content flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                5. Metodología y Equipamiento
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70 hidden sm:inline truncate max-w-xs">
                  {activeProfile.tipoEntrenamiento || "Pesas tradicionales"}
                </span>
                {openGroups.metodologia ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.metodologia && (
              <div className="p-4 bg-base-100 border-t border-base-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Tipo Preferido:</span>
                  <p className="mt-0.5 font-medium">{activeProfile.tipoEntrenamiento || "Pesas tradicionales / Hipertrofia"}</p>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Ejercicios Excluidos:</span>
                  <p className="mt-0.5 font-medium">{activeProfile.ejerciciosEvitados || "Ninguno reportado"}</p>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Equipamiento:</span>
                  <p className="mt-0.5 font-medium">{activeProfile.equipamientoDisponible || "Gimnasio completo"}</p>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 6: SALUD Y RESTRICCIONES */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("salud")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className={`font-bold text-xs flex items-center gap-2 ${activeProfile.lesionesReportadas ? "text-warning" : "text-base-content"}`}>
                <ShieldAlert className="w-4 h-4 text-warning" />
                6. Salud y Restricciones Físicas Declaradas
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold hidden sm:inline ${activeProfile.lesionesReportadas ? "text-warning" : "text-success"}`}>
                  {activeProfile.lesionesReportadas ? "Limitaciones declaradas" : "Sin lesiones"}
                </span>
                {openGroups.salud ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.salud && (
              <div className="p-4 bg-base-100 border-t border-base-200 text-xs">
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg space-y-1.5">
                  <div className="flex items-start gap-2 text-warning font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Restricciones y molestias reportadas:</span>
                  </div>
                  <p className="text-base-content font-medium pl-6">
                    {activeProfile.lesionesReportadas || "Sin lesiones ni limitaciones físicas reportadas por el socio."}
                  </p>
                  <div className="text-[10px] opacity-75 italic border-t border-warning/20 pt-1 pl-6">
                    ℹ️ Declarado por el socio. No reemplaza un diagnóstico clínico.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 7: PAUTAS ALIMENTARIAS */}
          <div className="border border-base-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup("alimentacion")}
              className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
            >
              <span className="font-bold text-xs text-base-content flex items-center gap-2">
                <Apple className="w-4 h-4 text-primary" />
                7. Pautas y Hábitos Alimentarios
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-70 hidden sm:inline">
                  {activeProfile.preferenciaAlimenticia || "Omnívoro"} • {activeProfile.numeroComidasDia || 3} comidas/día
                </span>
                {openGroups.alimentacion ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
              </div>
            </button>
            {openGroups.alimentacion && (
              <div className="p-4 bg-base-100 border-t border-base-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Preferencia:</span>
                  <strong className="text-xs block mt-0.5">{activeProfile.preferenciaAlimenticia || "Omnívoro"}</strong>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Alergias / Intolerancias:</span>
                  <strong className="text-xs block mt-0.5 text-error">{activeProfile.alergiasDeclaradas || "Ninguna reportada"}</strong>
                </div>
                <div className="bg-base-200/50 p-3 rounded-lg">
                  <span className="opacity-60 block text-[10px]">Comidas / Hidratación:</span>
                  <strong className="text-xs block mt-0.5">
                    {activeProfile.numeroComidasDia || 3} comidas/día • {activeProfile.consumoAguaLitros || 2.5} L agua
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* GRUPO 8: CRITERIO DEL ENTRENADOR */}
          {activeProfile.observaciones && (
            <div className="border border-base-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup("criterio")}
                className="w-full p-3 bg-base-200/40 hover:bg-base-200/70 transition-colors flex items-center justify-between text-left"
              >
                <span className="font-bold text-xs text-base-content flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  8. Criterio y Observaciones del Entrenador
                </span>
                <div className="flex items-center gap-2">
                  {openGroups.criterio ? <ChevronUp className="w-4 h-4 text-base-content/60" /> : <ChevronDown className="w-4 h-4 text-base-content/60" />}
                </div>
              </button>
              {openGroups.criterio && (
                <div className="p-4 bg-base-100 border-t border-base-200 text-xs">
                  <div className="bg-base-200/50 p-3 rounded-lg">
                    <p className="text-base-content">{activeProfile.observaciones}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
