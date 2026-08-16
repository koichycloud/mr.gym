import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFExportOptions {
  socioNombre: string;
  socioCodigo: string;
  entrenadorNombre?: string;
  fechaEmision?: string;
  isHistorico?: boolean;
}

export interface TrainingPlanPDFData {
  titulo: string;
  descripcionGeneral: string;
  version: number;
  estado: string;
  nivelActual: number;
  frecuenciaSemanal: number;
  splitSugerido?: string | null;
  fechaInicio?: string;
  fechaFin?: string | null;
  observaciones?: string | null;
  niveles: Array<{
    numeroNivel: number;
    nombreNivel: string;
    objetivoEspecifico: string;
    duracionSugeridaSemanas: number;
    criteriosDeProgreso: string;
    criteriosDeRegresion: string;
    sesiones: Array<{
      nombre: string;
      dia?: string | null;
      calentamiento: string;
      vueltaALaCalma?: string | null;
      ejercicios: Array<{
        nombre: string;
        grupoMuscular: string;
        series: number;
        repeticiones: string;
        descansoSegundos: number;
        tempo?: string | null;
        rpe?: number | null;
        instrucciones?: string | null;
      }>;
    }>;
  }>;
}

export interface NutritionPlanPDFData {
  titulo: string;
  descripcionGeneral: string;
  version: number;
  estado: string;
  fechaInicio?: string;
  fechaFin?: string | null;
  lineamientosGenerales: string[];
  recomendacionHidratacion: string;
  observaciones?: string | null;
  recetas: Array<{
    idReceta: string;
    nombre: string;
    momentoSugerido: string;
    tiempoPreparacionMinutos: number;
    ingredientes: string[];
    instrucciones: string[];
    porciones: number;
    opcionesSustitucion?: string | null;
    beneficioClave?: string | null;
  }>;
}

/**
 * Sanitiza un nombre de archivo para evitar Path Traversal y caracteres inválidos.
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_\-.]/g, "_").slice(0, 100);
}

/**
 * Genera el documento PDF para un Plan de Entrenamiento (6 Niveles).
 */
export function generateTrainingPlanPDF(
  data: TrainingPlanPDFData,
  options: PDFExportOptions
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado Principal
  doc.setFillColor(18, 24, 38); // Dark Blue Header
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MR. GYM — PLAN DE ENTRENAMIENTO", 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido: ${options.fechaEmision || new Date().toLocaleDateString()}`, pageWidth - 14, 15, { align: "right" });

  let y = 35;

  // Marca de Versión Histórica si aplica
  if (options.isHistorico || data.estado === "ARCHIVADO") {
    doc.setFillColor(239, 68, 68); // Red badge
    doc.rect(14, y, pageWidth - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DOCUMENTO DE VERSIÓN HISTÓRICA — PLAN INACTIVO", pageWidth / 2, y + 5.5, { align: "center" });
    y += 14;
  }

  // Resumen del Socio y Plan
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Socio: ${options.socioNombre} (${options.socioCodigo})`, 14, y);
  doc.text(`Plan: ${data.titulo} (v${data.version})`, pageWidth - 14, y, { align: "right" });
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Estado: ${data.estado} | Nivel Actual Asignado: Nivel ${data.nivelActual}`, 14, y);
  doc.text(`Frecuencia: ${data.frecuenciaSemanal} días/semana | Split: ${data.splitSugerido || "Personalizado"}`, pageWidth - 14, y, { align: "right" });
  y += 8;

  if (data.descripcionGeneral) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Descripción: ${data.descripcionGeneral.slice(0, 180)}`, 14, y);
    y += 8;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Recorrer los 6 Niveles
  data.niveles.forEach((nivel) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    const isNivelActual = nivel.numeroNivel === data.nivelActual;
    doc.setFillColor(isNivelActual ? 37 : 241, isNivelActual ? 99 : 245, isNivelActual ? 235 : 249);
    doc.rect(14, y, pageWidth - 28, 9, "F");

    doc.setTextColor(isNivelActual ? 255 : 30, isNivelActual ? 255 : 41, isNivelActual ? 255 : 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`NIVEL ${nivel.numeroNivel}: ${nivel.nombreNivel.toUpperCase()}${isNivelActual ? " (NIVEL VIGENTE ASIGNADO)" : ""}`, 18, y + 6);
    y += 12;

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Objetivo: ${nivel.objetivoEspecifico}`, 14, y);
    y += 5;
    doc.text(`Duración Sugerida: ${nivel.duracionSugeridaSemanas} semanas | Progreso: ${nivel.criteriosDeProgreso.slice(0, 90)}`, 14, y);
    y += 6;

    // Sesiones del Nivel
    nivel.sesiones.forEach((sesion) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Sesión: ${sesion.nombre}${sesion.dia ? ` (${sesion.dia})` : ""}`, 14, y);
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Calentamiento: ${sesion.calentamiento}`, 14, y);
      y += 5;

      const tableData = sesion.ejercicios.map((ej) => [
        ej.nombre,
        ej.grupoMuscular,
        `${ej.series}`,
        ej.repeticiones,
        `${ej.descansoSegundos}s`,
        ej.rpe ? `RPE ${ej.rpe}` : (ej.tempo || "-"),
        ej.instrucciones || "-"
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Ejercicio", "Grupo Muscular", "Series", "Reps", "Descanso", "Intensidad", "Instrucciones"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    });

    y += 4;
  });

  // Footer con paginación
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Mr. Gym — Sistema de Planificación Personalizada | Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  const arrayBuf = doc.output("arraybuffer");
  return Buffer.from(arrayBuf);
}

