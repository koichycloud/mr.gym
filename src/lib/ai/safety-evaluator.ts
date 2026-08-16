import { PlanningAIInput, PlanningAIOutput } from "../validations";

export interface SafetyEvaluationResult {
  requiresHumanReview: boolean;
  banderasAdvertencia: string[];
  observacionesMedicasDeclaradas: string;
  alergiasDetectadasYMitigadas: string[];
}

/**
 * Evalúa las condiciones de seguridad biomecánica y nutricional del input y output.
 * Aplica el principio conservador: ante cualquier condición de riesgo declarada o
 * información insuficiente, se exige revisión humana obligatoria (requiresHumanReview = true).
 */
export function evaluatePlanningSafety(
  input: PlanningAIInput,
  output?: PlanningAIOutput | null
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

  // 6. Auditoría de Recetas contra Alérgenos Conocidos si hay Output
  if (output && output.planAlimentacion?.recetas && alergiasMitigadas.length > 0) {
    const palabrasAlergia = alergiasMitigadas
      .flatMap((a) => a.toLowerCase().split(/[,\s]+/))
      .filter((w) => w.length > 3);

    for (const receta of output.planAlimentacion.recetas) {
      const textoIngredientes = receta.ingredientes.join(" ").toLowerCase();
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
