"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Zap,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  BarChart3,
  Layers,
  FileText,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  getAIObservabilityMetrics,
  getGeneracionesIAHistory,
  getGeneracionIADetail,
} from "@/app/actions/ai-observability";
import ProposalViewerModal from "@/app/components/planificacion/ProposalViewerModal";

interface Props {
  initialMetrics?: any;
  initialHistory?: any;
}

export default function IAObservabilityClient({ initialMetrics, initialHistory }: Props) {
  const [metrics, setMetrics] = useState<any>(initialMetrics || null);
  const [history, setHistory] = useState<any>(initialHistory || null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [modeloFilter, setModeloFilter] = useState<string>("");
  const [reviewFilter, setReviewFilter] = useState<string>("");
  const [desdeFilter, setDesdeFilter] = useState<string>("");
  const [hastaFilter, setHastaFilter] = useState<string>("");

  // Paginación
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal de Detalle
  const [selectedGeneracion, setSelectedGeneracion] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await getAIObservabilityMetrics({
        estado: (estadoFilter as any) || undefined,
        modelo: modeloFilter || undefined,
        requiresHumanReview: reviewFilter === "TRUE" ? true : reviewFilter === "FALSE" ? false : undefined,
        desde: desdeFilter || undefined,
        hasta: hastaFilter || undefined,
      });

      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await getGeneracionesIAHistory({
        page: targetPage,
        pageSize: 10,
        sortBy: sortBy as any,
        sortOrder,
        estado: (estadoFilter as any) || undefined,
        modelo: modeloFilter || undefined,
        requiresHumanReview: reviewFilter === "TRUE" ? true : reviewFilter === "FALSE" ? false : undefined,
        desde: desdeFilter || undefined,
        hasta: hastaFilter || undefined,
      });

      if (res.success && res.data) {
        setHistory(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchHistory(1);
    setPage(1);
  }, [estadoFilter, modeloFilter, reviewFilter, desdeFilter, hastaFilter, sortBy, sortOrder]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchHistory(newPage);
  };

  const handleOpenDetail = async (genId: string) => {
    setLoadingDetail(true);
    try {
      const res = await getGeneracionIADetail({ generacionId: genId });
      if (res.success && res.data) {
        setSelectedGeneracion(res.data);
      } else {
        alert(res.error || "Error al obtener el detalle de la generación.");
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const kpis = metrics?.kpis || {
    totales: 0,
    generadas: 0,
    errores: 0,
    aprobadas: 0,
    rechazadas: 0,
    archivadas: 0,
    requiresReviewCount: 0,
    porcentajeRevisionHumana: 0,
    tiempoPromedioMs: null,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    tasaAprobacion: 0,
    tasaRechazo: 0,
    tasaErrores: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-primary gap-1 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> OBSERVABILIDAD IA
            </span>
            <span className="badge badge-ghost font-mono text-xs">
              Motor: gemini-3.6-flash / Mock
            </span>
            <span className="badge badge-outline badge-success text-[11px]">
              Entorno Local Autorizado
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Monitoreo y Observabilidad del Motor de IA
          </h1>
          <p className="text-xs text-base-content/70">
            Métricas ejecutivas de rendimiento, tiempos de generación, consumo de tokens y tasa de aprobación de propuestas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchMetrics();
              fetchHistory(page);
            }}
            disabled={loading}
            className="btn btn-outline btn-sm gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar Métricas
          </button>
        </div>
      </div>

      {/* Barra de Filtros Server-Side */}
      <div className="bg-base-100 border border-base-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filtros Server-Side
          </h3>
          {(estadoFilter || modeloFilter || reviewFilter || desdeFilter || hastaFilter) && (
            <button
              onClick={() => {
                setEstadoFilter("");
                setModeloFilter("");
                setReviewFilter("");
                setDesdeFilter("");
                setHastaFilter("");
              }}
              className="text-xs text-error font-medium hover:underline"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block opacity-60 mb-1">Estado</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="select select-bordered select-xs w-full rounded-xl"
            >
              <option value="">Todos los Estados</option>
              <option value="GENERADO">GENERADO (Exitoso)</option>
              <option value="APROBADO">APROBADO</option>
              <option value="RECHAZADO">RECHAZADO</option>
              <option value="ARCHIVADO">ARCHIVADO</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          <div>
            <label className="block opacity-60 mb-1">Modelo / Proveedor</label>
            <select
              value={modeloFilter}
              onChange={(e) => setModeloFilter(e.target.value)}
              className="select select-bordered select-xs w-full rounded-xl"
            >
              <option value="">Todos los Modelos</option>
              <option value="gemini-3.6-flash">Google Gemini (gemini-3.6-flash)</option>
              <option value="mock-provider">Mock AI Provider</option>
            </select>
          </div>

          <div>
            <label className="block opacity-60 mb-1">Revisión Humana</label>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              className="select select-bordered select-xs w-full rounded-xl"
            >
              <option value="">Todas</option>
              <option value="TRUE">Revisión Requerida (Advertencias)</option>
              <option value="FALSE">Sin Advertencias</option>
            </select>
          </div>

          <div>
            <label className="block opacity-60 mb-1">Desde</label>
            <input
              type="date"
              value={desdeFilter}
              onChange={(e) => setDesdeFilter(e.target.value)}
              className="input input-bordered input-xs w-full rounded-xl"
            />
          </div>

          <div>
            <label className="block opacity-60 mb-1">Hasta</label>
            <input
              type="date"
              value={hastaFilter}
              onChange={(e) => setHastaFilter(e.target.value)}
              className="input input-bordered input-xs w-full rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Generaciones Totales */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-base-content/70">
            <span className="text-xs font-bold uppercase tracking-wider">Generaciones Totales</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight">{kpis.totales}</span>
            <span className="text-xs text-success font-semibold">{kpis.generadas} exitosas</span>
          </div>
          <p className="text-[11px] opacity-60">Historial completo en motor IA</p>
        </div>

        {/* Tasa de Aprobación */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-base-content/70">
            <span className="text-xs font-bold uppercase tracking-wider">Aprobaciones vs Rechazos</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-success tracking-tight">{kpis.tasaAprobacion}%</span>
            <span className="text-xs text-base-content/70">{kpis.aprobadas} A / {kpis.rechazadas} R</span>
          </div>
          <p className="text-[11px] opacity-60">Tasa de aprobación por entrenadores</p>
        </div>

        {/* Tiempo Promedio */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-base-content/70">
            <span className="text-xs font-bold uppercase tracking-wider">Tiempo Promedio</span>
            <Clock className="w-4 h-4 text-info" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-info tracking-tight">
              {kpis.tiempoPromedioMs !== null ? `${kpis.tiempoPromedioMs} ms` : "N/A"}
            </span>
            <span className="text-xs opacity-60">Latencia</span>
          </div>
          <p className="text-[11px] opacity-60">Duración promedio por solicitud</p>
        </div>

        {/* Consumo de Tokens */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-base-content/70">
            <span className="text-xs font-bold uppercase tracking-wider">Consumo de Tokens</span>
            <Cpu className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-secondary tracking-tight">
              {kpis.totalTokens.toLocaleString()}
            </span>
            <span className="text-xs font-mono opacity-60">P:{kpis.totalPromptTokens} C:{kpis.totalCompletionTokens}</span>
          </div>
          <p className="text-[11px] opacity-60">Total prompt + completion tokens</p>
        </div>
      </div>

      {/* TARJETAS DE DETALLE DE RENDIMIENTO Y SEGURIDAD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rendimiento por Modelo */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" /> Rendimiento por Modelo de IA
          </h3>

          {metrics?.porModelo && metrics.porModelo.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-xs w-full">
                <thead>
                  <tr className="border-b border-base-200">
                    <th>Modelo</th>
                    <th className="text-right">Generaciones</th>
                    <th className="text-right">Tiempo Prom.</th>
                    <th className="text-right">Tokens Totales</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.porModelo.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-base-200/50">
                      <td className="font-bold font-mono text-xs text-primary">{m.modelo}</td>
                      <td className="text-right font-medium">{m.generaciones}</td>
                      <td className="text-right">{m.tiempoPromedioMs !== null ? `${m.tiempoPromedioMs} ms` : "N/A"}</td>
                      <td className="text-right font-mono">{m.tokensTotales.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs opacity-60 italic py-4 text-center">No existen datos de modelos para el filtro seleccionado.</p>
          )}
        </div>

        {/* Banderas de Advertencia / Seguridad */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-error" /> Banderas de Seguridad Biomecánica / Alérgenos
            </h3>
            <span className="badge badge-error badge-xs text-white">
              {kpis.porcentajeRevisionHumana}% requieren revisión
            </span>
          </div>

          {metrics?.banderasMasFrecuentes && metrics.banderasMasFrecuentes.length > 0 ? (
            <div className="space-y-2">
              {metrics.banderasMasFrecuentes.map((b: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-base-200/50 p-2.5 rounded-xl">
                  <span className="line-clamp-1 text-base-content/80 font-medium">{b.bandera}</span>
                  <span className="badge badge-neutral badge-xs font-bold shrink-0">{b.cantidad} ocurrencias</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs opacity-60 italic py-4 text-center">No hay advertencias registradas en las generaciones filtradas.</p>
          )}
        </div>
      </div>

      {/* TABLA DE HISTORIAL DE GENERACIONES (PAGINADA SERVER-SIDE) */}
      <div className="bg-base-100 border border-base-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-primary" /> Historial de Generaciones IA
            </h3>
            <p className="text-xs opacity-70">
              Registros ligeros optimizados con paginación server-side.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="opacity-60">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select select-bordered select-xs rounded-xl"
            >
              <option value="createdAt">Fecha de Creación</option>
              <option value="numeroGeneracion"># Generación</option>
              <option value="tiempoGeneracionMs">Tiempo de Respuesta</option>
              <option value="promptTokens">Tokens Prompt</option>
              <option value="completionTokens">Tokens Completion</option>
              <option value="estado">Estado</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="btn btn-ghost btn-xs font-mono"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>

        {history?.items && history.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="border-b border-base-200 text-xs">
                  <th># Gen</th>
                  <th>Fecha</th>
                  <th>Socio</th>
                  <th>Entrenador</th>
                  <th>Modelo</th>
                  <th>Estado</th>
                  <th>Tiempo</th>
                  <th>Tokens</th>
                  <th>Revisión</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((gen: any) => {
                  const socio = gen.perfilPlanificacion?.socio;
                  const entrenador = gen.perfilPlanificacion?.entrenador;
                  const tokensTotal = (gen.promptTokens || 0) + (gen.completionTokens || 0);

                  return (
                    <tr key={gen.id} className="hover:bg-base-200/50 text-xs">
                      <td className="font-bold font-mono">#{gen.numeroGeneracion}</td>
                      <td className="whitespace-nowrap">
                        {gen.createdAt ? format(new Date(gen.createdAt), "dd/MM/yyyy HH:mm") : "-"}
                      </td>
                      <td className="font-semibold">
                        {socio ? `${socio.nombres} ${socio.apellidos}` : "N/A"}
                        <span className="block text-[10px] opacity-60 font-mono">{socio?.codigo}</span>
                      </td>
                      <td>
                        {entrenador ? `${entrenador.nombres} ${entrenador.apellidos}` : "N/A"}
                      </td>
                      <td className="font-mono text-[11px] text-primary">{gen.modeloUtilizado}</td>
                      <td>
                        <span
                          className={`badge badge-xs font-semibold ${
                            gen.estado === "APROBADO"
                              ? "badge-success text-white"
                              : gen.estado === "RECHAZADO"
                              ? "badge-error text-white"
                              : gen.estado === "ERROR"
                              ? "badge-error"
                              : "badge-warning"
                          }`}
                        >
                          {gen.estado}
                        </span>
                      </td>
                      <td>{gen.tiempoGeneracionMs !== null ? `${gen.tiempoGeneracionMs} ms` : "N/A"}</td>
                      <td className="font-mono">{tokensTotal > 0 ? tokensTotal : "N/A"}</td>
                      <td>
                        {gen.requiresHumanReview ? (
                          <span className="badge badge-error badge-outline badge-xs gap-1">
                            <ShieldAlert className="w-2.5 h-2.5" /> Requerida
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-xs opacity-60">OK</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleOpenDetail(gen.id)}
                          disabled={loadingDetail}
                          className="btn btn-ghost btn-xs gap-1 text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-base-200/40 rounded-2xl border border-base-200">
            <Sparkles className="w-8 h-8 text-base-content/40 mx-auto mb-2" />
            <p className="text-sm font-bold">No existen generaciones IA en el período seleccionado.</p>
            <p className="text-xs opacity-60 mt-1">Ajuste los filtros de búsqueda o ejecute nuevas solicitudes en el sistema.</p>
          </div>
        )}

        {/* Controles de Paginación Server-Side */}
        {history?.pagination && history.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-base-200 text-xs">
            <span className="opacity-70">
              Mostrando página <strong>{history.pagination.page}</strong> de{" "}
              <strong>{history.pagination.totalPages}</strong> ({history.pagination.total} generaciones)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="btn btn-outline btn-xs gap-1 rounded-xl"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= history.pagination.totalPages || loading}
                className="btn btn-outline btn-xs gap-1 rounded-xl"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Generación Reutilizado */}
      {selectedGeneracion && (
        <ProposalViewerModal
          generacion={selectedGeneracion}
          onClose={() => setSelectedGeneracion(null)}
          canManage={false}
        />
      )}
    </div>
  );
}
