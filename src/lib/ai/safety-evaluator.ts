import { PlanningAIInput, PlanningAIOutput } from "../validations";
import { calcularRangoEjerciciosPorDuracion } from "./volume-rules";
import { CatalogExerciseItem, normalizeExerciseName } from "./catalog-helper";

export interface SafetyEvaluationResult {
  requiresHumanReview: boolean;
  banderasAdvertencia: string[];
  observacionesMedicasDeclaradas: string;
  alergiasDetectadasYMitigadas: string[];
}

/**
 * Evalúa las condiciones de seguridad biomecánica, nutricional, volumen y catálogo del input y output.
 * Aplica el principio conservador: ante cualquier condición de riesgo declarada o
 * información insuficiente, se exige revisión humana obligatoria (requiresHumanReview = true).
 */
export function evaluatePlanningSafety(
  input: PlanningAIInput,
  output?: PlanningAIOutput | null,
  catalog?: CatalogExerciseItem[],
  reconciliationWarnings?: string[]
): SafetyEvaluationResult {
  const banderas: string[] = [];
  const alergiasMitigadas: string[] = [];

  // 1. Detección de Lesiones o Restricciones Físicas Declaradas
  const lesiones = input.entrenamiento.lesionesDeclaradas?.trim();
  if (lesiones && lesiones.length > 0) {
    banderas.push(`Restricción física o lesión declarada por el socio: "${lesiones}".`);
  }

  // 2. Detección de Alergias o Intolerancias Declaradas
  const alergias = input.alimentacionDeclarada.alergiasIntolerancias?.trim();
  if (alergias && alergias.length > 0 && alergias.toLowerCase() !== "ninguna" && alergias.toLowerCase() !== "ninguno") {
    banderas.push(`Alergia o intolerancia alimentaria declarada: "${alergias}".`);
    alergiasMitigadas.push(alergias);
  }

  // 3. Detección de Alimentos Evitados
  const evitados = input.alimentacionDeclarada.alimentosEvitados?.trim();
  if (evitados && evitados.length > 0 && evitados.toLowerCase() !== "ninguno") {
    banderas.push(`Alimentos excluidos declarados: "${evitados}".`);
  }

  // 4. Verificación de Suficiencia de Medidas Físicas
  if (!input.medidasActuales || input.medidasActuales.pesoKg <= 0 || input.medidasActuales.tallaCm <= 0) {
    banderas.push(
      "Información física incompleta: No se cuenta con peso o talla registrados en MedidaFisica. Plan generado con valores referenciales."
    );
  }

  // 5. Inconsistencia entre Nivel y Frecuencia
  if (input.objetivos.nivel === "AVANZADO" && input.disponibilidad.diasPorSemana < 3) {
    banderas.push(
      "Discrepancia técnica: Socio con nivel Avanzado pero disponibilidad menor a 3 días semanales. Requiere ajuste de volumen."
    );
  }

  // 6. Auditoría Defensiva de Volumen de Ejercicios por Duración de Sesión (FASE B1)
  if (output && output.planEntrenamiento?.niveles) {
    const duracionSesion = input.disponibilidad?.duracionMinutosPorSesion || 60;
    const rangoVolumen = calcularRangoEjerciciosPorDuracion(duracionSesion);

    for (const nivel of output.planEntrenamiento.niveles) {
      for (const sesion of nivel.sesiones || []) {
        const totalEj = (sesion.ejercicios || []).length;
        if (totalEj < rangoVolumen.min) {
          banderas.push(
            `Volumen reducido en Nivel ${nivel.numeroNivel} (${sesion.nombre}): contiene ${totalEj} ejercicios, inferior al mínimo recomendado de ${rangoVolumen.min} para una sesión de ${duracionSesion} minutos.`
          );
        }

        // Detección defensiva de duplicados dentro de la misma sesión
        const nombresEj = (sesion.ejercicios || [])
          .map((e: any) => e.nombre?.trim().toLowerCase())
          .filter(Boolean);
        const setNombres = new Set(nombresEj);
        if (setNombres.size < nombresEj.length) {
          banderas.push(
            `Posible ejercicio duplicado detectado en Nivel ${nivel.numeroNivel} (${sesion.nombre}).`
          );
        }
      }
    }
  }

  // 7. Auditoría de Integridad del Catálogo y Compatibilidad Biomecánica (FASE C)
  if (output && output.planEntrenamiento?.niveles) {
    const catalogMap = new Map<string, CatalogExerciseItem>();
    if (catalog) {
      for (const item of catalog) {
        catalogMap.set(item.id, item);
      }
    }

    const ejerciciosExcluidosTexto = (input.entrenamiento.ejerciciosExcluidos || "").toLowerCase();
    const lesionesTexto = (input.entrenamiento.lesionesDeclaradas || "").toLowerCase();
    const equipamientoSocio = (input.entrenamiento.equipamientoDisponible || "").toUpperCase();

    for (const nivel of output.planEntrenamiento.niveles) {
      for (const sesion of nivel.sesiones || []) {
        for (const ej of sesion.ejercicios || []) {
          // A. Ejercicio sin UUID o con UUID huérfano
          if (!ej.ejercicioId) {
            // Solo warning de calidad para no invalidar planes históricos
            banderas.push(
              `Ejercicio sin vincular al catálogo en Nivel ${nivel.numeroNivel} (${sesion.nombre}): "${ej.nombre}".`
            );
          } else if (catalog && !catalogMap.has(ej.ejercicioId)) {
            banderas.push(
              `Ejercicio con ID no reconocido en catálogo en Nivel ${nivel.numeroNivel} (${sesion.nombre}): "${ej.nombre}" (ID: ${ej.ejercicioId}).`
            );
          } else if (catalog && catalogMap.has(ej.ejercicioId)) {
            const catItem = catalogMap.get(ej.ejercicioId)!;

            // B. Ejercicio Inactivo
            if (!catItem.activo) {
              banderas.push(
                `Ejercicio inactivo prescrito en Nivel ${nivel.numeroNivel} (${sesion.nombre}): "${catItem.nombre}".`
              );
            }

            // C. Incompatibilidad con ejercicios excluidos declarados
            if (
              ejerciciosExcluidosTexto.length > 0 &&
              (ejerciciosExcluidosTexto.includes(catItem.nombre.toLowerCase()) ||
                ejerciciosExcluidosTexto.includes(normalizeExerciseName(catItem.nombre)))
            ) {
              banderas.push(
                `Ejercicio excluido prescrito en Nivel ${nivel.numeroNivel} (${sesion.nombre}): "${catItem.nombre}".`
              );
            }

            // D. Incompatibilidad con equipamiento (si el socio tiene solo peso corporal pero se prescribe gimnasio completo)
            if (
              equipamientoSocio === "PESO_CORPORAL" &&
              catItem.equipamientoRequerido === "GIMNASIO_COMPLETO"
            ) {
              banderas.push(
                `Equipamiento incompatible en Nivel ${nivel.numeroNivel} (${sesion.nombre}): "${catItem.nombre}" requiere ${catItem.equipamientoRequerido} pero el socio solo dispone de peso corporal.`
              );
            }

            // E. Discrepancia no resuelta entre UUID y Nombre
            const normalizedCatName = normalizeExerciseName(catItem.nombre);
            const normalizedEjName = normalizeExerciseName(ej.nombre);
            if (
              normalizedCatName !== normalizedEjName &&
              !normalizedEjName.includes(normalizedCatName) &&
              !normalizedCatName.includes(normalizedEjName)
            ) {
              banderas.push(
                `Discrepancia detectada en Nivel ${nivel.numeroNivel} (${sesion.nombre}): ejercicioId "${ej.ejercicioId}" pertenece a "${catItem.nombre}" pero se especificó "${ej.nombre}". Requiere revisión humana.`
              );
            }
          }
        }
      }
    }
  }

  // 8. Incorporar Advertencias de Reconciliación
  if (reconciliationWarnings && reconciliationWarnings.length > 0) {
    for (const w of reconciliationWarnings) {
      banderas.push(w);
    }
  }

  // 9. Auditoría de Recetas contra Alérgenos Conocidos si hay Output
  if (output && output.planAlimentacion?.recetas && alergiasMitigadas.length > 0) {
    const palabrasAlergia = alergiasMitigadas
      .flatMap((a) => a.toLowerCase().split(/[,\s]+/))
      .filter((w) => w.length > 3);

    for (const receta of output.planAlimentacion.recetas) {
      const nombresDetalle = (receta.ingredientesDetalle || []).map((i: any) => i.nombre).join(" ");
      const nombresHistoricos = (receta.ingredientes || []).join(" ");
      const textoIngredientes = `${nombresDetalle} ${nombresHistoricos}`.toLowerCase();
      for (const palabra of palabrasAlergia) {
        if (textoIngredientes.includes(palabra)) {
          banderas.push(
            `Posible coincidencia de alérgeno en receta "${receta.nombre}": contiene término similar a "${palabra}".`
          );
        }
      }
    }
  }

  // Incorporar banderas devueltas por el propio modelo IA si existen
  if (output && output.evaluacionSeguridad?.banderasAdvertencia) {
    for (const b of output.evaluacionSeguridad.banderasAdvertencia) {
      if (!banderas.includes(b)) {
        banderas.push(b);
      }
    }
  }

  // Regla conservadora: Si hay al menos una bandera de advertencia, requiere revisión humana
  const requiresHumanReview = banderas.length > 0;

  const observacionesMedicasDeclaradas = lesiones
    ? `Información declarada: ${lesiones}. No constituye diagnóstico médico.`
    : "Sin restricciones físicas declaradas al momento de la generación.";

  return {
    requiresHumanReview,
    banderasAdvertencia: Array.from(new Set(banderas)),
    observacionesMedicasDeclaradas,
    alergiasDetectadasYMitigadas: Array.from(new Set(alergiasMitigadas)),
  };
}
