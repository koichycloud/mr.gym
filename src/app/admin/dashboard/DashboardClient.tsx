"use client";

import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Dumbbell,
  Sparkles,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  UserCheck,
  Activity,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getExecutiveDashboardMetrics,
  getExecutiveReportData,
  exportExecutiveReportCSV,
  exportExecutiveReportPDF,
  DashboardFilters,
} from "@/app/actions/admin-dashboard";

interface Props {
  initialMetrics: any;
}

export default function DashboardClient({ initialMetrics }: Props) {
  const [metrics, setMetrics] = useState<any>(initialMetrics?.data || null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ periodo: "30d" });

  // Estados de reportes
  const [selectedReport, setSelectedReport] = useState<"SOCIOS" | "INGRESOS" | "ASISTENCIA" | "SUSCRIPCIONES" | "PERSONAL">("SOCIOS");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadMetrics = async (newFilters: DashboardFilters) => {
    setLoading(true);
    try {
      const res = await getExecutiveDashboardMetrics(newFilters);
      if (res.success && res.data) {
        setMetrics(res.data);
      } else {
        toast.error(res.error || "Error al actualizar métricas.");
      }
    } catch (err: any) {
      toast.error("Error de conexión al cargar métricas.");
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      const res = await getExecutiveReportData(selectedReport, filters);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        toast.error(res.error || "Error al cargar datos del reporte.");
      }
    } catch (err: any) {
      toast.error("Error al obtener datos del reporte.");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedReport, filters]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const periodo = e.target.value as any;
    const updated = { ...filters, periodo };
    setFilters(updated);
    loadMetrics(updated);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await exportExecutiveReportCSV(selectedReport, filters);
      if (res.success && res.csvContent && res.filename) {
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Reporte ${selectedReport} descargado en CSV.`);
      } else {
        toast.error(res.error || "Error al exportar CSV.");
      }
    } catch (err: any) {
      toast.error("Error en la descarga del CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await exportExecutiveReportPDF(selectedReport, filters);
      if (res.success && res.pdfBase64 && res.filename) {
        const linkSource = `data:application/pdf;base64,${res.pdfBase64}`;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = res.filename;
        downloadLink.click();
        toast.success(`Reporte ${selectedReport} descargado en PDF.`);
      } else {
        toast.error(res.error || "Error al exportar PDF.");
      }
    } catch (err: any) {
      toast.error("Error en la descarga del PDF.");
    } finally {
      setExporting(false);
    }
  };

  const kpis = metrics?.kpis || {};
  const entrenadoresStats = metrics?.entrenadoresStats || [];
  const alertas = metrics?.alertas || [];
  const actividad = metrics?.actividadReciente || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Encabezado y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-base-content flex items-center gap-2">
            <BarChart3 className="text-primary w-8 h-8" />
            Dashboard Ejecutivo Mr. Gym
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Centro gerencial de control operativo, rendimiento comercial y métricas de negocio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-base-content/70 uppercase">Período:</label>
          <select
            value={filters.periodo}
            onChange={handlePeriodChange}
            disabled={loading}
            className="select select-bordered select-sm font-medium bg-base-200"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes anterior</option>
            <option value="this_year">Este año</option>
          </select>
          <button
            onClick={() => loadMetrics(filters)}
            disabled={loading}
            className="btn btn-sm btn-ghost btn-square"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alertas Ejecutivas */}
      {alertas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertas.map((al: any, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-center justify-between ${
                al.severidad === "error"
                  ? "bg-error/10 border-error/30 text-error"
                  : "bg-warning/10 border-warning/30 text-warning-content"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">{al.titulo}</h4>
                  <p className="text-xs opacity-90">{al.descripcion}</p>
                </div>
              </div>
              <Link href={al.enlace} className="btn btn-xs btn-outline">
                Ver detalle
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Bloque A — Tarjetas KPI Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total & Socios Activos */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs font-bold uppercase">Socios Activos</div>
            <div className="stat-value text-primary text-2xl md:text-3xl">{kpis.sociosActivos || 0}</div>
            <div className="stat-desc">Totales: {kpis.totalSocios || 0}</div>
          </div>
        </div>

        {/* Ingresos del Período */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-success">
              <DollarSign className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs font-bold uppercase">Ingresos</div>
            <div className="stat-value text-success text-2xl md:text-3xl">S/ {kpis.totalIngresos || 0}</div>
            <div className="stat-desc">{kpis.totalOperaciones || 0} cobros | Prom: S/ {kpis.ticketPromedio || 0}</div>
          </div>
        </div>

        {/* Asistencias del Período */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-accent">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs font-bold uppercase">Asistencias</div>
            <div className="stat-value text-accent text-2xl md:text-3xl">{kpis.asistenciasTotales || 0}</div>
            <div className="stat-desc">{kpis.sociosUnicosAsistentes || 0} socios únicos</div>
          </div>
        </div>

        {/* Tasa de Renovación */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-info">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="stat-title text-xs font-bold uppercase">Tasa Renovación</div>
            <div className="stat-value text-info text-2xl md:text-3xl">{kpis.tasaRenovacion || 0}%</div>
            <div className="stat-desc">Activas: {kpis.suscripcionesActivas || 0}</div>
          </div>
        </div>
      </div>

      {/* Sección 2 — Rendimiento Operativo & Planificación IA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rendimiento de Entrenadores */}
        <div className="md:col-span-2 bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2 text-base-content">
              <UserCheck className="text-primary w-5 h-5" />
              Rendimiento Operativo de Entrenadores
            </h3>
            <span className="badge badge-neutral text-xs">{entrenadoresStats.length} Activos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Entrenador</th>
                  <th>Socios Asignados</th>
                  <th>Propuestas Pendientes</th>
                  <th>Propuestas Aprobadas</th>
                </tr>
              </thead>
              <tbody>
                {entrenadoresStats.length > 0 ? (
                  entrenadoresStats.map((ent: any) => (
                    <tr key={ent.id}>
                      <td className="font-semibold">{ent.nombre} <span className="text-xs text-base-content/50">({ent.codigo})</span></td>
                      <td><span className="badge badge-outline">{ent.sociosAsignados}</span></td>
                      <td>
                        {ent.propuestasPendientes > 0 ? (
                          <span className="badge badge-warning text-xs font-bold">{ent.propuestasPendientes}</span>
                        ) : (
                          <span className="text-xs opacity-50">0</span>
                        )}
                      </td>
                      <td><span className="badge badge-success text-xs font-bold">{ent.propuestasAprobadas}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-4 opacity-50 text-xs">
                      No hay datos de entrenadores en el período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tarjeta Resumen de Planificación IA */}
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-base-content">
                <Sparkles className="text-secondary w-5 h-5" />
                Motor IA & Observabilidad
              </h3>
              <span className="badge badge-secondary text-xs font-bold">Mock Provider</span>
            </div>
            <p className="text-xs text-base-content/70">
              Resumen ejecutivo de generaciones y aprobaciones de planes personalizados.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-base-200">
                <span className="opacity-70">Generaciones Totales:</span>
                <span className="font-bold">{kpis.generacionesIATotales || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-base-200">
                <span className="opacity-70">Planes Aprobados:</span>
                <span className="font-bold text-success">{kpis.aprobacionesIATotales || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-base-200">
                <span className="opacity-70">Revisiones Humanas:</span>
                <span className="font-bold text-warning">{kpis.revisionesHumanasCount || 0}</span>
              </div>
            </div>
          </div>

          <Link href="/admin/ia" className="btn btn-secondary btn-sm w-full gap-2 mt-4">
            <Activity className="w-4 h-4" />
            Abrir Monitoreo IA
          </Link>
        </div>
      </div>

      {/* Sección 3 — Centro de Reportes & Exportación */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-base-200 pb-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-base-content">
              <FileText className="text-primary w-6 h-6" />
              Reportes Administrativos y Exportación
            </h3>
            <p className="text-xs text-base-content/70">
              Generación de informes ejecutivos con descarga en CSV y PDF.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || reportData.length === 0}
              className="btn btn-outline btn-sm gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting || reportData.length === 0}
              className="btn btn-primary btn-sm gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Tabs de Selección de Reporte */}
        <div className="flex overflow-x-auto gap-2 border-b border-base-200 pb-2">
          {(["SOCIOS", "INGRESOS", "ASISTENCIA", "SUSCRIPCIONES", "PERSONAL"] as const).map((rep) => (
            <button
              key={rep}
              onClick={() => setSelectedReport(rep)}
              className={`btn btn-xs md:btn-sm ${selectedReport === rep ? "btn-primary" : "btn-ghost"}`}
            >
              Reporte {rep}
            </button>
          ))}
        </div>

        {/* Tabla de Reporte */}
        <div className="overflow-x-auto max-h-96">
          {loadingReport ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reportData.length > 0 ? (
            <table className="table table-xs md:table-sm w-full">
              <thead>
                <tr>
                  {Object.keys(reportData[0]).map((h) => (
                    <th key={h} className="uppercase text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0, 50).map((row: any, idx: number) => (
                  <tr key={idx}>
                    {Object.values(row).map((val: any, vIdx: number) => (
                      <td key={vIdx} className="text-xs">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center py-8 opacity-50 text-sm">
              No existen datos registrados para el reporte {selectedReport} en el período seleccionado.
            </p>
          )}
        </div>
      </div>

      {/* Sección 4 — Actividad Reciente AuditLog */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-base-content">
          <Activity className="text-info w-5 h-5" />
          Bitácora de Actividad Reciente
        </h3>

        <div className="space-y-2">
          {actividad.length > 0 ? (
            actividad.map((act: any) => (
              <div key={act.id} className="p-3 bg-base-200/50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-primary">{act.usuario}</span>
                  <span className="mx-2 font-semibold uppercase opacity-80">{act.accion}</span>
                  <span className="opacity-60">{act.detalles?.slice(0, 60)}</span>
                </div>
                <span className="opacity-50 shrink-0">{new Date(act.fecha).toLocaleString("es-PE")}</span>
              </div>
            ))
          ) : (
            <p className="text-center py-4 opacity-50 text-xs">No hay actividad reciente registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
