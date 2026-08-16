import { differenceInYears } from "date-fns";
import {
  PlanningAIInput,
  planningAIInputSchema,
  DIAS_SEMANA_VALIDOS,
  OBJETIVOS_PLANIFICACION,
  NIVELES_PLANIFICACION,
} from "../validations";
import { RawPlanningData } from "./data-collector";

/**
 * Limpia y sanitiza texto libre para mitigar prompt injections y eliminar caracteres de control.
 */
export function sanitizeText(text?: string | null, maxLength: number = 500): string | null {
  if (!text) return null;
  const trimmed = text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Eliminar caracteres de control
    .replace(/`{3,}/g, "''") // Evitar rotura de bloques markdown de código
    .trim();

  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Determina la tendencia ponderada de peso a partir del historial antropométrico.
 */
function calculateWeightTrend(
  historial: Array<{ fecha: Date; peso: number | null }>
): "DESCENDENTE" | "ASCENDENTE" | "ESTABLE" | "SIN_HISTORIAL" {
  if (!historial) return "SIN_HISTORIAL";
  const valid = historial.filter((m): m is { fecha: Date; peso: number; porcentajeGrasa?: number | null; porcentajeMusculo?: number | null } => typeof m.peso === "number" && m.peso > 0);
  if (valid.length < 2) return "SIN_HISTORIAL";
  const actual = valid[0].peso;
  const inicial = valid[valid.length - 1].peso;
  const diff = actual - inicial;

  if (Math.abs(diff) < 0.5) return "ESTABLE";
  return diff > 0 ? "ASCENDENTE" : "DESCENDENTE";
}

/**
 * Transforma los datos en bruto recopilados en un objeto estricto PlanningAIInput,
 * aplicando exclusión absoluta de PII y sanitización de seguridad.
 */
export function sanitizePlanningAIInput(raw: RawPlanningData): PlanningAIInput {
  const now = new Date();
  const edadCalculada = Math.max(10, Math.min(120, differenceInYears(now, raw.socio.fechaNacimiento)));
  const sexoNormalizado = raw.socio.sexo === "F" ? "F" : "M";

  // 1. Sanitizar Medidas Actuales
  let medidasActuales: PlanningAIInput["medidasActuales"] = null;
  if (
    raw.medidaActual &&
    typeof raw.medidaActual.peso === "number" &&
    typeof raw.medidaActual.altura === "number" &&
    raw.medidaActual.peso > 0 &&
    raw.medidaActual.altura > 0
  ) {
    const alturaM = raw.medidaActual.altura / 100;
    const imc = Number((raw.medidaActual.peso / (alturaM * alturaM)).toFixed(1));

    medidasActuales = {
      fecha: raw.medidaActual.fecha.toISOString().split("T")[0],
      pesoKg: Number(raw.medidaActual.peso.toFixed(1)),
      tallaCm: Math.round(raw.medidaActual.altura),
      porcentajeGrasa: raw.medidaActual.porcentajeGrasa
        ? Number(raw.medidaActual.porcentajeGrasa.toFixed(1))
        : null,
      porcentajeMusculo: raw.medidaActual.porcentajeMusculo
        ? Number(raw.medidaActual.porcentajeMusculo.toFixed(1))
        : null,
      imc,
      perimetrosCm: {
        pecho: raw.medidaActual.pecho ? Number(raw.medidaActual.pecho.toFixed(1)) : null,
        cintura: raw.medidaActual.cintura ? Number(raw.medidaActual.cintura.toFixed(1)) : null,
        vientreBajo: raw.medidaActual.vientreBajo ? Number(raw.medidaActual.vientreBajo.toFixed(1)) : null,
        gluteos: raw.medidaActual.gluteos ? Number(raw.medidaActual.gluteos.toFixed(1)) : null,
        cuello: raw.medidaActual.cuello ? Number(raw.medidaActual.cuello.toFixed(1)) : null,
        hombros: raw.medidaActual.hombros ? Number(raw.medidaActual.hombros.toFixed(1)) : null,
        biceps: raw.medidaActual.biceps ? Number(raw.medidaActual.biceps.toFixed(1)) : null,
        antebrazos: raw.medidaActual.antebrazos ? Number(raw.medidaActual.antebrazos.toFixed(1)) : null,
        cuadriceps: raw.medidaActual.cuadriceps ? Number(raw.medidaActual.cuadriceps.toFixed(1)) : null,
        pantorrillas: raw.medidaActual.pantorrillas ? Number(raw.medidaActual.pantorrillas.toFixed(1)) : null,
      },
    };
  }

  // 2. Sanitizar Evolución Histórica
  let evolucionHistorica: PlanningAIInput["evolucionHistorica"] = null;
  if (raw.historialMedidas && raw.historialMedidas.length > 0) {
    const valid = raw.historialMedidas.filter((m): m is { fecha: Date; peso: number; porcentajeGrasa: number | null; porcentajeMusculo: number | null } => typeof m.peso === "number" && m.peso > 0);
    const total = valid.length;
    if (total > 0) {
      const inicial = valid[total - 1];
      const previa = total > 1 ? valid[1] : undefined;

      evolucionHistorica = {
        medicionInicial: inicial
          ? {
              fecha: inicial.fecha.toISOString().split("T")[0],
              pesoKg: Number(inicial.peso.toFixed(1)),
              porcentajeGrasa: inicial.porcentajeGrasa ? Number(inicial.porcentajeGrasa.toFixed(1)) : null,
            }
          : undefined,
        medicionPrevia: previa
          ? {
              fecha: previa.fecha.toISOString().split("T")[0],
              pesoKg: Number(previa.peso.toFixed(1)),
              porcentajeGrasa: previa.porcentajeGrasa ? Number(previa.porcentajeGrasa.toFixed(1)) : null,
            }
          : undefined,
        totalMedicionesRegistradas: total,
        tendenciaPeso: calculateWeightTrend(raw.historialMedidas),
      };
    }
  }

  // 3. Normalizar Días Preferidos
  const diasRaw = raw.perfil.diasPreferidos || [];
  const diasFiltrados = diasRaw.filter((d): d is (typeof DIAS_SEMANA_VALIDOS)[number] =>
    (DIAS_SEMANA_VALIDOS as readonly string[]).includes(d)
  );
  const diasPreferidos = Array.from(new Set(diasFiltrados));

  // Si no hay días preferidos especificados, derivar días por defecto según diasPorSemana
  if (diasPreferidos.length === 0) {
    const defaultDays: Array<(typeof DIAS_SEMANA_VALIDOS)[number]> = [
      "LUNES",
      "MIERCOLES",
      "VIERNES",
      "MARTES",
      "JUEVES",
      "SABADO",
      "DOMINGO",
    ];
    diasPreferidos.push(...defaultDays.slice(0, Math.min(raw.perfil.diasPorSemana, 7)));
  }

  // 4. Construir objeto sanitizado
  const rawInputCandidate = {
    socio: {
      id: raw.socio.id,
      codigo: raw.socio.codigo,
      edad: edadCalculada,
      sexo: sexoNormalizado,
    },
    medidasActuales,
    evolucionHistorica,
    objetivos: {
      principal: (OBJETIVOS_PLANIFICACION as readonly string[]).includes(raw.perfil.objetivoPrincipal)
        ? (raw.perfil.objetivoPrincipal as (typeof OBJETIVOS_PLANIFICACION)[number])
        : "HIPERTROFIA",
      secundario: sanitizeText(raw.perfil.objetivoSecundario, 250),
      nivel: (NIVELES_PLANIFICACION as readonly string[]).includes(raw.perfil.nivel)
        ? (raw.perfil.nivel as (typeof NIVELES_PLANIFICACION)[number])
        : "INTERMEDIO",
      tiempoEntrenando: sanitizeText(raw.perfil.tiempoEntrenando, 100),
      experienciaPrevia: sanitizeText(raw.perfil.experienciaPrevia, 500),
    },
    disponibilidad: {
      diasPorSemana: Math.max(1, Math.min(7, raw.perfil.diasPorSemana)),
      diasPreferidos,
      duracionMinutosPorSesion: Math.max(15, Math.min(240, raw.perfil.duracionMinutos)),
      horarioPreferido: sanitizeText(raw.perfil.horarioPreferido, 100),
    },
    entrenamiento: {
      tipoPreferido: sanitizeText(raw.perfil.tipoEntrenamiento, 200),
      ejerciciosExcluidos: sanitizeText(raw.perfil.ejerciciosEvitados, 500),
      lesionesDeclaradas: sanitizeText(raw.perfil.lesionesReportadas, 500),
      capacidadCardiovascular: sanitizeText(raw.perfil.capacidadCardiovascular, 100),
      capacidadFuerza: sanitizeText(raw.perfil.capacidadFuerza, 100),
      equipamientoDisponible: sanitizeText(raw.perfil.equipamientoDisponible, 200),
    },
    alimentacionDeclarada: {
      preferencia: sanitizeText(raw.perfil.preferenciaAlimenticia, 100) || "Omnívoro",
      alergiasIntolerancias: sanitizeText(raw.perfil.alergiasDeclaradas, 500),
      alimentosEvitados: sanitizeText(raw.perfil.alimentosEvitados, 500),
      comidasPorDia: raw.perfil.numeroComidasDia
        ? Math.max(1, Math.min(10, raw.perfil.numeroComidasDia))
        : null,
      consumoAguaLitrosPorDia: raw.perfil.consumoAguaLitros
        ? Number(Math.max(0, Math.min(20, raw.perfil.consumoAguaLitros)).toFixed(1))
        : null,
    },
    criterioEntrenador: {
      observaciones: sanitizeText(raw.perfil.observaciones, 1000),
      motivoVersion: sanitizeText(raw.perfil.motivoVersionado, 250),
    },
  };

  // Validar con Zod antes de entregar
  return planningAIInputSchema.parse(rawInputCandidate);
}
