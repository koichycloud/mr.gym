"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Esquema Zod para apertura de caja
const AperturaCajaSchema = z.object({
  montoInicial: z.number().min(0, "El monto inicial debe ser >= 0"),
  observacion: z.string().max(500).optional(),
});

// Esquema Zod para cierre de caja
const CierreCajaSchema = z.object({
  montoContadoEfectivo: z.number().min(0, "El monto contado debe ser >= 0"),
  observacion: z.string().max(500).optional(),
});

// Esquema Zod para filtros financieros
const FinanzasFiltersSchema = z.object({
  periodo: z.enum(["today", "7d", "30d", "this_month", "last_month", "custom"]).optional().default("today"),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  socioId: z.string().optional(),
  metodoPago: z.string().optional(),
  concepto: z.string().optional(),
});

export type FinanzasFilters = z.infer<typeof FinanzasFiltersSchema>;

function resolveRange(filters: FinanzasFilters) {
  const now = new Date();
  let desde = new Date(now);
  let hasta = new Date(now);

  switch (filters.periodo) {
    case "today":
      desde.setHours(0, 0, 0, 0);
      hasta.setHours(23, 59, 59, 999);
      break;
    case "7d":
      desde.setDate(now.getDate() - 7);
      desde.setHours(0, 0, 0, 0);
      break;
    case "30d":
      desde.setDate(now.getDate() - 30);
      desde.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      desde = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "last_month":
      desde = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      hasta = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "custom":
      if (filters.desde) {
        desde = new Date(filters.desde);
        if (isNaN(desde.getTime())) desde = new Date(now.setDate(now.getDate() - 30));
        else desde.setHours(0, 0, 0, 0);
      }
      if (filters.hasta) {
        hasta = new Date(filters.hasta);
        if (isNaN(hasta.getTime())) hasta = new Date();
        else hasta.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { desde, hasta };
}

/**
 * Consulta del Estado de Caja Abierta de la Fecha Actual
 */
export async function getEstadoCajaActual() {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Buscar última apertura de caja hoy
    const aperturaLog = await prisma.auditLog.findFirst({
      where: {
        accion: "APERTURA_CAJA",
        fecha: { gte: todayStart },
      },
      orderBy: { fecha: "desc" },
    });

    // Buscar último cierre de caja hoy
    const cierreLog = await prisma.auditLog.findFirst({
      where: {
        accion: "CIERRE_CAJA",
        fecha: { gte: todayStart },
      },
      orderBy: { fecha: "desc" },
    });

    const estaAbierta = Boolean(aperturaLog && (!cierreLog || cierreLog.fecha < aperturaLog.fecha));
    let detalleApertura = null;
    let detalleCierre = null;

    if (aperturaLog && aperturaLog.detalles) {
      try { detalleApertura = JSON.parse(aperturaLog.detalles); } catch {}
    }
    if (cierreLog && cierreLog.detalles) {
      try { detalleCierre = JSON.parse(cierreLog.detalles); } catch {}
    }

    return {
      success: true,
      data: {
        estaAbierta,
        apertura: aperturaLog ? { usuario: aperturaLog.usuario, fecha: aperturaLog.fecha, ...detalleApertura } : null,
        cierre: cierreLog ? { usuario: cierreLog.usuario, fecha: cierreLog.fecha, ...detalleCierre } : null,
      },
    };
  } catch (err: any) {
    console.error("Error en getEstadoCajaActual:", err);
    return { success: false, error: err.message || "Error al obtener estado de caja." };
  }
}

/**
 * Apertura de Caja Diaria
 */
export async function abrirCajaDiaria(data: { montoInicial: number; observacion?: string }) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = AperturaCajaSchema.parse(data);

    const estadoRes = await getEstadoCajaActual();
    if (estadoRes.success && estadoRes.data?.estaAbierta) {
      return { success: false, error: "La caja ya se encuentra abierta actualmente." };
    }

    const log = await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "APERTURA_CAJA",
        detalles: JSON.stringify({
          montoInicial: parsed.montoInicial,
          observacion: parsed.observacion || "",
        }),
      },
    });

    return { success: true, logId: log.id, montoInicial: parsed.montoInicial };
  } catch (err: any) {
    console.error("Error en abrirCajaDiaria:", err);
    return { success: false, error: err.message || "Error al abrir la caja." };
  }
}

