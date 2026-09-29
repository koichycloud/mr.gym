import prisma from "../prisma";
import { PlanEntrenamientoJSON } from "../validations";

export interface CatalogExerciseItem {
  id: string;
  nombre: string;
  grupoMuscular: string;
  grupoMuscularSecundario?: string | null;
  nivel: string;
  tipoEjercicio: string;
  equipamientoRequerido: string;
  restricciones?: string | null;
  activo: boolean;
}

export type TipoReconciliacion =
  | "EXACT_UUID"
  | "NAME_RECONCILED"
  | "DISCREPANCY_DETECTED"
  | "UNRECOGNIZED"
  | "INACTIVE_EXCLUDED"
  | "HISTORICAL_NULL";

export interface ExerciseReconciliationResult {
  ejercicioId: string | null;
  nombre: string;
  matched: boolean;
  tipo: TipoReconciliacion;
  warning?: string;
  catalogItem?: CatalogExerciseItem;
}

export interface PlanReconciliationSummary {
  plan: PlanEntrenamientoJSON;
  warnings: string[];
  totalEjercicios: number;
  reconciliadosConExito: number;
  sinReconocer: number;
  inactivosDetectados: number;
  discrepanciasDetectadas: number;
}

/**
 * Normaliza nombres de ejercicios para comparación determinista robusta:
 * - Convierte a minúsculas
 * - Remueve tildes y diacríticos
 * - Colapsa espacios y caracteres no alfanuméricos redundantes
 */
export function normalizeExerciseName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover tildes
    .replace(/\(.*?\)/g, " ") // remover texto entre parentesis ej (Leg Press)
    .replace(/[^a-z0-9]/g, " ") // remover signos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Consulta en la base de datos todos los ejercicios actualmente activos.
 * No modifica datos ni realiza escrituras.
 */
