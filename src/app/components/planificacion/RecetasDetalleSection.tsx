"use client";

import { useState, useEffect } from "react";
import {
  Apple,
  Clock,
  Droplet,
  FileText,
  Loader2,
  ChevronRight,
  Utensils,
  BookOpen,
  Flame,
  Scale,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { getDetallePlanAlimentacionActivo } from "@/app/actions/operaciones-planes";
import { exportarPlanAlimentacionPDF } from "@/app/actions/planes-export";

interface Props {
  socioId: string;
  onOpenGenerateIA?: () => void;
  generatingIA?: boolean;
}

const MOMENTOS_COMIDA = [
  { key: "TODOS", label: "Todas las Recetas (20+)" },
  { key: "DESAYUNO", label: "Desayunos" },
  { key: "ALMUERZO", label: "Almuerzos" },
  { key: "CENA", label: "Cenas" },
  { key: "SNACK_PRE", label: "Snacks Pre-Entreno" },
  { key: "SNACK_POST", label: "Snacks Post-Entreno" },
  { key: "SNACK_MEDIA_MANANA", label: "Media Mañana" },
  { key: "SNACK_MEDIA_TARDE", label: "Media Tarde" },
];

export default function RecetasDetalleSection({
  socioId,
  onOpenGenerateIA,
  generatingIA = false,
}: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("TODOS");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDetallePlanAlimentacionActivo(socioId);
      if (res.success && res.plan) {
        setData(res.plan);
      }
    } catch (err) {
      toast.error("Error al cargar plan de alimentación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [socioId]);

  const handleExportPDF = async () => {
    if (!data?.id) return;
    toast.info("Generando PDF del plan alimenticio...");
    try {
      const res = await exportarPlanAlimentacionPDF({ planId: data.id });
      if (res.success && res.base64Pdf) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${res.base64Pdf}`;
        link.download = `Nutricion_${data.titulo}_v${data.version}.pdf`;
        link.click();
        toast.success("PDF generado exitosamente.");
      } else {
        toast.error(res.error || "Error al exportar PDF.");
      }
    } catch (err) {
      toast.error("Error al procesar exportación PDF.");
    }
  };

  if (loading) {
    return (
      <div className="card bg-base-100 p-8 text-center rounded-2xl border border-base-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
        <span className="text-xs opacity-70">Cargando recetas y plan nutricional...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-base-content flex items-center gap-2">
                3. Plan de Alimentación
              </h3>
              <p className="text-xs text-base-content/70">
                El socio no cuenta con un plan de alimentación activo. Genere una propuesta con IA para activarlo.
              </p>
            </div>
          </div>
          {onOpenGenerateIA && (
            <button
              onClick={onOpenGenerateIA}
              disabled={generatingIA}
              className="btn btn-success text-white btn-sm gap-2 whitespace-nowrap shadow-sm font-bold"
            >
              {generatingIA ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Apple className="w-4 h-4" /> Generar Propuesta IA
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  const contenido = data.contenido || {};
  const recetas = contenido.recetas || [];
  const objetivosNutricionales = contenido.objetivosNutricionalesDiarios || null;
  const lineamientosGenerales = contenido.lineamientosGenerales || data.lineamientosGenerales || [];

  const filteredRecetas =
    activeTab === "TODOS"
      ? recetas
      : recetas.filter((r: any) => r.momentoSugerido === activeTab || r.momento === activeTab);

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden space-y-6">
      {/* Header Plan Nutricional Active Details */}
      <div className="p-5 bg-base-200/40 border-b border-base-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-lg text-base-content flex items-center gap-2">
              <Apple className="w-5 h-5 text-success" />
              Plan de Alimentación ({data.titulo || "Personalizado"})
            </h3>
            <span className="badge badge-primary font-bold text-xs">v{data.version}</span>
            <span className="badge badge-success text-white font-bold text-xs">ACTIVO</span>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            Hidratación recomendada: <strong>{data.recomendacionHidratacion || contenido.recomendacionHidratacion || "2.5 - 3.0 Litros/día"}</strong> • Inicio: {data.fechaInicio}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenGenerateIA && (
            <button
              onClick={onOpenGenerateIA}
              disabled={generatingIA}
              className="btn btn-success text-white btn-sm gap-1.5 font-bold shadow-sm"
              title="Generar nueva propuesta de alimentación con IA"
            >
              {generatingIA ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Apple className="w-3.5 h-3.5" />
              )}
              Nueva Propuesta IA
            </button>
          )}
          <button onClick={handleExportPDF} className="btn btn-outline btn-sm gap-1.5">
            <FileText className="w-4 h-4 text-error" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ========================================================================= */}
        {/* RESUMEN DE OBJETIVOS NUTRICIONALES DIARIOS                                */}
        {/* ========================================================================= */}
        {objetivosNutricionales ? (
          <div className="bg-gradient-to-br from-success/10 via-base-200/50 to-base-200/30 p-5 rounded-2xl border border-success/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-success flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> OBJETIVO NUTRICIONAL DIARIO ESTIMADO
              </span>
              {objetivosNutricionales.resumenEstrategiaNutricional && (
                <span className="text-xs text-base-content/80 font-medium">
                  {objetivosNutricionales.resumenEstrategiaNutricional}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-base-100 p-3.5 rounded-xl border border-base-200 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                  🔥 Calorías Diarias
                </span>
                <span className="text-xl font-black text-base-content mt-0.5">
                  {objetivosNutricionales.caloriasObjetivoKcal}{" "}
                  <span className="text-xs font-normal opacity-70">kcal</span>
                </span>
              </div>

              <div className="bg-base-100 p-3.5 rounded-xl border border-base-200 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-bold text-error flex items-center gap-1">
                  🍗 Proteína
                </span>
                <span className="text-xl font-black text-base-content mt-0.5">
                  {objetivosNutricionales.proteinasObjetivoG}{" "}
                  <span className="text-xs font-normal opacity-70">g/día</span>
                </span>
              </div>

              <div className="bg-base-100 p-3.5 rounded-xl border border-base-200 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                  🍚 Carbohidratos
                </span>
                <span className="text-xl font-black text-base-content mt-0.5">
                  {objetivosNutricionales.carbohidratosObjetivoG}{" "}
                  <span className="text-xs font-normal opacity-70">g/día</span>
                </span>
              </div>

              <div className="bg-base-100 p-3.5 rounded-xl border border-base-200 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-bold text-success flex items-center gap-1">
                  🥑 Grasas
                </span>
                <span className="text-xl font-black text-base-content mt-0.5">
                  {objetivosNutricionales.grasasObjetivoG}{" "}
                  <span className="text-xs font-normal opacity-70">g/día</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-base-200/50 p-4 rounded-xl border border-base-300 text-xs flex items-center gap-2.5 text-base-content/70">
            <Info className="w-4 h-4 text-info shrink-0" />
            <span>Objetivos nutricionales diarios no disponibles para esta versión histórica.</span>
          </div>
        )}

        {/* Lineamientos y Pautas */}
        {lineamientosGenerales.length > 0 && (
          <div className="bg-base-200/40 p-4 rounded-xl border border-base-200 text-xs space-y-1.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-base-content flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-success" /> Lineamientos Nutricionales Clave
            </span>
            <ul className="list-disc list-inside space-y-1 text-base-content/80 mt-1">
              {lineamientosGenerales.map((lin: string, idx: number) => (
                <li key={idx}>{lin}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs por Momento de Comida */}
        <div className="flex flex-wrap gap-1.5 border-b border-base-200 pb-2">
          {MOMENTOS_COMIDA.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveTab(m.key)}
              className={`btn btn-xs rounded-lg font-bold transition-all ${
                activeTab === m.key ? "btn-success text-white shadow-xs" : "btn-ghost text-base-content/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Grid de Recetas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm flex items-center gap-2 text-base-content">
              <Utensils className="w-4 h-4 text-primary" />
              Recetas ({filteredRecetas.length} de {recetas.length} disponibles)
            </h4>
            <span className="text-[11px] opacity-70">Mínimo 20 recetas saludables</span>
          </div>

          {filteredRecetas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRecetas.map((receta: any, idx: number) => {
                const tieneDetalleIngredientes = Array.isArray(receta.ingredientesDetalle) && receta.ingredientesDetalle.length > 0;
                const tieneMacros = receta.macrosPorcion && typeof receta.macrosPorcion.caloriasKcal === "number";
                const porcionTexto = receta.porcion?.descripcion || (receta.porciones ? `${receta.porciones} porción` : "1 porción");

                return (
                  <div
                    key={receta.idReceta || idx}
                    className="p-5 bg-base-100 rounded-2xl border border-base-200 shadow-sm hover:border-success/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Encabezado de la Receta */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="badge badge-success/15 text-success font-bold text-[10px] uppercase tracking-wider">
                            {receta.momentoSugerido || receta.momento || "GENERAL"}
                          </span>
                          <h5 className="font-black text-base text-base-content mt-1">
                            {receta.nombreReceta || receta.nombre}
                          </h5>
                        </div>
                        <div className="text-right shrink-0 text-[11px] opacity-75 space-y-0.5">
                          {receta.tiempoPreparacionMinutos && (
                            <div className="flex items-center gap-1 justify-end font-medium">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span>{receta.tiempoPreparacionMinutos} min</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Porción */}
                      <div className="text-xs bg-base-200/50 px-3 py-1.5 rounded-lg text-base-content/80 font-medium flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-success shrink-0" />
                        <span>Porción: <strong>{porcionTexto}</strong></span>
                      </div>
                    </div>

                    {/* Lista Estructurada de Ingredientes */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-success uppercase tracking-wider block">
                        Ingredientes
                      </span>
                      <div className="bg-base-200/30 p-3 rounded-xl border border-base-200 text-xs">
                        {tieneDetalleIngredientes ? (
                          <ul className="space-y-1.5 divide-y divide-base-200/60">
                            {receta.ingredientesDetalle.map((ing: any, iIdx: number) => (
                              <li key={iIdx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                                <span className="font-medium text-base-content">• {ing.nombre}</span>
                                <span className="badge badge-sm badge-ghost font-bold text-primary shrink-0">
                                  {ing.cantidad} {ing.unidad}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="space-y-1 text-base-content/80">
                            {Array.isArray(receta.ingredientes) ? (
                              receta.ingredientes.map((ing: string, iIdx: number) => (
                                <li key={iIdx} className="text-[11px]">• {ing}</li>
                              ))
                            ) : (
                              <li className="text-[11px]">• {receta.ingredientes}</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Información Nutricional / Macros */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-base-content/80 uppercase tracking-wider block">
                        Valores Nutricionales por Porción
                      </span>
                      {tieneMacros ? (
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">Calorías</span>
                            <span className="font-black text-base-content text-sm">{receta.macrosPorcion.caloriasKcal}</span>
                            <span className="text-[9px] opacity-60 block">kcal</span>
                          </div>
                          <div className="bg-error/10 border border-error/20 p-2 rounded-xl">
                            <span className="text-[10px] text-error font-bold block">Proteína</span>
                            <span className="font-black text-base-content text-sm">{receta.macrosPorcion.proteinasG}g</span>
                            <span className="text-[9px] opacity-60 block">prot</span>
                          </div>
                          <div className="bg-primary/10 border border-primary/20 p-2 rounded-xl">
                            <span className="text-[10px] text-primary font-bold block">Carbos</span>
                            <span className="font-black text-base-content text-sm">{receta.macrosPorcion.carbohidratosG}g</span>
                            <span className="text-[9px] opacity-60 block">carbs</span>
                          </div>
                          <div className="bg-success/10 border border-success/20 p-2 rounded-xl">
                            <span className="text-[10px] text-success font-bold block">Grasas</span>
                            <span className="font-black text-base-content text-sm">{receta.macrosPorcion.grasasG}g</span>
                            <span className="text-[9px] opacity-60 block">grasas</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-base-200/40 p-2.5 rounded-xl border border-base-200 text-center text-[11px] text-base-content/60">
                          Información nutricional no disponible para esta receta.
                        </div>
                      )}
                    </div>

                    {/* Preparación */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                        Preparación
                      </span>
                      <div className="bg-base-200/30 p-3 rounded-xl border border-base-200">
                        {Array.isArray(receta.instrucciones) ? (
                          <ol className="list-decimal list-inside space-y-1 text-base-content/85 text-[11px]">
                            {receta.instrucciones.map((paso: string, pIdx: number) => (
                              <li key={pIdx}>{paso}</li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-[11px] text-base-content/85">{receta.instrucciones || receta.preparacion || "Según guía estándar."}</p>
                        )}
                      </div>
                    </div>

                    {/* Sustituciones y Beneficio Clave */}
                    {(receta.opcionesSustitucion || receta.beneficioClave) && (
                      <div className="space-y-1 text-[11px] bg-info/5 border border-info/20 p-2.5 rounded-xl text-base-content/80">
                        {receta.opcionesSustitucion && (
                          <p>
                            <strong className="text-info font-bold">Sustituciones:</strong> {receta.opcionesSustitucion}
                          </p>
                        )}
                        {receta.beneficioClave && (
                          <p className="mt-0.5">
                            <strong className="text-success font-bold">Beneficio:</strong> {receta.beneficioClave}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs opacity-60 text-center py-6">
              No se encontraron recetas para este momento de comida.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