/**
 * Cierre y Conciliación de Caja Diaria
 */
export async function cerrarCajaDiaria(data: { montoContadoEfectivo: number; observacion?: string }) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = CierreCajaSchema.parse(data);

    const estadoRes = await getEstadoCajaActual();
    if (!estadoRes.success || !estadoRes.data?.estaAbierta) {
      return { success: false, error: "No existe una caja abierta para cerrar." };
    }

    const fechaApertura = estadoRes.data.apertura?.fecha ? new Date(estadoRes.data.apertura.fecha) : new Date();
    const montoInicial = estadoRes.data.apertura?.montoInicial || 0;

    // Calcular cobros en efectivo acumulados durante la sesión
    const pagosEfectivoAgg = await prisma.pago.aggregate({
      where: {
        metodoPago: "EFECTIVO",
        fecha: { gte: fechaApertura },
      },
      _sum: { monto: true },
      _count: { id: true },
    });

    const efectivoRegistrado = pagosEfectivoAgg._sum.monto || 0;
    const efectivoEsperado = montoInicial + efectivoRegistrado;
    const diferencia = parsed.montoContadoEfectivo - efectivoEsperado;

    const log = await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "CIERRE_CAJA",
        detalles: JSON.stringify({
          montoInicial,
          efectivoRegistrado,
          efectivoEsperado,
          montoContadoEfectivo: parsed.montoContadoEfectivo,
          diferencia,
          observacion: parsed.observacion || "",
        }),
      },
    });

    return {
      success: true,
      logId: log.id,
      resumen: {
        montoInicial,
        efectivoRegistrado,
        efectivoEsperado,
        montoContadoEfectivo: parsed.montoContadoEfectivo,
        diferencia,
      },
    };
  } catch (err: any) {
    console.error("Error en cerrarCajaDiaria:", err);
    return { success: false, error: err.message || "Error al cerrar la caja." };
  }
}

/**
 * Consulta de KPIs Financieros y Desglose por Método de Pago
 */
export async function getFinancialMetrics(filters: FinanzasFilters = { periodo: "today" }) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = FinanzasFiltersSchema.parse(filters);
    const { desde, hasta } = resolveRange(parsed);

    const [pagosAgg, pagosPorMetodo, estadoCaja] = await Promise.all([
      prisma.pago.aggregate({
        where: { fecha: { gte: desde, lte: hasta } },
        _sum: { monto: true },
        _count: { id: true },
      }),
      prisma.pago.groupBy({
        by: ["metodoPago"],
        where: { fecha: { gte: desde, lte: hasta } },
        _sum: { monto: true },
        _count: { id: true },
      }),
      getEstadoCajaActual(),
    ]);

    const totalIngresos = pagosAgg._sum.monto || 0;
    const totalOperaciones = pagosAgg._count.id || 0;
    const ticketPromedio = totalOperaciones > 0 ? totalIngresos / totalOperaciones : 0;

    const desgloseMetodos = pagosPorMetodo.map((pm) => ({
      metodo: pm.metodoPago,
      montoTotal: pm._sum.monto || 0,
      operaciones: pm._count.id || 0,
    }));

    return {
      success: true,
      data: {
        kpis: {
          totalIngresos: Number(totalIngresos.toFixed(2)),
          totalOperaciones,
          ticketPromedio: Number(ticketPromedio.toFixed(2)),
          estaCajaAbierta: estadoCaja.data?.estaAbierta || false,
        },
        desgloseMetodos,
        cajaEstado: estadoCaja.data,
      },
    };
  } catch (err: any) {
    console.error("Error en getFinancialMetrics:", err);
    return { success: false, error: err.message || "Error al obtener métricas financieras." };
  }
}