export async function getActiveExerciseCatalog(): Promise<CatalogExerciseItem[]> {
  const records = await prisma.ejercicio.findMany({
    where: { activo: true },
    orderBy: [{ grupoMuscular: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      grupoMuscular: true,
      grupoMuscularSecundario: true,
      nivel: true,
      tipoEjercicio: true,
      equipamientoRequerido: true,
      restricciones: true,
      activo: true,
    },
  });

  return records;
}

/**
 * Produce una representación compacta y token-eficiente del catálogo
 * para su inyección controlada en el prompt de Gemini.
 */
export function formatCatalogForPrompt(catalog: CatalogExerciseItem[]): string {
  const lineas = catalog.map((e) => {
    let base = `[${e.id}] ${e.nombre} | ${e.grupoMuscular} | ${e.nivel} | ${e.equipamientoRequerido}`;
    if (e.restricciones && e.restricciones.trim().length > 0) {
      base += ` (Restricción: ${e.restricciones.trim()})`;
    }
    return base;
  });

  return lineas.join("\n");
}

/**
 * Reconcilia un ejercicio individual contra el catálogo activo mediante reglas deterministas.
 */
export function reconcileSingleExercise(
  exercise: { ejercicioId?: string | null; nombre: string },
  catalog: CatalogExerciseItem[]
): ExerciseReconciliationResult {
  const rawId = exercise.ejercicioId?.trim();
  const rawName = exercise.nombre?.trim() || "";
  const normalizedName = normalizeExerciseName(rawName);

  // Mapas de búsqueda rápida
  const idMap = new Map<string, CatalogExerciseItem>();
  const exactNameMap = new Map<string, CatalogExerciseItem>();
  const normalizedNameMap = new Map<string, CatalogExerciseItem>();

  for (const item of catalog) {
    idMap.set(item.id, item);
    exactNameMap.set(item.nombre.toLowerCase().trim(), item);
    normalizedNameMap.set(normalizeExerciseName(item.nombre), item);
  }

  // 1. Caso: ejercicioId provisto y existente en catálogo
  if (rawId && idMap.has(rawId)) {
    const itemById = idMap.get(rawId)!;

    if (!itemById.activo) {
      return {
        ejercicioId: null,
        nombre: rawName,
        matched: false,
        tipo: "INACTIVE_EXCLUDED",
        warning: `El ejercicio '${rawName}' con ID ${rawId} ('${itemById.nombre}') está INACTIVO en la base de datos.`,
      };
    }

    const normalizedItemName = normalizeExerciseName(itemById.nombre);

    // Si el nombre coincide de forma inequívoca con el del ID provisto
    if (
      itemById.nombre.toLowerCase() === rawName.toLowerCase() ||
      normalizedItemName === normalizedName ||
      normalizedName.includes(normalizedItemName) ||
      normalizedItemName.includes(normalizedName)
    ) {
      return {
        ejercicioId: itemById.id,
        nombre: itemById.nombre,
        matched: true,
        tipo: "EXACT_UUID",
        catalogItem: itemById,
      };
    }

    // CONTRADICCIÓN / DISCREPANCIA: El UUID pertenece a un ejercicio pero el nombre es diferente.
    // REGLA ESTRICTA: NO reasignar UUID a otro ejercicio ni sustituir silenciosamente.
    // Conservar datos para auditoría y requerir revisión humana (HITL).
    return {
      ejercicioId: rawId,
      nombre: rawName,
      matched: false,
      tipo: "DISCREPANCY_DETECTED",
      warning: `Discrepancia detectada: IA envió UUID ${rawId} ('${itemById.nombre}') pero con el nombre '${rawName}'. No se sustituye automáticamente; requiere revisión humana.`,
      catalogItem: itemById,
    };
  }

  // 2. Caso: ejercicioId ausente, inválido o no encontrado por ID -> Buscar por nombre
  if (rawName) {
    const itemByName = exactNameMap.get(rawName.toLowerCase()) || normalizedNameMap.get(normalizedName);
    if (itemByName) {
      if (!itemByName.activo) {
        return {
          ejercicioId: null,
          nombre: itemByName.nombre,
          matched: false,
          tipo: "INACTIVE_EXCLUDED",
          warning: `El ejercicio '${itemByName.nombre}' fue identificado pero se encuentra INACTIVO.`,
        };
      }

      return {
        ejercicioId: itemByName.id,
        nombre: itemByName.nombre,
        matched: true,
        tipo: "NAME_RECONCILED",
        warning: rawId
          ? `UUID '${rawId}' no encontrado. Reconciliado inequívocamente por nombre a '${itemByName.nombre}' (${itemByName.id}).`
          : `Ejercicio '${itemByName.nombre}' sin UUID asignado. Reconciliado automáticamente a ID ${itemByName.id}.`,
        catalogItem: itemByName,
      };
    }

    // Búsqueda difusa/parcial segura (ej. "press de banca plano" dentro de "press de banca plano con barra")
    const matchesParciales = catalog.filter((item) => {
      const n = normalizeExerciseName(item.nombre);
      return (n.length >= 6 && normalizedName.includes(n)) || (normalizedName.length >= 6 && n.includes(normalizedName));
    });

    if (matchesParciales.length === 1 && matchesParciales[0].activo) {
      const match = matchesParciales[0];
      return {
        ejercicioId: match.id,
        nombre: match.nombre,
        matched: true,
        tipo: "NAME_RECONCILED",
        warning: `Coincidencia parcial segura: '${rawName}' reconciliado a '${match.nombre}' (${match.id}).`,
        catalogItem: match,
      };
    }
  }

  // 3. Caso: No se pudo identificar en el catálogo
  return {
    ejercicioId: null,
    nombre: rawName,
    matched: false,
    tipo: rawId ? "UNRECOGNIZED" : "HISTORICAL_NULL",
    warning: rawId
      ? `Ejercicio '${rawName}' con ID '${rawId}' no existe en el catálogo activo de 100 ejercicios.`
      : `Ejercicio '${rawName}' no pertenece al catálogo oficial de ejercicios.`,
  };
}

/**
 * Reconcilia de forma determinista todos los ejercicios de una propuesta de entrenamiento
 * contra el catálogo oficial activo antes de la persistencia o revisión HITL.
 */
export function reconcilePlanTrainingExercises(
  planEntrenamiento: PlanEntrenamientoJSON,
  catalog: CatalogExerciseItem[]
): PlanReconciliationSummary {
  const warnings: string[] = [];
  let totalEjercicios = 0;
  let reconciliadosConExito = 0;
  let sinReconocer = 0;
  let inactivosDetectados = 0;
  let discrepanciasDetectadas = 0;

  const nivelesClonados = (planEntrenamiento.niveles || []).map((nivel) => {
    const sesionesClonadas = (nivel.sesiones || []).map((sesion) => {
      const ejerciciosReconciliados = (sesion.ejercicios || []).map((ej) => {
        totalEjercicios++;
        const resultado = reconcileSingleExercise(ej, catalog);

        if (resultado.matched && resultado.ejercicioId) {
          reconciliadosConExito++;
        } else {
          sinReconocer++;
        }

        if (resultado.tipo === "INACTIVE_EXCLUDED") {
          inactivosDetectados++;
        }
        if (resultado.tipo === "DISCREPANCY_DETECTED") {
          discrepanciasDetectadas++;
        }

        if (resultado.warning) {
          warnings.push(`[Nivel ${nivel.numeroNivel} - ${sesion.nombre}]: ${resultado.warning}`);
        }

        return {
          ...ej,
          ejercicioId: resultado.ejercicioId,
          nombre: resultado.nombre,
          grupoMuscular: (resultado.tipo === "EXACT_UUID" || resultado.tipo === "NAME_RECONCILED")
            ? (resultado.catalogItem?.grupoMuscular || ej.grupoMuscular)
            : ej.grupoMuscular,
        };
      });

      return {
        ...sesion,
        ejercicios: ejerciciosReconciliados,
      };
    });

    return {
      ...nivel,
      sesiones: sesionesClonadas,
    };
  });

  return {
    plan: {
      ...planEntrenamiento,
      niveles: nivelesClonados,
    },
    warnings,
    totalEjercicios,
    reconciliadosConExito,
    sinReconocer,
    inactivosDetectados,
    discrepanciasDetectadas,
  };
}
