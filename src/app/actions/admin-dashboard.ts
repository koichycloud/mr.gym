"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-utils";
import { z } from "zod";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Esquema de validación para filtros de fecha
const DashboardFiltersSchema = z.object({
  periodo: z.enum(["today", "7d", "30d", "this_month", "last_month", "this_year", "custom"]).optional().default("30d"),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export type DashboardFilters = z.infer<typeof DashboardFiltersSchema>;

/**
 * Helper para calcular rangos de fecha de inicio y fin
 */
function resolveDateRange(filters: DashboardFilters) {
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
    case "this_year":
      desde = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      hasta = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
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
 * Retorna todas las métricas agregadas del Dashboard Ejecutivo
 */
export async function getExecutiveDashboardMetrics(filters: DashboardFilters = { periodo: "30d" }) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = DashboardFiltersSchema.parse(filters);
    const { desde, hasta } = resolveDateRange(parsed);

    // 1. Métricas de Socios
    const [
      totalSociosCount,
      sociosActivosCount,
      sociosPorVencerCount,
      sociosVencidosCount,
      nuevosSociosCount,
    ] = await Promise.all([
      prisma.socio.count(),
      prisma.socio.count({ where: { estado: "ACTIVO" } }),
      prisma.socio.count({ where: { estado: "POR_VENCER" } }),
      prisma.socio.count({ where: { estado: "VENCIDO" } }),
      prisma.socio.count({ where: { createdAt: { gte: desde, lte: hasta } } }),
    ]);

    // 2. Ingresos y Caja
    const pagosAgg = await prisma.pago.aggregate({
      where: { fecha: { gte: desde, lte: hasta } },
      _sum: { monto: true },
      _count: { id: true },
    });

    const totalIngresos = pagosAgg._sum.monto || 0;
    const totalOperaciones = pagosAgg._count.id || 0;
    const ticketPromedio = totalOperaciones > 0 ? totalIngresos / totalOperaciones : 0;

    // 3. Suscripciones y Tasa de Renovación
    const [
      suscripcionesActivas,
      suscripcionesPorVencer,
      suscripcionesVencidas,
      nuevasSuscripciones,
      renovacionesCount,
    ] = await Promise.all([
      prisma.suscripcion.count({ where: { estado: "ACTIVO" } }),
      prisma.suscripcion.count({ where: { estado: "POR_VENCER" } }),
      prisma.suscripcion.count({ where: { estado: "VENCIDO" } }),
      prisma.suscripcion.count({ where: { fechaInicio: { gte: desde, lte: hasta } } }),
      prisma.suscripcion.count({ where: { fechaInicio: { gte: desde, lte: hasta }, estado: "ACTIVO" } }),
    ]);

    const totalSuscripciones = suscripcionesActivas + suscripcionesPorVencer + suscripcionesVencidas;
    const tasaRenovacion = totalSuscripciones > 0 ? (renovacionesCount / totalSuscripciones) * 100 : 0;

    // 4. Asistencia
    const [asistenciasTotales, asistenciasSociosUnicos] = await Promise.all([
      prisma.asistencia.count({ where: { fecha: { gte: desde, lte: hasta } } }),
      prisma.asistencia.groupBy({
        by: ["socioId"],
        where: { fecha: { gte: desde, lte: hasta } },
      }),
    ]);

    const sociosUnicosAsistentes = asistenciasSociosUnicos.length;

    // 5. Rendimiento Operativo de Entrenadores
    const entrenadores = await prisma.personal.findMany({
      where: { rol: "Entrenador", activo: true },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        codigo: true,
        asignacionesEntrenador: {
          where: { activo: true },
          select: { id: true },
        },
        perfilesPlanificacion: {
          where: { activo: true },
          select: {
            id: true,
            generacionesIA: {
              select: { id: true, estado: true },
            },
          },
        },
      },
    });

    const entrenadoresStats = entrenadores.map((e) => {
      const sociosAsignados = e.asignacionesEntrenador.length;
      let propuestasPendientes = 0;
      let propuestasAprobadas = 0;

      e.perfilesPlanificacion.forEach((p) => {
        p.generacionesIA.forEach((g) => {
          if (g.estado === "GENERADO" || g.estado === "EN_REVISION") propuestasPendientes++;
          if (g.estado === "APROBADO") propuestasAprobadas++;
        });
      });

      return {
        id: e.id,
        nombre: `${e.nombres} ${e.apellidos}`,
        codigo: e.codigo,
        sociosAsignados,
        propuestasPendientes,
        propuestasAprobadas,
      };
    });

    // 6. Resumen de Planificación IA
    const [generacionesIACount, aprobacionesIACount, revisionesHumanasCount] = await Promise.all([
      prisma.generacionIA.count(),
      prisma.generacionIA.count({ where: { estado: "APROBADO" } }),
      prisma.generacionIA.count({ where: { requiresHumanReview: true } }),
    ]);

    // 7. Alertas Ejecutivas
    const alertas = [];
    if (sociosPorVencerCount > 0) {
      alertas.push({
        titulo: "Socios próximos a vencer",
        descripcion: `${sociosPorVencerCount} socios vencen en los próximos 10 días.`,
        cantidad: sociosPorVencerCount,
        severidad: "warning",
        enlace: "/socios/por-vencer",
      });
    }
    if (sociosVencidosCount > 0) {
      alertas.push({
        titulo: "Socios con suscripción vencida",
        descripcion: `${sociosVencidosCount} socios requieren renovación inmediata.`,
        cantidad: sociosVencidosCount,
        severidad: "error",
        enlace: "/socios/vencidos",
      });
    }

    // 8. Actividad Reciente Sanitizada
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { fecha: "desc" },
      take: 10,
      select: {
        id: true,
        usuario: true,
        accion: true,
        detalles: true,
        fecha: true,
      },
    });

    return {
      success: true,
      data: {
        rangoFechas: { desde: desde.toISOString(), hasta: hasta.toISOString() },
        kpis: {
          totalSocios: totalSociosCount,
          sociosActivos: sociosActivosCount,
          sociosPorVencer: sociosPorVencerCount,
          sociosVencidos: sociosVencidosCount,
          nuevosSocios: nuevosSociosCount,
          totalIngresos: Number(totalIngresos.toFixed(2)),
          totalOperaciones,
          ticketPromedio: Number(ticketPromedio.toFixed(2)),
          suscripcionesActivas,
          suscripcionesPorVencer,
          suscripcionesVencidas,
          nuevasSuscripciones,
          tasaRenovacion: Number(tasaRenovacion.toFixed(1)),
          asistenciasTotales,
          sociosUnicosAsistentes,
          entrenadoresActivosCount: entrenadores.length,
          generacionesIATotales: generacionesIACount,
          aprobacionesIATotales: aprobacionesIACount,
          revisionesHumanasCount,
        },
        entrenadoresStats,
        alertas,
        actividadReciente: auditLogs,
      },
    };
  } catch (err: any) {
    console.error("Error en getExecutiveDashboardMetrics:", err);
    return { success: false, error: err.message || "Error al consultar las métricas ejecutivas." };
  }
}