/**
 * Consulta de Cobranzas y Vencimientos Próximos
 */
export async function getCobranzasStatus(diasProximos: number = 10) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const now = new Date();
    const limiteProximo = new Date(now);
    limiteProximo.setDate(now.getDate() + diasProximos);

    const [porVencer, vencidos] = await Promise.all([
      prisma.suscripcion.findMany({
        where: {
          estado: "POR_VENCER",
          fechaFin: { gte: now, lte: limiteProximo },
        },
        select: {
          id: true,
          fechaFin: true,
          estado: true,
          socio: { select: { id: true, codigo: true, nombres: true, apellidos: true, telefono: true } },
          plan: { select: { nombre: true, precio: true } },
        },
        orderBy: { fechaFin: "asc" },
        take: 100,
      }),
      prisma.suscripcion.findMany({
        where: { estado: "VENCIDO" },
        select: {
          id: true,
          fechaFin: true,
          estado: true,
          socio: { select: { id: true, codigo: true, nombres: true, apellidos: true, telefono: true } },
          plan: { select: { nombre: true, precio: true } },
        },
        orderBy: { fechaFin: "desc" },
        take: 100,
      }),
    ]);

    return {
      success: true,
      data: {
        porVencer: porVencer.map((s) => ({
          suscripcionId: s.id,
          socioCodigo: s.socio.codigo,
          socioNombre: `${s.socio.nombres} ${s.socio.apellidos}`,
          telefono: s.socio.telefono || "N/A",
          planNombre: s.plan?.nombre || "General",
          montoEsperado: s.plan?.precio || 0,
          fechaVencimiento: format(s.fechaFin, "dd/MM/yyyy"),
          estado: s.estado,
        })),
        vencidos: vencidos.map((s) => ({
          suscripcionId: s.id,
          socioCodigo: s.socio.codigo,
          socioNombre: `${s.socio.nombres} ${s.socio.apellidos}`,
          telefono: s.socio.telefono || "N/A",
          planNombre: s.plan?.nombre || "General",
          montoEsperado: s.plan?.precio || 0,
          fechaVencimiento: format(s.fechaFin, "dd/MM/yyyy"),
          estado: s.estado,
        })),
      },
    };
  } catch (err: any) {
    console.error("Error en getCobranzasStatus:", err);
    return { success: false, error: err.message || "Error al obtener estado de cobranzas." };
  }
}

/**
 * Historial Paginado de Transacciones Financieras (Pagos)
 */
