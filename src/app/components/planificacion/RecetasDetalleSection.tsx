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
} from "lucide-react";
import { toast } from "sonner";
import { getDetallePlanAlimentacionActivo } from "@/app/actions/operaciones-planes";
import { exportarPlanAlimentacionPDF } from "@/app/actions/planes-export";

interface Props {
  socioId: string;
}

const MOMENTOS_COMIDA = [
  { key: "TODOS", label: "Todas las Recetas (20+)" },
  { key: "DESAYUNO", label: "Desayunos" },
  { key: "ALMUERZO", label: "Almuerzos" },
  { key: "CENA", label: "Cenas" },
  { key: "SNACK_PRE", label: "Snacks Pre-Entreno" },
  { key: "SNACK_POST", label: "Snacks Post-Entreno" },
];

export default function RecetasDetalleSection({ socioId }: Props) {
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
      <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
        <span className="text-xs opacity-70">Cargando recetas y plan nutricional...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-base-100 rounded-2xl border border-base-200 text-center text-xs opacity-70">
        No se encontró un plan de alimentación activo para este socio.
      </div>
    );
  }

  const recetas = data.contenido?.recetas || [];
  const filteredRecetas =
    activeTab === "TODOS"
      ? recetas
      : recetas.filter((r: any) => r.momentoSugerido === activeTab || r.momento === activeTab);

  return (
    <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-6">
      {/* Header Plan Nutricional Active Details */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-lg text-base-content">{data.titulo}</h3>
            <span className="badge badge-primary text-white text-xs font-bold">v{data.version}</span>
            <span className="badge badge-success text-white text-xs font-bold">ACTIVO</span>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            Hidratación: <strong>{data.recomendacionHidratacion || "2.5 - 3 Litros/día"}</strong> • Inicio: {data.fechaInicio}
          </p>
        </div>

        <button onClick={handleExportPDF} className="btn btn-outline btn-sm gap-2">
          <FileText className="w-4 h-4 text-error" />
          Exportar PDF
        </button>
      </div>

      {/* Tabs por Momento de Comida */}
      <div className="flex flex-wrap gap-1 border-b border-base-200 pb-2">
        {MOMENTOS_COMIDA.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveTab(m.key)}
            className={`btn btn-xs ${
              activeTab === m.key ? "btn-primary text-white" : "btn-ghost text-base-content/70"
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
          <span className="text-[11px] opacity-70">Garantía: Mínimo 20 recetas</span>
        </div>

        {filteredRecetas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecetas.map((receta: any, idx: number) => (
              <div key={idx} className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-2">
                <div className="flex items-center justify-between border-b border-base-300/50 pb-2">
                  <h5 className="font-bold text-xs text-base-content">{receta.nombreReceta || receta.nombre}</h5>
                  <span className="badge badge-sm badge-outline uppercase text-[10px]">
                    {receta.momentoSugerido || receta.momento || "GENERAL"}
                  </span>
                </div>

                <div className="text-xs space-y-1 opacity-90">
                  <p><span className="font-bold text-primary">Ingredientes:</span> {Array.isArray(receta.ingredientes) ? receta.ingredientes.join(", ") : receta.ingredientes}</p>
                  <p><span className="font-bold text-secondary">Preparación:</span> {receta.instrucciones || receta.preparacion || "Según guía estándar"}</p>
                  {receta.opcionesSustitucion && (
                    <p className="text-[11px] text-info"><span className="font-bold">Sustituciones:</span> {receta.opcionesSustitucion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs opacity-60 text-center py-4">No se encontraron recetas para este momento de comida.</p>
        )}
      </div>
    </div>
  );
}
