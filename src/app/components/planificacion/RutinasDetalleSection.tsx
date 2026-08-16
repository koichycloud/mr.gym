"use client";

import { useState, useEffect } from "react";
import {
  Dumbbell,
  Clock,
  Layers,
  Edit3,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDetallePlanEntrenamientoActivo,
  ajustarOperativamentePlanEntrenamiento,
} from "@/app/actions/operaciones-planes";
import { exportarPlanEntrenamientoPDF } from "@/app/actions/planes-export";

interface Props {
  socioId: string;
}

export default function RutinasDetalleSection({ socioId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNivel, setSelectedNivel] = useState(0);
  const [editingExercise, setEditingExercise] = useState<{
    nivelIdx: number;
    rutinaIdx: number;
    ejercicioIdx: number;
    nombre: string;
    series: number;
    repeticiones: string;
    descansoSegundos: number;
    observaciones: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDetallePlanEntrenamientoActivo(socioId);
      if (res.success && res.plan) {
        setData(res.plan);
        if (res.plan.nivelActual) {
          setSelectedNivel(Math.max(0, Math.min(5, res.plan.nivelActual - 1)));
        }
      }
    } catch (err) {
      toast.error("Error al cargar detalles de la rutina.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [socioId]);

  const handleExportPDF = async () => {
    if (!data?.id) return;
    toast.info("Generando PDF de la rutina...");
    try {
      const res = await exportarPlanEntrenamientoPDF({ planId: data.id });
      if (res.success && res.base64Pdf) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${res.base64Pdf}`;
        link.download = `Rutina_${data.titulo}_v${data.version}.pdf`;
        link.click();
        toast.success("PDF generado exitosamente.");
      } else {
        toast.error(res.error || "Error al exportar PDF.");
      }
    } catch (err) {
      toast.error("Error al procesar exportación PDF.");
    }
  };

  const handleSaveAdjustment = async () => {
    if (!editingExercise || !data) return;
    setSaving(true);
    try {
      const res = await ajustarOperativamentePlanEntrenamiento({
        socioId,
        planId: data.id,
        nivelIdx: editingExercise.nivelIdx,
        rutinaIdx: editingExercise.rutinaIdx,
        ejercicioIdx: editingExercise.ejercicioIdx,
        series: editingExercise.series,
        repeticiones: editingExercise.repeticiones,
        descansoSegundos: editingExercise.descansoSegundos,
        observaciones: editingExercise.observaciones,
      });

      if (res.success) {
        toast.success("Ajuste operativo guardado.");
        setEditingExercise(null);
        loadData();
      } else {
        toast.error(res.error || "Error al guardar ajuste.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error de ajuste operativo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
        <span className="text-xs opacity-70">Cargando rutinas y 6 niveles de entrenamiento...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-base-100 rounded-2xl border border-base-200 text-center text-xs opacity-70">
        No se encontró un plan de entrenamiento activo para este socio.
      </div>
    );
  }

  const niveles = data.contenido?.nivelesProgresivos || [];
  const currentNivelData = niveles[selectedNivel] || {};
  const rutinas = currentNivelData.rutinas || [];

  return (
    <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-6">
      {/* Header Plan Active Details */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-lg text-base-content">{data.titulo}</h3>
            <span className="badge badge-primary text-white text-xs font-bold">v{data.version}</span>
            <span className="badge badge-success text-white text-xs font-bold">ACTIVO</span>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            Split: <strong>{data.splitSugerido || "General"}</strong> • Frecuencia: <strong>{data.frecuenciaSemanal} días/semana</strong> • Inicio: {data.fechaInicio}
          </p>
        </div>

        <button onClick={handleExportPDF} className="btn btn-outline btn-sm gap-2">
          <FileText className="w-4 h-4 text-error" />
          Exportar PDF
        </button>
      </div>

      {/* Selector de 6 Niveles Progresivos */}
      <div>
        <label className="label text-xs font-bold uppercase text-base-content/70">
          Niveles Progresivos de Entrenamiento:
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {niveles.map((n: any, idx: number) => {
            const isCurrent = data.nivelActual === idx + 1;
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
                {isCurrent && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-base-100" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rutinas del Nivel Seleccionado */}
      <div className="space-y-4">
        <h4 className="font-extrabold text-sm flex items-center gap-2 text-base-content">
          <Layers className="w-4 h-4 text-primary" />
          Rutinas del Nivel {selectedNivel + 1} ({currentNivelData.enfoqueNivel || "Progreso técnico"})
        </h4>

        {rutinas.length > 0 ? (
          <div className="space-y-4">
            {rutinas.map((rutina: any, rIdx: number) => (
              <div key={rIdx} className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-primary flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    Día {rutina.diaSemana || rIdx + 1}: {rutina.nombreRutina || `Sesión ${rIdx + 1}`}
                  </h5>
                  <span className="text-[11px] opacity-70">Enfoque: {rutina.enfoqueSesion || "General"}</span>
                </div>

                {/* Lista de Ejercicios */}
                <div className="overflow-x-auto">
                  <table className="table table-xs w-full bg-base-100 rounded-lg">
                    <thead>
                      <tr>
                        <th>Ejercicio</th>
                        <th>Series</th>
                        <th>Repeticiones</th>
                        <th>Descanso</th>
                        <th>Instrucciones</th>
                        <th className="text-right">Ajuste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rutina.ejercicios || []).map((ej: any, eIdx: number) => (
                        <tr key={eIdx}>
                          <td className="font-bold text-base-content">{ej.nombreEjercicio || ej.nombre}</td>
                          <td><span className="badge badge-ghost font-bold">{ej.series}</span></td>
                          <td>{ej.repeticiones}</td>
                          <td>{ej.descansoSegundos || 60} seg</td>
                          <td className="text-[11px] opacity-80 max-w-xs truncate">{ej.instrucciones || ej.observaciones || "-"}</td>
                          <td className="text-right">
                            <button
                              onClick={() =>
                                setEditingExercise({
                                  nivelIdx: selectedNivel,
                                  rutinaIdx: rIdx,
                                  ejercicioIdx: eIdx,
                                  nombre: ej.nombreEjercicio || ej.nombre,
                                  series: ej.series,
                                  repeticiones: ej.repeticiones,
                                  descansoSegundos: ej.descansoSegundos || 60,
                                  observaciones: ej.instrucciones || ej.observaciones || "",
                                })
                              }
                              className="btn btn-ghost btn-xs text-primary"
                              title="Ajustar ejercicio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs opacity-60 text-center py-4">No hay rutinas definidas para este nivel.</p>
        )}
      </div>

      {/* Modal Ajuste Operativo */}
      {editingExercise && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md rounded-2xl p-6">
            <h4 className="font-bold text-sm mb-3 text-base-content flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              Ajuste Operativo: {editingExercise.nombre}
            </h4>

            <div className="space-y-3 text-xs">
              <div className="form-control">
                <label className="label font-bold">Series:</label>
                <input
                  type="number"
                  value={editingExercise.series}
                  onChange={(e) => setEditingExercise({ ...editingExercise, series: parseInt(e.target.value) || 1 })}
                  className="input input-sm input-bordered"
                  min={1}
                  max={20}
                />
              </div>

              <div className="form-control">
                <label className="label font-bold">Repeticiones:</label>
                <input
                  type="text"
                  value={editingExercise.repeticiones}
                  onChange={(e) => setEditingExercise({ ...editingExercise, repeticiones: e.target.value })}
                  className="input input-sm input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label font-bold">Descanso (Segundos):</label>
                <input
                  type="number"
                  value={editingExercise.descansoSegundos}
                  onChange={(e) => setEditingExercise({ ...editingExercise, descansoSegundos: parseInt(e.target.value) || 0 })}
                  className="input input-sm input-bordered"
                  min={0}
                  max={600}
                />
              </div>

              <div className="form-control">
                <label className="label font-bold">Instrucciones / Observaciones:</label>
                <textarea
                  value={editingExercise.observaciones}
                  onChange={(e) => setEditingExercise({ ...editingExercise, observaciones: e.target.value })}
                  className="textarea textarea-bordered text-xs"
                  rows={2}
                />
              </div>
            </div>

            <div className="modal-action pt-3">
              <button onClick={() => setEditingExercise(null)} className="btn btn-ghost btn-sm">
                Cancelar
              </button>
              <button onClick={handleSaveAdjustment} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
