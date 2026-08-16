"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Dumbbell,
  Apple,
  Info,
  Loader2,
  BarChart2,
  ShieldAlert,
  FileCheck,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { getEvolucionYSeguimientoSocio } from "@/app/actions/evolucion-plan";
import RevisionPlanModal from "./RevisionPlanModal";

interface Props {
  socioId: string;
}

export default function EvolucionSocioSection({ socioId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEvolucionYSeguimientoSocio(socioId);
      if (res.success && res.data) {
        setData(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error("Error al cargar evolución del socio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [socioId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-base-100 rounded-2xl border border-base-200 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-sm font-semibold opacity-70">Cargando evolución física y progreso del socio...</span>
      </div>
    );
  }

  if (!data) return null;

  const {
    medidasHistorial = [],
    comparativaActual,
    perfilPlanificacion,
    planEntrenamientoActivo,
    planAlimentacionActivo,
    adherenciaAsistencia,
    estadoEvolucion,
    alertasRevision = [],
  } = data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "EVOLUCION_FAVORABLE":
        return <span className="badge badge-success text-white gap-1 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Evolución Favorable</span>;
      case "EVOLUCION_ESTABLE":
        return <span className="badge badge-info text-white gap-1 font-bold"><Activity className="w-3.5 h-3.5" /> Evolución Estable</span>;
      case "REQUIERE_REVISION":
        return <span className="badge badge-warning gap-1 font-bold"><AlertTriangle className="w-3.5 h-3.5" /> Requiere Revisión</span>;
      case "SIN_DATOS_RECIENTES":
        return <span className="badge badge-error text-white gap-1 font-bold"><Clock className="w-3.5 h-3.5" /> Sin Datos Recientes</span>;
      default:
        return <span className="badge badge-ghost gap-1 font-bold"><Info className="w-3.5 h-3.5" /> Sin Mediciones Suficientes</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-base-content flex items-center gap-2">
            <TrendingUp className="text-primary w-6 h-6" />
            Seguimiento de Evolución del Socio
          </h3>
          <p className="text-xs text-base-content/70 mt-1">
            Historial de cambios antropométricos, adherencia al plan y estado derivado de progreso.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge(estadoEvolucion)}
          {perfilPlanificacion && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="btn btn-primary btn-sm gap-2 text-white shadow-sm"
            >
              <FileCheck className="w-4 h-4" />
              Revisar Plan
            </button>
          )}
        </div>
      </div>

      {/* Alertas de Revisión del Entrenador */}
      {alertasRevision.length > 0 && (
        <div className="alert alert-warning shadow-sm border border-warning/30 rounded-xl">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold uppercase text-[11px] opacity-90">Recomendaciones Operativas para el Entrenador</h4>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {alertasRevision.map((al: string, idx: number) => (
                <li key={idx}>{al}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Grid de Estado: Plan Activo + Asistencia + Comparativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Plan Activo */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-3">
          <h4 className="font-extrabold text-sm flex items-center gap-2 text-base-content">
            <Dumbbell className="text-primary w-4 h-4" />
            Plan Activo y Objetivos
          </h4>
          <div className="text-xs space-y-1.5 opacity-90">
            <p><span className="font-bold">Objetivo Principal:</span> {perfilPlanificacion?.objetivoPrincipal || "No asignado"}</p>
            <p><span className="font-bold">Nivel:</span> {perfilPlanificacion?.nivel || "N/A"}</p>
            <p><span className="font-bold">Plan Entrenamiento:</span> {planEntrenamientoActivo ? `${planEntrenamientoActivo.titulo} (v${planEntrenamientoActivo.version})` : "Sin plan activo"}</p>
            <p><span className="font-bold">Plan Alimentación:</span> {planAlimentacionActivo ? `${planAlimentacionActivo.titulo} (v${planAlimentacionActivo.version})` : "Sin plan activo"}</p>
          </div>
        </div>

        {/* Card Adherencia Asistencia */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-3">
          <h4 className="font-extrabold text-sm flex items-center gap-2 text-base-content">
            <Calendar className="text-info w-4 h-4" />
            Adherencia de Asistencia
          </h4>
          <div className="text-xs space-y-1.5 opacity-90">
            <p><span className="font-bold">Visitas 30 días:</span> {adherenciaAsistencia?.totalAsistencias30Dias || 0} asistencias</p>
            <p><span className="font-bold">Frecuencia Promedio:</span> {adherenciaAsistencia?.frecuenciaSemanalEstimada || 0} días/semana</p>
            <p><span className="font-bold">Frecuencia Objetivo:</span> {perfilPlanificacion?.diasPorSemana ? `${perfilPlanificacion.diasPorSemana} días/semana` : "N/A"}</p>
          </div>
        </div>

        {/* Card Variación Peso / Grasa */}
        <div className="bg-base-100 p-5 rounded-2xl border border-base-200 shadow-sm space-y-3">
          <h4 className="font-extrabold text-sm flex items-center gap-2 text-base-content">
            <Activity className="text-success w-4 h-4" />
            Variación Antropométrica
          </h4>
          {comparativaActual ? (
            <div className="text-xs space-y-1 opacity-90">
              <p><span className="font-bold">Peso:</span> {comparativaActual.peso.actual} kg ({comparativaActual.peso.delta > 0 ? `+${comparativaActual.peso.delta}` : comparativaActual.peso.delta} kg)</p>
              <p><span className="font-bold">% Grasa:</span> {comparativaActual.porcentajeGrasa.actual || "N/A"} % ({comparativaActual.porcentajeGrasa.delta > 0 ? `+${comparativaActual.porcentajeGrasa.delta}` : comparativaActual.porcentajeGrasa.delta} %)</p>
              <p><span className="font-bold">Cintura:</span> {comparativaActual.cintura.actual || "N/A"} cm ({comparativaActual.cintura.delta > 0 ? `+${comparativaActual.cintura.delta}` : comparativaActual.cintura.delta} cm)</p>
              <p className="text-[10px] text-base-content/60 mt-1">Comparando {comparativaActual.fechaActual} vs {comparativaActual.fechaAnterior}</p>
            </div>
          ) : (
            <p className="text-xs opacity-60">Se requiere al menos 2 mediciones completas para mostrar variaciones.</p>
          )}
        </div>
      </div>

      {/* Historial de Mediciones Físicas */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-4">
        <h4 className="font-extrabold text-base flex items-center gap-2 text-base-content">
          <BarChart2 className="text-primary w-5 h-5" />
          Historial de Mediciones Físicas
        </h4>

        {medidasHistorial.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-xs md:table-sm w-full">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Peso (kg)</th>
                  <th>% Grasa</th>
                  <th>% Músculo</th>
                  <th>Cintura (cm)</th>
                  <th>Pecho (cm)</th>
                  <th>Bíceps (cm)</th>
                  <th>Glúteos (cm)</th>
                </tr>
              </thead>
              <tbody>
                {medidasHistorial.map((m: any) => (
                  <tr key={m.id}>
                    <td className="font-bold">{m.fecha}</td>
                    <td>{m.peso || "-"}</td>
                    <td>{m.porcentajeGrasa ? `${m.porcentajeGrasa}%` : "-"}</td>
                    <td>{m.porcentajeMusculo ? `${m.porcentajeMusculo}%` : "-"}</td>
                    <td>{m.cintura || "-"}</td>
                    <td>{m.pecho || "-"}</td>
                    <td>{m.biceps || "-"}</td>
                    <td>{m.gluteos || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-base-content/60 py-4 text-center">No existen evaluaciones físicas registradas para este socio.</p>
        )}
      </div>

      {/* Modal de Revisión del Plan */}
      {showRevisionModal && perfilPlanificacion && (
        <RevisionPlanModal
          socioId={socioId}
          perfilId={perfilPlanificacion.id}
          perfilVersion={perfilPlanificacion.version}
          datosEvolucion={data}
          onClose={() => setShowRevisionModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
