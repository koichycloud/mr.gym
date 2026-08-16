"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
  Loader2,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
  BarChart2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdherenciaYCumplimientoSocio,
  registrarObservacionAdherencia,
  AdherenceState,
} from "@/app/actions/adherencia-plan";

interface Props {
  socioId: string;
}

export default function AdherenciaSection({ socioId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodoDias, setPeriodoDias] = useState<number>(30);
  const [observacionInput, setObservacionInput] = useState("");
  const [savingObs, setSavingObs] = useState(false);

  const loadData = async (dias: number = periodoDias) => {
    setLoading(true);
    try {
      const res = await getAdherenciaYCumplimientoSocio(socioId, dias);
      if (res.success && res.data) {
        setData(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error("Error al cargar datos de adherencia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(periodoDias);
  }, [socioId, periodoDias]);

  const handleRegisterObs = async () => {
    if (!observacionInput.trim()) {
      toast.error("Ingrese una observación.");
      return;
    }
    setSavingObs(true);
    try {
      const res = await registrarObservacionAdherencia({
        socioId,
        observacion: observacionInput,
      });

      if (res.success) {
        toast.success(res.mensaje || "Observación guardada.");
        setObservacionInput("");
        loadData(periodoDias);
      } else {
        toast.error(res.error || "Error al guardar observación.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la observación.");
    } finally {
      setSavingObs(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-base-100 rounded-2xl border border-base-200 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
        <span className="text-xs opacity-70">Calculando adherencia y sesiones del socio...</span>
      </div>
    );
  }

  if (!data) return null;

  const {
    diasProgramadosPorSemana,
    sesionesProgramadas,
    sesionesRegistradas,
    porcentajeAdherencia,
    estadoAdherencia,
    alertasOperativas = [],
    asistenciasDetalle = [],
    observacionesHistorial = [],
  } = data;

  const getAdherenceBadge = (status: AdherenceState) => {
    switch (status) {
      case "EXCELENTE_ADHERENCIA":
        return <span className="badge badge-success text-white font-bold gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Excelente ({porcentajeAdherencia}%)</span>;
      case "BUENA_ADHERENCIA":
        return <span className="badge badge-info text-white font-bold gap-1"><Activity className="w-3.5 h-3.5" /> Buena ({porcentajeAdherencia}%)</span>;
      case "ADHERENCIA_MODERADA":
        return <span className="badge badge-warning font-bold gap-1"><Activity className="w-3.5 h-3.5" /> Moderada ({porcentajeAdherencia}%)</span>;
      case "BAJA_ADHERENCIA":
        return <span className="badge badge-error text-white font-bold gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Baja ({porcentajeAdherencia}%)</span>;
      default:
        return <span className="badge badge-ghost font-bold gap-1"><Info className="w-3.5 h-3.5" /> Sin Datos</span>;
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm space-y-6">
      {/* Header & Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
        <div>
          <h3 className="font-extrabold text-lg text-base-content flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Adherencia y Cumplimiento del Plan
          </h3>
          <p className="text-xs text-base-content/70 mt-0.5">
            Seguimiento de visitas al gimnasio en relación a la frecuencia de días programados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold opacity-70">Periodo:</span>
          <button
            onClick={() => setPeriodoDias(7)}
            className={`btn btn-xs ${periodoDias === 7 ? "btn-primary text-white" : "btn-ghost"}`}
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => setPeriodoDias(30)}
            className={`btn btn-xs ${periodoDias === 30 ? "btn-primary text-white" : "btn-ghost"}`}
          >
            Últimos 30 días
          </button>
        </div>
      </div>

      {/* Alertas Operativas Non-Clinical */}
      {alertasOperativas.length > 0 && (
        <div className="alert alert-warning shadow-sm border border-warning/30 rounded-xl text-xs">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <div>
            <h4 className="font-bold uppercase text-[11px] opacity-90">Observación de Asistencia Operativa</h4>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {alertasOperativas.map((al: string, idx: number) => (
                <li key={idx}>{al}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-1">
          <span className="text-xs font-bold opacity-70">Estado de Adherencia:</span>
          <div className="mt-1">{getAdherenceBadge(estadoAdherencia)}</div>
        </div>

        <div className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-1">
          <span className="text-xs font-bold opacity-70">Sesiones Esperadas:</span>
          <p className="font-extrabold text-lg text-base-content">{sesionesProgramadas} sesiones</p>
          <p className="text-[11px] opacity-60">Basado en {diasProgramadosPorSemana} días/semana</p>
        </div>

        <div className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-1">
          <span className="text-xs font-bold opacity-70">Visitas Registradas:</span>
          <p className="font-extrabold text-lg text-primary">{sesionesRegistradas} visitas</p>
          <p className="text-[11px] opacity-60">En los últimos {periodoDias} días</p>
        </div>

        <div className="p-4 bg-base-200/40 rounded-xl border border-base-300 space-y-1">
          <span className="text-xs font-bold opacity-70">Cumplimiento Estimado:</span>
          <p className="font-extrabold text-lg text-success">{porcentajeAdherencia}%</p>
          <progress className="progress progress-success w-full" value={porcentajeAdherencia} max="100"></progress>
        </div>
      </div>

      {/* Registro de Observaciones del Entrenador */}
      <div className="p-4 bg-base-200/50 rounded-xl border border-base-300 space-y-3">
        <h4 className="font-bold text-xs flex items-center gap-1.5 text-base-content">
          <MessageSquare className="w-4 h-4 text-primary" />
          Registrar Observación de Cumplimiento Operativo
        </h4>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={observacionInput}
            onChange={(e) => setObservacionInput(e.target.value)}
            className="input input-sm input-bordered flex-1 text-xs"
            placeholder="Ej. Socio completó la rutina con buena disposición..."
            maxLength={500}
          />
          <button
            onClick={handleRegisterObs}
            disabled={savingObs || !observacionInput.trim()}
            className="btn btn-primary btn-sm text-white"
          >
            {savingObs ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Observación"}
          </button>
        </div>
      </div>

      {/* Historial de Visitas y Observaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla Asistencias */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs opacity-80 uppercase tracking-wider">Visitas al Gimnasio Registradas</h4>
          {asistenciasDetalle.length > 0 ? (
            <div className="overflow-x-auto max-h-56">
              <table className="table table-xs w-full bg-base-200/30">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {asistenciasDetalle.map((a: any) => (
                    <tr key={a.id}>
                      <td className="font-bold">{a.fecha}</td>
                      <td>{a.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs opacity-60 py-3 italic">Sin visitas registradas en este periodo.</p>
          )}
        </div>

        {/* Historial Observaciones */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs opacity-80 uppercase tracking-wider">Observaciones Registradas del Entrenador</h4>
          {observacionesHistorial.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {observacionesHistorial.map((obs: any) => (
                <div key={obs.id} className="p-2.5 bg-base-200/40 rounded-lg text-xs border border-base-300">
                  <div className="flex justify-between font-bold opacity-80">
                    <span>{obs.usuario}</span>
                    <span className="text-[10px] opacity-60">{obs.fecha}</span>
                  </div>
                  <p className="mt-1 opacity-90">{obs.observacion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs opacity-60 py-3 italic">Sin observaciones operativas registradas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
