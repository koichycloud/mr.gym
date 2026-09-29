/**
 * Reglas oficiales de prescripción de volumen de ejercicios por duración de sesión.
 * FASE B1 — Sistema de Planificación Deportiva Mr. Gym
 *
 * Mapeo Oficial:
 * - 45 min  -> 4 a 5 ejercicios (sugerido: 5)
 * - 60 min  -> 5 a 6 ejercicios (sugerido: 6)
 * - 75 min  -> 7 a 8 ejercicios (sugerido: 7)
 * - 90 min  -> 7 a 8 ejercicios (sugerido: 8)
 * - 120 min -> 8 a 10 ejercicios (sugerido: 9)
 *
 * Duraciones intermedias y límites seguros:
 * - < 45 min: Cota mínima segura (4-5 ejercicios, sugerido: 4)
 * - 45 a 59 min: 4-5 ejercicios (sugerido: 5)
 * - 60 a 74 min: 5-6 ejercicios (sugerido: 6)
 * - 75 a 89 min: 7-8 ejercicios (sugerido: 7)
 * - 90 a 119 min: 7-8 ejercicios (sugerido: 8)
 * - >= 120 min: Cota máxima segura (8-10 ejercicios, sugerido: 9)
 */

export interface RangoVolumenEjercicios {
  min: number;
  max: number;
  sugerido: number;
}

/**
 * Calcula el rango de ejercicios por sesión según la duración en minutos.
 * Garantiza valores acotados entre 4 (mínimo absoluto) y 10 (máximo absoluto).
 */
export function calcularRangoEjerciciosPorDuracion(
  duracionMinutos?: number | null
): RangoVolumenEjercicios {
  const minutos = typeof duracionMinutos === "number" && !isNaN(duracionMinutos) && duracionMinutos > 0
    ? duracionMinutos
    : 60; // Valor estándar por defecto si no está especificado

  if (minutos < 45) {
    // Sesiones cortas (15 a 44 min): volumen compacto sin bajar de 4
    return { min: 4, max: 5, sugerido: 4 };
  }

  if (minutos < 60) {
    // Sesiones estándar de 45 min
    return { min: 4, max: 5, sugerido: 5 };
  }

  if (minutos < 75) {
    // Sesiones estándar de 60 min
    return { min: 5, max: 6, sugerido: 6 };
  }

  if (minutos < 90) {
    // Sesiones de 75 min
    return { min: 7, max: 8, sugerido: 7 };
  }

  if (minutos < 120) {
    // Sesiones de 90 min
    return { min: 7, max: 8, sugerido: 8 };
  }

  // Sesiones de 120 min o más: cota superior de 10 ejercicios
  return { min: 8, max: 10, sugerido: 9 };
}