export async function getFinancialTransactionsHistory(params: {
  page?: number;
  pageSize?: number;
  metodoPago?: string;
  concepto?: string;
  desde?: string;
  hasta?: string;
}) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {};
    if (params.metodoPago) whereClause.metodoPago = params.metodoPago;
    if (params.concepto) whereClause.concepto = params.concepto;
    if (params.desde || params.hasta) {
      const { desde, hasta } = resolveRange({ periodo: "custom", desde: params.desde, hasta: params.hasta });
      whereClause.fecha = { gte: desde, lte: hasta };
    }

    const [total, items] = await Promise.all([
      prisma.pago.count({ where: whereClause }),
      prisma.pago.findMany({
        where: whereClause,
        select: {
          id: true,
          monto: true,
          metodoPago: true,
          concepto: true,
          descripcion: true,
          fecha: true,
          socio: { select: { codigo: true, nombres: true, apellidos: true } },
        },
        orderBy: { fecha: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      success: true,
      data: {
        pagination: { page, pageSize, total, totalPages },
        items: items.map((p) => ({
          id: p.id,
          socio: p.socio ? `${p.socio.nombres} ${p.socio.apellidos} (${p.socio.codigo})` : "Cliente General",
          monto: p.monto,
          metodoPago: p.metodoPago,
          concepto: p.concepto,
          descripcion: p.descripcion || "",
          fecha: format(p.fecha, "dd/MM/yyyy HH:mm"),
        })),
      },
    };
  } catch (err: any) {
    console.error("Error en getFinancialTransactionsHistory:", err);
    return { success: false, error: err.message || "Error al consultar historial de transacciones." };
  }
}

/**
 * Exportación de Reporte Financiero a CSV
 */
export async function exportFinancialReportCSV(
  reportType: "CAJA_DIARIA" | "INGRESOS" | "COBRANZA" | "METODOS_PAGO",
  filters: FinanzasFilters = { periodo: "today" }
) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    let csvContent = "";
    let filename = `MrGym_ReporteFinanciero_${reportType}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

    if (reportType === "COBRANZA") {
      const cobranzasRes = await getCobranzasStatus(15);
      if (!cobranzasRes.success || !cobranzasRes.data) throw new Error("Sin datos de cobranza.");
      const rows = [...cobranzasRes.data.porVencer, ...cobranzasRes.data.vencidos];
      if (rows.length === 0) return { success: false, error: "No hay registros de cobranza." };
      const headers = Object.keys(rows[0]).join(",");
      const lines = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      csvContent = [headers, ...lines].join("\n");
    } else {
      const historyRes = await getFinancialTransactionsHistory({ page: 1, pageSize: 500 });
      if (!historyRes.success || !historyRes.data || historyRes.data.items.length === 0) {
        return { success: false, error: "No hay registros financieros para exportar." };
      }
      const rows = historyRes.data.items;
      const headers = Object.keys(rows[0]).join(",");
      const lines = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      csvContent = [headers, ...lines].join("\n");
    }

    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "GENERAR_REPORTE_FINANCIERO",
        detalles: JSON.stringify({ reportType, formato: "CSV" }),
      },
    });

    return { success: true, filename, csvContent };
  } catch (err: any) {
    console.error("Error en exportFinancialReportCSV:", err);
    return { success: false, error: err.message || "Error al exportar reporte financiero CSV." };
  }
}

/**
 * Exportación de Reporte Financiero a PDF
 */
export async function exportFinancialReportPDF(
  reportType: "CAJA_DIARIA" | "INGRESOS" | "COBRANZA" | "METODOS_PAGO",
  filters: FinanzasFilters = { periodo: "today" }
) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const doc = new jsPDF();

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 30, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("MR. GYM — REPORTE FINANCIERO Y CAJA", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`REPORTE: ${reportType} | EMISIÓN: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);

    let rows: any[] = [];
    if (reportType === "COBRANZA") {
      const cobranzasRes = await getCobranzasStatus(15);
      rows = cobranzasRes.data ? [...cobranzasRes.data.porVencer, ...cobranzasRes.data.vencidos] : [];
    } else {
      const historyRes = await getFinancialTransactionsHistory({ page: 1, pageSize: 500 });
      rows = historyRes.data?.items || [];
    }

    if (rows.length === 0) {
      return { success: false, error: "No existen datos para generar el reporte PDF." };
    }

    const tableHeaders = [Object.keys(rows[0])];
    const tableData = rows.map((r) => Object.values(r));

    autoTable(doc, {
      startY: 35,
      head: tableHeaders as any,
      body: tableData as any,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
    });

    const pdfBase64 = doc.output("datauristring").split(",")[1];

    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "GENERAR_REPORTE_FINANCIERO",
        detalles: JSON.stringify({ reportType, formato: "PDF" }),
      },
    });

    return {
      success: true,
      filename: `MrGym_ReporteFinanciero_${reportType}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`,
      pdfBase64,
    };
  } catch (err: any) {
    console.error("Error en exportFinancialReportPDF:", err);
    return { success: false, error: err.message || "Error al exportar reporte financiero PDF." };
  }
}
