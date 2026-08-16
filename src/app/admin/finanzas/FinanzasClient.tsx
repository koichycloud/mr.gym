"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Lock,
  Unlock,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  Filter,
  FileText,
  Loader2,
  RefreshCw,
  BarChart3,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import {
  getFinancialMetrics,
  getEstadoCajaActual,
  abrirCajaDiaria,
  cerrarCajaDiaria,
  getCobranzasStatus,
  getFinancialTransactionsHistory,
  exportFinancialReportCSV,
  exportFinancialReportPDF,
  FinanzasFilters,
} from "@/app/actions/finanzas";

interface Props {
  initialMetrics: any;
  initialCobranzas: any;
  initialTransactions: any;
}

export default function FinanzasClient({
  initialMetrics,
  initialCobranzas,
  initialTransactions,
}: Props) {
  const [metrics, setMetrics] = useState<any>(initialMetrics?.data || null);
  const [cobranzas, setCobranzas] = useState<any>(initialCobranzas?.data || { porVencer: [], vencidos: [] });
  const [transactions, setTransactions] = useState<any[]>(initialTransactions?.data?.items || []);
  const [pagination, setPagination] = useState<any>(initialTransactions?.data?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<FinanzasFilters>({ periodo: "today" });

  // Modales de Caja
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [montoInicial, setMontoInicial] = useState<number>(100);
  const [montoContado, setMontoContado] = useState<number>(0);
  const [observacion, setObservacion] = useState("");

  const loadAllData = async (newFilters: FinanzasFilters) => {
    setLoading(true);
    try {
      const [metRes, cobRes, txRes] = await Promise.all([
        getFinancialMetrics(newFilters),
        getCobranzasStatus(15),
        getFinancialTransactionsHistory({ page: 1, pageSize: 10 }),
      ]);

      if (metRes.success && metRes.data) setMetrics(metRes.data);
      if (cobRes.success && cobRes.data) setCobranzas(cobRes.data);
      if (txRes.success && txRes.data) {
        setTransactions(txRes.data.items);
        setPagination(txRes.data.pagination);
      }
    } catch (err) {
      toast.error("Error al actualizar datos financieros.");
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaja = async () => {
    setActionLoading(true);
    try {
      const res = await abrirCajaDiaria({ montoInicial, observacion });
      if (res.success) {
        toast.success("¡Caja abierta exitosamente!");
        setShowAbrirModal(false);
        setObservacion("");
        await loadAllData(filters);
      } else {
        toast.error(res.error || "Error al abrir caja.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar apertura.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCerrarCaja = async () => {
    setActionLoading(true);
    try {
      const res = await cerrarCajaDiaria({ montoContadoEfectivo: montoContado, observacion });
      if (res.success && res.resumen) {
        toast.success(`Caja cerrada. Diferencia: S/ ${res.resumen.diferencia.toFixed(2)}`);
        setShowCerrarModal(false);
        setObservacion("");
        await loadAllData(filters);
      } else {
        toast.error(res.error || "Error al cerrar caja.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar cierre.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await exportFinancialReportCSV("INGRESOS", filters);
      if (res.success && res.csvContent && res.filename) {
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Reporte financiero descargado en CSV.");
      } else {
        toast.error(res.error || "Error al exportar CSV.");
      }
    } catch (err) {
      toast.error("Error en la exportación CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await exportFinancialReportPDF("INGRESOS", filters);
      if (res.success && res.pdfBase64 && res.filename) {
        const linkSource = `data:application/pdf;base64,${res.pdfBase64}`;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = res.filename;
        downloadLink.click();
        toast.success("Reporte financiero descargado en PDF.");
      } else {
        toast.error(res.error || "Error al exportar PDF.");
      }
    } catch (err) {
      toast.error("Error en la exportación PDF.");
    } finally {
      setExporting(false);
    }
  };

  const kpis = metrics?.kpis || {};
  const desglose = metrics?.desgloseMetodos || [];
  const cajaEstado = metrics?.cajaEstado || {};

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-base-content flex items-center gap-2">
            <DollarSign className="text-success w-8 h-8" />
            Centro Financiero y Control de Caja
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Gestión integral de caja diaria, recaudación, cobranzas y conciliación financiera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {cajaEstado.estaAbierta ? (
            <button onClick={() => setShowCerrarModal(true)} className="btn btn-error btn-sm gap-2">
              <Lock className="w-4 h-4" />
              Cerrar Caja
            </button>
          ) : (
            <button onClick={() => setShowAbrirModal(true)} className="btn btn-success btn-sm text-white gap-2">
              <Unlock className="w-4 h-4" />
              Abrir Caja
            </button>
          )}

          <button onClick={handleExportCSV} disabled={exporting} className="btn btn-outline btn-sm gap-2">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn btn-primary btn-sm gap-2">
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Banner de Estado de Caja */}
      <div className={`p-4 rounded-xl border flex items-center justify-between ${
        cajaEstado.estaAbierta ? "bg-success/10 border-success/30 text-success" : "bg-base-200 border-base-300 text-base-content/70"
      }`}>
        <div className="flex items-center gap-3">
          {cajaEstado.estaAbierta ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          <div>
            <h4 className="font-bold text-sm">
              Caja Diaria: {cajaEstado.estaAbierta ? "ABIERTA" : "CERRADA"}
            </h4>
            <p className="text-xs opacity-90">
              {cajaEstado.estaAbierta
                ? `Abierta por ${cajaEstado.apertura?.usuario || "Sistema"} a las ${new Date(cajaEstado.apertura?.fecha).toLocaleTimeString("es-PE")} (Fondo Inicial: S/ ${cajaEstado.apertura?.montoInicial || 0})`
                : "La caja se encuentra cerrada. Abra la caja para habilitar cierres y conciliación."}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs Financieros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-success"><DollarSign className="w-8 h-8" /></div>
            <div className="stat-title text-xs font-bold uppercase">Ingresos Período</div>
            <div className="stat-value text-success text-2xl md:text-3xl">S/ {kpis.totalIngresos || 0}</div>
            <div className="stat-desc">{kpis.totalOperaciones || 0} cobros procesados</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-info"><TrendingUp className="w-8 h-8" /></div>
            <div className="stat-title text-xs font-bold uppercase">Ticket Promedio</div>
            <div className="stat-value text-info text-2xl md:text-3xl">S/ {kpis.ticketPromedio || 0}</div>
            <div className="stat-desc">Promedio por operación</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-warning"><AlertTriangle className="w-8 h-8" /></div>
            <div className="stat-title text-xs font-bold uppercase">Por Vencer</div>
            <div className="stat-value text-warning text-2xl md:text-3xl">{cobranzas.porVencer?.length || 0}</div>
            <div className="stat-desc">Suscripciones por cobrar</div>
          </div>
        </div>

        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-error"><Clock className="w-8 h-8" /></div>
            <div className="stat-title text-xs font-bold uppercase">Suscrip. Vencidas</div>
            <div className="stat-value text-error text-2xl md:text-3xl">{cobranzas.vencidos?.length || 0}</div>
            <div className="stat-desc">Cobranza inmediata</div>
          </div>
        </div>
      </div>

      {/* Desglose por Método de Pago */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-base-content">
          <CreditCard className="text-primary w-5 h-5" />
          Desglose por Métodos de Pago
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA", "TARJETA"].map((metodo) => {
            const match = desglose.find((d: any) => d.metodo === metodo);
            const monto = match ? match.montoTotal : 0;
            const ops = match ? match.operaciones : 0;

            return (
              <div key={metodo} className="p-3 bg-base-200/60 rounded-xl border border-base-300">
                <p className="text-[10px] font-extrabold uppercase text-base-content/60">{metodo}</p>
                <p className="text-lg font-extrabold text-base-content mt-1">S/ {monto.toFixed(2)}</p>
                <p className="text-[10px] opacity-70">{ops} operaciones</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tablas de Cobranzas Próximas */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-base-content">
          <Calculator className="text-warning w-5 h-5" />
          Centro de Cobranzas y Suscripciones Próximas a Vencer
        </h3>

        <div className="overflow-x-auto max-h-72">
          <table className="table table-xs md:table-sm w-full">
            <thead>
              <tr>
                <th>Socio</th>
                <th>Teléfono</th>
                <th>Plan</th>
                <th>Monto Esperado</th>
                <th>Vencimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cobranzas.porVencer.length > 0 ? (
                cobranzas.porVencer.map((c: any) => (
                  <tr key={c.suscripcionId}>
                    <td className="font-bold">{c.socioNombre} <span className="text-xs text-base-content/50">({c.socioCodigo})</span></td>
                    <td>{c.telefono}</td>
                    <td>{c.planNombre}</td>
                    <td className="font-bold text-success">S/ {c.montoEsperado.toFixed(2)}</td>
                    <td>{c.fechaVencimiento}</td>
                    <td><span className="badge badge-warning text-xs font-bold">{c.estado}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4 opacity-50 text-xs">
                    No hay suscripciones próximas a vencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Apertura de Caja */}
      {showAbrirModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Unlock className="text-success w-5 h-5" />
              Apertura de Caja Diaria
            </h3>
            <p className="text-xs opacity-70 mt-1">Ingrese el fondo inicial en efectivo para iniciar la sesión de caja.</p>

            <div className="form-control mt-4">
              <label className="label text-xs font-bold">Monto Inicial Efectivo (S/):</label>
              <input
                type="number"
                value={montoInicial}
                onChange={(e) => setMontoInicial(Number(e.target.value))}
                className="input input-bordered"
              />
            </div>

            <div className="form-control mt-3">
              <label className="label text-xs font-bold">Observación:</label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="textarea textarea-bordered text-xs"
                placeholder="Notas de apertura..."
              />
            </div>

            <div className="modal-action">
              <button onClick={() => setShowAbrirModal(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={handleAbrirCaja} disabled={actionLoading} className="btn btn-success btn-sm text-white">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Apertura"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cierre de Caja */}
      {showCerrarModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Lock className="text-error w-5 h-5" />
              Cierre y Conciliación de Caja
            </h3>
            <p className="text-xs opacity-70 mt-1">Ingrese el efectivo físico contado al realizar el arqueo.</p>

            <div className="form-control mt-4">
              <label className="label text-xs font-bold">Efectivo Físico Contado (S/):</label>
              <input
                type="number"
                value={montoContado}
                onChange={(e) => setMontoContado(Number(e.target.value))}
                className="input input-bordered"
              />
            </div>

            <div className="form-control mt-3">
              <label className="label text-xs font-bold">Observaciones de Cierre:</label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="textarea textarea-bordered text-xs"
                placeholder="Notas sobre descuadres o novedades..."
              />
            </div>

            <div className="modal-action">
              <button onClick={() => setShowCerrarModal(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={handleCerrarCaja} disabled={actionLoading} className="btn btn-error btn-sm text-white">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Cierre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
