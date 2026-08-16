"use client";

import { useState, useEffect } from "react";
import {
  Dumbbell,
  Apple,
  TrendingUp,
  UserCheck,
  FileText,
  Loader2,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Utensils,
  Droplet,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { getMiPlanSocio } from "@/app/actions/portal-socio";
import { exportarPlanEntrenamientoPDF, exportarPlanAlimentacionPDF } from "@/app/actions/planes-export";

export default function MiPlanClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ENTRENAMIENTO" | "ALIMENTACION" | "EVOLUCION" | "ADHERENCIA">("ENTRENAMIENTO");
  const [selectedNivel, setSelectedNivel] = useState(0);
  const [mealTab, setMealTab] = useState("TODOS");

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await getMiPlanSocio();
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.planEntrenamiento?.nivelActual) {
          setSelectedNivel(Math.max(0, Math.min(5, res.data.planEntrenamiento.nivelActual - 1)));
        }
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error("Error al cargar su plan personalizado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const handleExportPDF = async (tipo: "ENTRENAMIENTO" | "ALIMENTACION") => {
    const planId = tipo === "ENTRENAMIENTO" ? data?.planEntrenamiento?.id : data?.planAlimentacion?.id;
    if (!planId) {
      toast.error("No cuenta con un plan activo para este módulo.");
      return;
    }

    toast.info("Generando PDF...");
    try {
      const res =
        tipo === "ENTRENAMIENTO"
          ? await exportarPlanEntrenamientoPDF({ planId })
          : await exportarPlanAlimentacionPDF({ planId });

      if (res.success && res.base64Pdf) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${res.base64Pdf}`;
        link.download = `Mi_Plan_${tipo}_v${data?.perfilActivo?.version || 1}.pdf`;
        link.click();
        toast.success("PDF descargado exitosamente.");
      } else {
        toast.error(res.error || "Error al descargar PDF.");
      }
    } catch (err) {
      toast.error("Error al procesar la descarga PDF.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 bg-base-100 rounded-2xl border border-base-200 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <span className="text-sm font-semibold opacity-80">Cargando su plan personalizado...</span>
        </div>
      </div>
    );
  }

  if (!data || (!data.planEntrenamiento && !data.planAlimentacion)) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <div className="bg-base-100 p-8 rounded-2xl border border-base-200 shadow-sm space-y-4">
          <Dumbbell className="w-12 h-12 text-primary mx-auto opacity-50" />
          <h2 className="text-xl font-extrabold text-base-content">Actualmente no tienes un plan personalizado activo</h2>
          <p className="text-xs text-base-content/70 max-w-md mx-auto">
            Tu entrenador asignará tu perfil y programa de entrenamiento progresivo. Comunícate con recepción o con tu instructor para iniciar.
          </p>
        </div>
      </div>
    );
  }

  const { socio, perfilActivo, planEntrenamiento, planAlimentacion, evolucion, adherencia } = data;
  const niveles = planEntrenamiento?.contenido?.nivelesProgresivos || [];
  const currentNivelData = niveles[selectedNivel] || {};
  const rutinas = currentNivelData.rutinas || [];

  const recetas = planAlimentacion?.contenido?.recetas || [];
  const filteredRecetas =
    mealTab === "TODOS"
      ? recetas
      : recetas.filter((r: any) => r.momentoSugerido === mealTab || r.momento === mealTab);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header Portal del Socio */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-base-content">Mi Plan Personalizado</h1>
            <span className="badge badge-success text-white text-xs font-bold">PLAN ACTIVO v{perfilActivo?.version || 1}</span>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            Socio: <strong className="text-base-content">{socio?.nombre}</strong> ({socio?.codigo}) • Objetivo: <strong className="text-primary">{perfilActivo?.objetivoPrincipal || "General"}</strong> • Nivel: <strong>{perfilActivo?.nivel || "N/A"}</strong> • {perfilActivo?.diasPorSemana || 3} días/semana
          </p>
        </div>

        {/* Toolbar Descarga PDF */}
        <div className="flex flex-wrap gap-2">
          {planEntrenamiento && (
            <button
              onClick={() => handleExportPDF("ENTRENAMIENTO")}
              className="btn btn-outline btn-sm gap-1.5"
            >
              <FileText className="w-4 h-4 text-error" />
              PDF Entrenamiento
            </button>
          )}
          {planAlimentacion && (
            <button
              onClick={() => handleExportPDF("ALIMENTACION")}
              className="btn btn-outline btn-sm gap-1.5"
            >
              <FileText className="w-4 h-4 text-success" />
              PDF Nutrición
            </button>
          )}
        </div>
      </div>

      {/* Tabs Principales de Mi Plan */}
      <div className="flex flex-wrap gap-2 border-b border-base-200 pb-2">
        <button
          onClick={() => setActiveTab("ENTRENAMIENTO")}
          className={`btn btn-sm gap-2 ${
            activeTab === "ENTRENAMIENTO" ? "btn-primary text-white" : "btn-ghost"
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          Mi Entrenamiento
        </button>

        <button
          onClick={() => setActiveTab("ALIMENTACION")}
          className={`btn btn-sm gap-2 ${
            activeTab === "ALIMENTACION" ? "btn-primary text-white" : "btn-ghost"
          }`}
        >
          <Apple className="w-4 h-4" />
          Mi Alimentación
        </button>

        <button
          onClick={() => setActiveTab("EVOLUCION")}
          className={`btn btn-sm gap-2 ${
            activeTab === "EVOLUCION" ? "btn-primary text-white" : "btn-ghost"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Mi Evolución
        </button>

        <button
          onClick={() => setActiveTab("ADHERENCIA")}
          className={`btn btn-sm gap-2 ${
            activeTab === "ADHERENCIA" ? "btn-primary text-white" : "btn-ghost"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Mi Adherencia
        </button>
      </div>

      {/* TAB 1: MI ENTRENAMIENTO */}
      {activeTab === "ENTRENAMIENTO" && (
        <div className="space-y-6">
          {planEntrenamiento ? (
            <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-6">
              {/* Selector de Niveles */}
              <div>
                <label className="label text-xs font-bold uppercase text-base-content/70">
                  Tu Programa Progresivo de Entrenamiento:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {niveles.map((n: any, idx: number) => {
                    const isCurrent = planEntrenamiento.nivelActual === idx + 1;
                    const isSelected = selectedNivel === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedNivel(idx)}
                        className={`btn btn-sm ${
                          isSelected
                            ? "btn-primary text-white"
                            : isCurrent
                            ? "btn-outline btn-primary"
                            : "btn-ghost bg-base-200/60"
                        } relative`}
                      >
                        Nivel {idx + 1}
                        {isCurrent && <span className="badge badge-xs badge-success text-white ml-1 font-bold">Actual</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rutinas del Nivel */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-base-content">
                  <Layers className="w-4 h-4 text-primary" />
                  Rutinas para el Nivel {selectedNivel + 1} ({currentNivelData.enfoqueNivel || "Enfoque técnico"})
                </h3>

                {rutinas.length > 0 ? (
                  <div className="space-y-4">
                    {rutinas.map((rutina: any, rIdx: number) => (
                      <div key={rIdx} className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-3">
                        <h4 className="font-bold text-xs text-primary flex items-center gap-1.5">
                          <ChevronRight className="w-4 h-4 text-primary" />
                          Día {rutina.diaSemana || rIdx + 1}: {rutina.nombreRutina || `Sesión ${rIdx + 1}`}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {(rutina.ejercicios || []).map((ej: any, eIdx: number) => (
                            <div key={eIdx} className="p-3 bg-base-100 rounded-lg border border-base-200 space-y-1.5">
                              <h5 className="font-bold text-xs text-base-content">{ej.nombreEjercicio || ej.nombre}</h5>
                              <div className="flex items-center gap-2 text-[11px] font-semibold text-primary">
                                <span>{ej.series} Series</span> • <span>{ej.repeticiones} Reps</span> • <span>{ej.descansoSegundos || 60}s Descanso</span>
                              </div>
                              {(ej.instrucciones || ej.observaciones) && (
                                <p className="text-[11px] opacity-75">{ej.instrucciones || ej.observaciones}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-60 text-center py-4">No hay rutinas especificadas para este nivel.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs opacity-60 text-center py-6">No se cuenta con un plan de entrenamiento activo.</p>
          )}
        </div>
      )}

      {/* TAB 2: MI ALIMENTACIÓN */}
      {activeTab === "ALIMENTACION" && (
        <div className="space-y-6">
          {planAlimentacion ? (
            <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-6">
              <div className="flex flex-wrap gap-1 border-b border-base-200 pb-2">
                {["TODOS", "DESAYUNO", "ALMUERZO", "CENA", "SNACK_PRE", "SNACK_POST"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealTab(m)}
                    className={`btn btn-xs ${mealTab === m ? "btn-primary text-white" : "btn-ghost"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecetas.map((receta: any, idx: number) => (
                  <div key={idx} className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-2">
                    <div className="flex justify-between border-b border-base-300/50 pb-2">
                      <h4 className="font-bold text-xs text-base-content">{receta.nombreReceta || receta.nombre}</h4>
                      <span className="badge badge-xs badge-outline uppercase">{receta.momentoSugerido || receta.momento}</span>
                    </div>
                    <p className="text-xs"><strong className="text-primary">Ingredientes:</strong> {Array.isArray(receta.ingredientes) ? receta.ingredientes.join(", ") : receta.ingredientes}</p>
                    <p className="text-xs"><strong className="text-secondary">Preparación:</strong> {receta.instrucciones || receta.preparacion}</p>
                    {receta.opcionesSustitucion && (
                      <p className="text-[11px] text-info"><strong className="font-bold">Sustituciones:</strong> {receta.opcionesSustitucion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs opacity-60 text-center py-6">No se cuenta con un plan alimenticio activo.</p>
          )}
        </div>
      )}

      {/* TAB 3: MI EVOLUCIÓN */}
      {activeTab === "EVOLUCION" && (
        <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Historial de Mediciones Físicas
          </h3>
          {evolucion?.medidasHistorial?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Peso (kg)</th>
                    <th>% Grasa</th>
                    <th>% Músculo</th>
                    <th>Cintura (cm)</th>
                    <th>Pecho (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucion.medidasHistorial.map((m: any) => (
                    <tr key={m.id}>
                      <td className="font-bold">{m.fecha}</td>
                      <td>{m.peso || "-"}</td>
                      <td>{m.porcentajeGrasa ? `${m.porcentajeGrasa}%` : "-"}</td>
                      <td>{m.porcentajeMusculo ? `${m.porcentajeMusculo}%` : "-"}</td>
                      <td>{m.cintura || "-"}</td>
                      <td>{m.pecho || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs opacity-60 text-center py-4">No hay mediciones físicas registradas.</p>
          )}
        </div>
      )}

      {/* TAB 4: MI ADHERENCIA */}
      {activeTab === "ADHERENCIA" && (
        <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Visitas al Gimnasio Registradas (Últimos 30 días)
          </h3>
          <p className="text-xs opacity-80">
            Adherencia acumulada: <strong>{adherencia?.porcentajeAdherencia || 0}%</strong> ({adherencia?.sesionesRegistradas || 0} visitas en los últimos 30 días).
          </p>
          {adherencia?.asistenciasDetalle?.length > 0 ? (
            <div className="overflow-x-auto max-h-60">
              <table className="table table-xs w-full bg-base-200/30">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {adherencia.asistenciasDetalle.map((a: any) => (
                    <tr key={a.id}>
                      <td className="font-bold">{a.fecha}</td>
                      <td>{a.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs opacity-60 text-center py-4">No hay visitas registradas en los últimos 30 días.</p>
          )}
        </div>
      )}
    </div>
  );
}