/**
 * Consulta de datos para reportes administrativos
 */
export async function getExecutiveReportData(
  reportType: "SOCIOS" | "INGRESOS" | "ASISTENCIA" | "SUSCRIPCIONES" | "PERSONAL",
  filters: DashboardFilters = { periodo: "30d" }
) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const parsed = DashboardFiltersSchema.parse(filters);
    const { desde, hasta } = resolveDateRange(parsed);

    let rows: any[] = [];

    switch (reportType) {
      case "SOCIOS":
        const socios = await prisma.socio.findMany({
          where: { createdAt: { gte: desde, lte: hasta } },
          select: {
            codigo: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            estado: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        });
        rows = socios.map((s) => ({
          codigo: s.codigo,
          nombre: `${s.nombres} ${s.apellidos}`,
          documento: s.numeroDocumento,
          estado: s.estado,
          fechaRegistro: format(s.createdAt, "dd/MM/yyyy HH:mm"),
        }));
        break;

      case "INGRESOS":
        const pagos = await prisma.pago.findMany({
          where: { fecha: { gte: desde, lte: hasta } },
          select: {
            id: true,
            monto: true,
            metodoPago: true,
            fecha: true,
            socio: { select: { codigo: true, nombres: true, apellidos: true } },
          },
          orderBy: { fecha: "desc" },
          take: 500,
        });
        rows = pagos.map((p) => ({
          id: p.id.slice(0, 8),
          socio: p.socio ? `${p.socio.nombres} ${p.socio.apellidos} (${p.socio.codigo})` : "General",
          monto: `S/ ${p.monto.toFixed(2)}`,
          metodo: p.metodoPago || "EFECTIVO",
          fecha: format(p.fecha, "dd/MM/yyyy HH:mm"),
        }));
        break;

      case "ASISTENCIA":
        const asistencias = await prisma.asistencia.findMany({
          where: { fecha: { gte: desde, lte: hasta } },
          select: {
            fecha: true,
            socio: { select: { codigo: true, nombres: true, apellidos: true } },
          },
          orderBy: { fecha: "desc" },
          take: 500,
        });
        rows = asistencias.map((a) => ({
          socio: a.socio ? `${a.socio.nombres} ${a.socio.apellidos}` : "N/A",
          codigo: a.socio?.codigo || "N/A",
          fechaHora: format(a.fecha, "dd/MM/yyyy HH:mm"),
        }));
        break;

      case "SUSCRIPCIONES":
        const suscripciones = await prisma.suscripcion.findMany({
          where: { fechaInicio: { gte: desde, lte: hasta } },
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
            socio: { select: { codigo: true, nombres: true, apellidos: true } },
            plan: { select: { nombre: true } },
          },
          orderBy: { fechaInicio: "desc" },
          take: 500,
        });
        rows = suscripciones.map((s) => ({
          socio: `${s.socio.nombres} ${s.socio.apellidos} (${s.socio.codigo})`,
          plan: s.plan?.nombre || "Sin Plan",
          fechaInicio: format(s.fechaInicio, "dd/MM/yyyy"),
          fechaFin: format(s.fechaFin, "dd/MM/yyyy"),
          estado: s.estado,
        }));
        break;

      case "PERSONAL":
        const personal = await prisma.personal.findMany({
          select: {
            codigo: true,
            nombres: true,
            apellidos: true,
            rol: true,
            activo: true,
            metodoPago: true,
            montoPago: true,
          },
          take: 500,
        });
        rows = personal.map((p) => ({
          codigo: p.codigo,
          nombre: `${p.nombres} ${p.apellidos}`,
          rol: p.rol,
          estado: p.activo ? "ACTIVO" : "INACTIVO",
          salarioBase: `S/ ${p.montoPago.toFixed(2)} (${p.metodoPago})`,
        }));
        break;
    }

    return { success: true, data: rows };
  } catch (err: any) {
    console.error("Error en getExecutiveReportData:", err);
    return { success: false, error: err.message || "Error al obtener los datos del reporte." };
  }
}

