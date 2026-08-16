"use client";

import { useState } from "react";
import {
  X,
  AlertTriangle,
  Dumbbell,
  Apple,
  CheckCircle2,
  XCircle,
  Archive,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  ShieldAlert,
  Info,
  Calendar,
  Utensils,
  Award,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  generacion: any;
  onClose: () => void;
  onApprove?: (generacion: any) => void;
  onReject?: (generacion: any) => void;
  onArchive?: (generacionId: string) => void;
  canManage?: boolean;
}

export default function ProposalViewerModal({
  generacion,
  onClose,
  onApprove,
  onReject,
  onArchive,
  canManage = true,
}: Props) {
  const [activeTab, setActiveTab] = useState<"entrenamiento" | "alimentacion">("entrenamiento");
  const [openLevel, setOpenLevel] = useState<number | null>(1);
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState<string>("TODAS");
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);

  if (!generacion) return null;

  const output = generacion.rawOutput || {};
  const metadata = output.metadataGeneracion || {};
  const planEntr = output.planEntrenamiento || {};
  const planAlim = output.planAlimentacion || {};
  const evaluacion = output.evaluacionSeguridad || {};
  const banderas = generacion.banderasAdvertencia || evaluacion.banderasAdvertencia || [];
  const requiresReview = generacion.requiresHumanReview ?? evaluacion.requiresHumanReview;

  const niveles = planEntr.niveles || [];
  const recetas = planAlim.recetas || [];

  // Categorías de recetas
  const recipeCategories: string[] = [
    "TODAS",
    ...Array.from(new Set<string>(recetas.map((r: any) => (r.momentoDelDia || "Otro") as string))),
  ];
  const filteredRecipes =
    selectedRecipeCategory === "TODAS"
      ? recetas
      : recetas.filter((r: any) => (r.momentoDelDia || "Otro") === selectedRecipeCategory);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "APROBADO":
        return <span className="badge badge-success gap-1 text-white"><CheckCircle2 className="w-3 h-3" /> Aprobado</span>;
      case "RECHAZADO":
        return <span className="badge badge-error gap-1 text-white"><XCircle className="w-3 h-3" /> Rechazado</span>;
      case "ARCHIVADO":
        return <span className="badge badge-neutral gap-1"><Archive className="w-3 h-3" /> Archivado</span>;
      case "ERROR":
        return <span className="badge badge-error gap-1"><AlertTriangle className="w-3 h-3" /> Error</span>;
      default:
        return <span className="badge badge-warning gap-1"><Clock className="w-3 h-3" /> Propuesta Generada</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-base-200 bg-base-200/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Propuesta IA #{generacion.numeroGeneracion}
                </h3>
                {getStatusBadge(generacion.estado)}
                {requiresReview && (
                  <span className="badge badge-error badge-sm gap-1 text-white animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Revisión Requerida
                  </span>
                )}
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                Generado el{" "}
                {generacion.createdAt
                  ? format(new Date(generacion.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
                  : "Fecha no disponible"}{" "}
                • Modelo: {generacion.modeloUtilizado || "IA Engine"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Advertencia de Salud / Seguridad */}
        {requiresReview && (
          <div className="bg-error/10 border-b border-error/20 p-4 px-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-error uppercase tracking-wider">
                  ⚠️ Revisión Humana Requerida Antes de Aprobar
                </h4>
                <p className="text-xs text-base-content/80">
                  El motor de IA detectó condiciones particulares de salud, lesiones, alergias o falta de datos que requieren validación presencial por parte del entrenador.
                </p>
                {banderas && banderas.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-error font-medium">
                    {banderas.map((flag: string, idx: number) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resumen Estratégico */}
        <div className="bg-base-200/30 p-4 border-b border-base-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-base-100 p-3 rounded-xl border border-base-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-primary block">Estrategia General</span>
            <p className="font-semibold text-base-content line-clamp-2 mt-0.5">
              {metadata.resumenEstrategia || "Planificación adaptativa y progresiva."}
            </p>
          </div>
          <div className="bg-base-100 p-3 rounded-xl border border-base-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-primary block">Nivel Inicial Recomendado</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="badge badge-primary badge-sm font-bold">
                Nivel {metadata.nivelInicialRecomendado || 1}
              </span>
              <span className="text-xs text-base-content/70 truncate">
                {metadata.justificacionNivelInicial || "Según experiencia"}
              </span>
            </div>
          </div>
          <div className="bg-base-100 p-3 rounded-xl border border-base-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-primary block">Distribución / Split</span>
            <p className="font-semibold text-base-content mt-0.5">
              {planEntr.splitSugerido || "Full Body"} • {planEntr.frecuenciaSemanal || 3} días/semana
            </p>
          </div>
        </div>

        {/* Selector de Pestañas (Entrenamiento vs Alimentación) */}
        <div className="flex border-b border-base-200 bg-base-100 px-4 pt-2">
          <button
            onClick={() => setActiveTab("entrenamiento")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all ${
              activeTab === "entrenamiento"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Plan de Entrenamiento ({niveles.length} Niveles)
          </button>
          <button
            onClick={() => setActiveTab("alimentacion")}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all ${
              activeTab === "alimentacion"
                ? "border-success text-success"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <Apple className="w-4 h-4" />
            Plan Alimentario ({recetas.length} Recetas)
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ENTRENAMIENTO */}
          {activeTab === "entrenamiento" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black">{planEntr.titulo || "Programa de 6 Niveles Progresivos"}</h4>
                  <p className="text-xs opacity-70">{planEntr.descripcionGeneral}</p>
                </div>
                <span className="badge badge-outline text-xs">{niveles.length} niveles estructurados</span>
              </div>

              {/* Acordeones de los 6 Niveles */}
              <div className="space-y-3">
                {niveles.map((nivel: any) => {
                  const isOpen = openLevel === nivel.numeroNivel;
                  return (
                    <div
                      key={nivel.numeroNivel}
                      className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                        isOpen
                          ? "border-primary/40 bg-base-100 shadow-md ring-1 ring-primary/20"
                          : "border-base-200 bg-base-200/30 hover:bg-base-200/50"
                      }`}
                    >
                      {/* Cabecera del Nivel */}
                      <button
                        onClick={() => setOpenLevel(isOpen ? null : nivel.numeroNivel)}
                        className="w-full p-4 flex items-center justify-between text-left gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                              isOpen ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"
                            }`}
                          >
                            N{nivel.numeroNivel}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-sm sm:text-base">
                                {nivel.nombreNivel || `Nivel ${nivel.numeroNivel}`}
                              </h5>
                              <span className="badge badge-sm badge-ghost font-medium">
                                {nivel.duracionSugeridaSemanas || 4} semanas
                              </span>
                            </div>
                            <p className="text-xs text-base-content/70 line-clamp-1 mt-0.5">
                              {nivel.objetivoEspecifico}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-primary hidden sm:inline">
                            {nivel.sesiones?.length || 0} sesiones
                          </span>
                          {isOpen ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 opacity-50" />}
                        </div>
                      </button>

                      {/* Cuerpo del Nivel */}
                      {isOpen && (
                        <div className="p-4 pt-0 border-t border-base-200/50 space-y-4 text-xs">
                          {/* Criterios de Progresión y Regresión */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 bg-base-200/50 p-3.5 rounded-xl">
                            <div>
                              <span className="font-bold text-success flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Criterios de Progreso
                              </span>
                              <p className="text-xs mt-1 text-base-content/80">
                                {nivel.criteriosDeProgreso || "Dominio técnico y RPE adecuado durante 3 semanas consecutivas."}
                              </p>
                            </div>
                            <div>
                              <span className="font-bold text-warning flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                <AlertTriangle className="w-3.5 h-3.5" /> Criterios de Regresión
                              </span>
                              <p className="text-xs mt-1 text-base-content/80">
                                {nivel.criteriosDeRegresion || "Dolor articular, fatiga persistente o incapacidad de completar volumen."}
                              </p>
                            </div>
                          </div>

                          {/* Sesiones de Entrenamiento */}
                          <div className="space-y-4 mt-2">
                            <h6 className="font-bold uppercase tracking-wider text-[11px] text-primary">
                              Sesiones Semanales ({nivel.sesiones?.length || 0})
                            </h6>
                            {nivel.sesiones?.map((sesion: any, sIdx: number) => (
                              <div key={sIdx} className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-base-200 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="badge badge-primary badge-sm font-bold">{sesion.dia || `Día ${sIdx + 1}`}</span>
                                    <h6 className="font-bold text-sm">{sesion.nombre || `Sesión ${sIdx + 1}`}</h6>
                                  </div>
                                </div>

                                {sesion.calentamiento && (
                                  <div className="bg-base-200/40 p-2.5 rounded-lg text-xs">
                                    <span className="font-bold text-warning block text-[10px] uppercase">Calentamiento:</span>
                                    <p className="text-base-content/80 mt-0.5">{sesion.calentamiento}</p>
                                  </div>
                                )}

                                {/* Tabla de Ejercicios */}
                                <div className="overflow-x-auto">
                                  <table className="table table-xs w-full">
                                    <thead>
                                      <tr className="bg-base-200/60 text-base-content/70">
                                        <th>Ejercicio</th>
                                        <th>Grupo</th>
                                        <th className="text-center">Series</th>
                                        <th className="text-center">Reps</th>
                                        <th className="text-center">Descanso</th>
                                        <th className="text-center">RPE</th>
                                        <th>Instrucciones / Clave técnica</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sesion.ejercicios?.map((ej: any, eIdx: number) => (
                                        <tr key={eIdx} className="hover:bg-base-200/30">
                                          <td className="font-bold text-base-content">{ej.nombre}</td>
                                          <td className="text-base-content/70">{ej.grupoMuscular || "General"}</td>
                                          <td className="text-center font-bold text-primary">{ej.series}</td>
                                          <td className="text-center">{ej.repeticiones}</td>
                                          <td className="text-center text-base-content/70">{ej.descansoSegundos ? `${ej.descansoSegundos}s` : "60s"}</td>
                                          <td className="text-center">
                                            <span className="badge badge-ghost badge-xs font-bold">{ej.rpe || "7-8"}</span>
                                          </td>
                                          <td className="text-base-content/70 text-[11px] max-w-xs">{ej.instrucciones || ej.tempo || "Control excéntrico"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {sesion.vueltaALaCalma && (
                                  <div className="bg-base-200/40 p-2.5 rounded-lg text-xs">
                                    <span className="font-bold text-info block text-[10px] uppercase">Vuelta a la calma / Estiramientos:</span>
                                    <p className="text-base-content/80 mt-0.5">{sesion.vueltaALaCalma}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ALIMENTACIÓN */}
          {activeTab === "alimentacion" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-base font-black">{planAlim.titulo || "Pautas Alimentarias Sugeridas"}</h4>
                  <p className="text-xs opacity-70">{planAlim.descripcionGeneral}</p>
                </div>
                <span className="badge badge-success badge-outline text-xs">{recetas.length} recetas disponibles</span>
              </div>

              {/* Lineamientos Generales & Hidratación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-base-200/40 p-4 rounded-2xl border border-base-200 text-xs">
                <div>
                  <span className="font-bold text-success flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    <Utensils className="w-3.5 h-3.5" /> Lineamientos Nutricionales
                  </span>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-base-content/80">
                    {planAlim.lineamientosGenerales?.map((lin: string, idx: number) => (
                      <li key={idx}>{lin}</li>
                    )) || <li>Priorizar comida real y adecuada ingesta proteica.</li>}
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-info flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5" /> Hidratación Sugerida
                  </span>
                  <p className="mt-2 text-base-content/80">
                    {planAlim.recomendacionHidratacion || "Consumir entre 2.5 a 3.0 litros de agua al día, incrementando 500ml durante los días de entrenamiento intenso."}
                  </p>
                </div>
              </div>

              {/* Filtro de Categorías de Recetas */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold opacity-60">Filtrar:</span>
                {recipeCategories.map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedRecipeCategory(cat)}
                    className={`btn btn-xs rounded-lg ${
                      selectedRecipeCategory === cat ? "btn-success text-white font-bold" : "btn-ghost"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de Recetas (Mínimo 20) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredRecipes.map((receta: any) => {
                  const isExpanded = openRecipeId === receta.id;
                  return (
                    <div
                      key={receta.id}
                      className="bg-base-100 border border-base-200 rounded-2xl p-4 shadow-sm hover:border-success/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="badge badge-success/15 text-success font-bold badge-xs">
                              {receta.momentoDelDia || "Comida"}
                            </span>
                            <h5 className="font-bold text-sm mt-1">{receta.nombre}</h5>
                          </div>
                          <div className="text-right shrink-0 text-[11px] opacity-70">
                            {receta.tiempoPreparacionMinutos && <span>⏱️ {receta.tiempoPreparacionMinutos} min</span>}
                            {receta.porciones && <span className="block">🍽️ {receta.porciones} porción</span>}
                          </div>
                        </div>

                        {/* Ingredientes */}
                        <div className="text-xs bg-base-200/40 p-2.5 rounded-xl">
                          <span className="font-bold text-[10px] uppercase text-success block">Ingredientes:</span>
                          <ul className="mt-1 space-y-0.5 text-base-content/80 list-disc list-inside">
                            {receta.ingredientes?.slice(0, isExpanded ? 50 : 3).map((ing: string, iIdx: number) => (
                              <li key={iIdx} className="text-[11px]">{ing}</li>
                            ))}
                            {!isExpanded && receta.ingredientes?.length > 3 && (
                              <li className="text-[10px] text-primary list-none font-semibold">
                                + {receta.ingredientes.length - 3} ingredientes más...
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Instrucciones Detalladas (expandibles) */}
                        {isExpanded && (
                          <div className="space-y-2 pt-2 border-t border-base-200 text-xs">
                            <div>
                              <span className="font-bold text-[10px] uppercase text-primary block">Preparación:</span>
                              <ol className="mt-1 space-y-1 list-decimal list-inside text-base-content/80 text-[11px]">
                                {receta.instrucciones?.map((paso: string, pIdx: number) => (
                                  <li key={pIdx}>{paso}</li>
                                ))}
                              </ol>
                            </div>
                            {receta.beneficiosNutricionales && (
                              <div className="bg-success/10 p-2 rounded-lg text-success text-[11px]">
                                <strong>Beneficio:</strong> {receta.beneficiosNutricionales}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setOpenRecipeId(isExpanded ? null : receta.id)}
                        className="btn btn-ghost btn-xs w-full mt-3 text-primary"
                      >
                        {isExpanded ? "Ocultar preparación" : "Ver preparación completa"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer de Acciones */}
        <div className="p-4 sm:p-5 border-t border-base-200 bg-base-200/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              Cerrar
            </button>
            {canManage && generacion.estado === "GENERADO" && (
              <button
                onClick={() => onArchive && onArchive(generacion.id)}
                className="btn btn-outline btn-sm gap-1.5"
                title="Archivar propuesta"
              >
                <Archive className="w-4 h-4" />
                Archivar
              </button>
            )}
          </div>

          {canManage && (generacion.estado === "GENERADO" || generacion.estado === "EN_REVISION") && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject && onReject(generacion)}
                className="btn btn-error btn-outline btn-sm gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </button>
              <button
                onClick={() => onApprove && onApprove(generacion)}
                className="btn btn-success btn-sm gap-1.5 text-white font-bold shadow-md shadow-success/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprobar Propuesta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