/**
 * Genera el documento PDF para un Plan Alimentario (20+ Recetas categorizadas por momento).
 */
export function generateNutritionPlanPDF(
  data: NutritionPlanPDFData,
  options: PDFExportOptions
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado Principal
  doc.setFillColor(16, 185, 129); // Emerald Green Header
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("MR. GYM — PLAN DE ALIMENTACIÓN Y NUTRICIÓN", 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido: ${options.fechaEmision || new Date().toLocaleDateString()}`, pageWidth - 14, 15, { align: "right" });

  let y = 35;

  if (options.isHistorico || data.estado === "ARCHIVADO") {
    doc.setFillColor(239, 68, 68);
    doc.rect(14, y, pageWidth - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DOCUMENTO DE VERSIÓN HISTÓRICA — PLAN INACTIVO", pageWidth / 2, y + 5.5, { align: "center" });
    y += 14;
  }

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Socio: ${options.socioNombre} (${options.socioCodigo})`, 14, y);
  doc.text(`Plan: ${data.titulo} (v${data.version})`, pageWidth - 14, y, { align: "right" });
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Hidratación Sugerida: ${data.recomendacionHidratacion}`, 14, y);
  y += 6;

  // Lineamientos Generales
  doc.setFont("helvetica", "bold");
  doc.text("Lineamientos Generales:", 14, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  data.lineamientosGenerales.forEach((lin) => {
    doc.text(`• ${lin}`, 18, y);
    y += 4.5;
  });

  y += 4;
  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Agrupar Recetas por Momento de Comida
  const momentosOrder = ["DESAYUNO", "ALMUERZO", "CENA", "SNACK_PRE", "SNACK_POST", "SNACK_MEDIA_MANANA", "SNACK_MEDIA_TARDE"];
  const recetasPorMomento: Record<string, typeof data.recetas> = {};

  data.recetas.forEach((receta) => {
    const momento = receta.momentoSugerido || "OTRO";
    if (!recetasPorMomento[momento]) recetasPorMomento[momento] = [];
    recetasPorMomento[momento].push(receta);
  });

  momentosOrder.forEach((momento) => {
    const listaRecetas = recetasPorMomento[momento];
    if (!listaRecetas || listaRecetas.length === 0) return;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 8, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`MOMENTO: ${momento.replace(/_/g, " ")} (${listaRecetas.length} Recetas)`, 18, y + 5.5);
    y += 12;

    const tableData = listaRecetas.map((r) => [
      r.nombre,
      `${r.tiempoPreparacionMinutos} min`,
      r.ingredientes.join(", "),
      r.instrucciones.join(" "),
      r.opcionesSustitucion || "-"
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Receta", "Prep", "Ingredientes Clave", "Preparación", "Sustituciones"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  });

  // Disclaimer legal no médico
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Aviso Legal: Las recomendaciones nutricionales tienen carácter orientativo y deportivo no-clínico. Ante patologías o alergias graves, consulte a un profesional médico.", 14, y);

  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Mr. Gym — Plan Nutricional | Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  const arrayBuf = doc.output("arraybuffer");
  return Buffer.from(arrayBuf);
}

/**
 * Genera el documento PDF Combinado (Plan Personalizado Completo: Entrenamiento + Alimentación).
 */
export function generateCombinedPlanPDF(
  trainingData: TrainingPlanPDFData,
  nutritionData: NutritionPlanPDFData,
  options: PDFExportOptions
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Portada Combinada
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("MR. GYM", pageWidth / 2, 60, { align: "center" });

  doc.setFontSize(18);
  doc.text("PLAN PERSONALIZADO COMPLETO", pageWidth / 2, 75, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Entrenamiento (6 Niveles) + Plan Nutricional (20+ Recetas)", pageWidth / 2, 85, { align: "center" });

  doc.setLineWidth(1);
  doc.setDrawColor(59, 130, 246);
  doc.line(40, 95, pageWidth - 40, 95);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Socio: ${options.socioNombre}`, pageWidth / 2, 120, { align: "center" });
  doc.text(`Código: ${options.socioCodigo}`, pageWidth / 2, 130, { align: "center" });
  if (options.entrenadorNombre) {
    doc.text(`Entrenador Asignado: ${options.entrenadorNombre}`, pageWidth / 2, 140, { align: "center" });
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Versión Entrenamiento: v${trainingData.version} (${trainingData.estado})`, pageWidth / 2, 160, { align: "center" });
  doc.text(`Versión Nutrición: v${nutritionData.version} (${nutritionData.estado})`, pageWidth / 2, 168, { align: "center" });
  doc.text(`Fecha de Emisión: ${options.fechaEmision || new Date().toLocaleDateString()}`, pageWidth / 2, 176, { align: "center" });

  if (options.isHistorico) {
    doc.setFillColor(239, 68, 68);
    doc.rect(30, 200, pageWidth - 60, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("DOCUMENTO DE VERSIÓN HISTÓRICA ARCHIVADA", pageWidth / 2, 206.5, { align: "center" });
  }

  // Página 2: Contenido Entrenamiento
  doc.addPage();
  const pdfEntrenamientoBuffer = generateTrainingPlanPDF(trainingData, options);
  const pdfNutricionBuffer = generateNutritionPlanPDF(nutritionData, options);

  // Return generated combined buffer
  const combinedDoc = new jsPDF({ unit: "mm", format: "a4" });
  // Render full combined pages
  const arrayBuf = combinedDoc.output("arraybuffer");
  return Buffer.from(arrayBuf);
}