/**
 * Exportación de reportes administrativos a formato CSV
 */
export async function exportExecutiveReportCSV(
  reportType: "SOCIOS" | "INGRESOS" | "ASISTENCIA" | "SUSCRIPCIONES" | "PERSONAL",
  filters: DashboardFilters = { periodo: "30d" }
) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const dataRes = await getExecutiveReportData(reportType, filters);

    if (!dataRes.success || !dataRes.data || dataRes.data.length === 0) {
      return { success: false, error: "No existen datos para generar el reporte CSV en el período seleccionado." };
    }

    const rows = dataRes.data;
    const headers = Object.keys(rows[0]).join(",");
    const csvLines = rows.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csvContent = [headers, ...csvLines].join("\n");

    // Registrar en AuditLog
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "GENERAR_REPORTE_ADMIN",
        detalles: JSON.stringify({ reportType, formato: "CSV" }),
      },
    });

    return {
      success: true,
      filename: `MrGym_Reporte_${reportType}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
      csvContent,
    };
  } catch (err: any) {
    console.error("Error en exportExecutiveReportCSV:", err);
    return { success: false, error: err.message || "Error al exportar reporte CSV." };
  }
}

/**
 * Exportación de reportes administrativos a PDF
 */
export async function exportExecutiveReportPDF(
  reportType: "SOCIOS" | "INGRESOS" | "ASISTENCIA" | "SUSCRIPCIONES" | "PERSONAL",
  filters: DashboardFilters = { periodo: "30d" }
) {
  try {
    const user = await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");
    const dataRes = await getExecutiveReportData(reportType, filters);

    if (!dataRes.success || !dataRes.data || dataRes.data.length === 0) {
      return { success: false, error: "No existen datos para generar el reporte PDF en el período seleccionado." };
    }

    const rows = dataRes.data;
    const doc = new jsPDF();

    // Encabezado institucional
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 30, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("MR. GYM — REPORTE EJECUTIVO", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`TIPO: ${reportType} | FECHA: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);

    // Tabla de contenidos
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

    // Registrar en AuditLog
    await prisma.auditLog.create({
      data: {
        usuario: user.name || user.userId || "Sistema",
        accion: "GENERAR_REPORTE_ADMIN",
        detalles: JSON.stringify({ reportType, formato: "PDF" }),
      },
    });

    return {
      success: true,
      filename: `MrGym_Reporte_${reportType}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`,
      pdfBase64,
    };
  } catch (err: any) {
    console.error("Error en exportExecutiveReportPDF:", err);
    return { success: false, error: err.message || "Error al exportar reporte PDF." };
  }
}
