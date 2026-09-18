"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export interface ResultadoValidacionIA {
  esValidoParaEntrenamiento: boolean;
  esValidoParaAlimentacion: boolean;
  puedeGenerar: boolean;
  camposFaltantesEntrenamiento: string[];
  camposFaltantesAlimentacion: string[];
  advertencias: string[];
  detalles: {
    socio: {
      tieneEdad: boolean;
      tieneSexo: boolean;
    };
    perfil: {
      existe: boolean;
      tieneObjetivo: boolean;
      tieneNivel: boolean;
      tieneDiasPorSemana: boolean;
      tieneDuracionMinutos: boolean;
      tienePreferenciaAlimenticia: boolean;
      tieneAlergiasDeclaradas: boolean;
      tieneAlimentosEvitados: boolean;
    };
    medidas: {
      tieneMedidas: boolean;
      tienePeso: boolean;
      tieneAltura: boolean;
    };
  };
}

/**
 * Valida de forma exhaustiva si el socio y su perfil cuentan con los datos mínimos
 * necesarios para alimentar el motor de IA de forma consistente antes de realizar
 * cualquier llamada a Gemini o Mock.
 */
export async function validarDatosParaGeneracionIA(
  socioId: string
): Promise<{ success: boolean; data?: ResultadoValidacionIA; error?: string }> {
  try {
    await requireAuth();

    if (!socioId || typeof socioId !== "string") {
      return { success: false, error: "ID de socio inválido." };
    }

    // 1. Obtener datos del socio
    const socio = await prisma.socio.findUnique({
      where: { id: socioId },
      select: {
        id: true,
        codigo: true,
        fechaNacimiento: true,
        sexo: true,
      },
    });

    if (!socio) {
      return { success: false, error: "Socio no encontrado en el sistema." };
    }

    // 2. Obtener perfil de planificación activo
    const perfil = await prisma.perfilPlanificacion.findFirst({
      where: {
        socioId,
        activo: true,
      },
    });

    // 3. Obtener última medición física si existe
    const ultimaMedida = await prisma.medidaFisica.findFirst({
      where: { socioId },
      orderBy: { fecha: "desc" },
      select: {
        peso: true,
        altura: true,
      },
    });

    const camposFaltantesEntrenamiento: string[] = [];
    const camposFaltantesAlimentacion: string[] = [];
    const advertencias: string[] = [];

    // Verificaciones de Socio
    const tieneSexo = Boolean(socio.sexo && (socio.sexo === "M" || socio.sexo === "F"));
    if (!tieneSexo) {
      camposFaltantesEntrenamiento.push("Sexo biológico del socio (requerido para biomecánica)");
      camposFaltantesAlimentacion.push("Sexo biológico del socio (requerido para cálculo calórico)");
    }

    const edadCalculada = socio.fechaNacimiento && !isNaN(new Date(socio.fechaNacimiento).getTime())
      ? Math.floor((Date.now() - new Date(socio.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 0;
    const tieneEdad = Boolean(
      socio.fechaNacimiento &&
      !isNaN(new Date(socio.fechaNacimiento).getTime()) &&
      edadCalculada >= 10 &&
      edadCalculada <= 120
    );
    if (!tieneEdad) {
      camposFaltantesEntrenamiento.push("Fecha de nacimiento / Edad válida (requerido para volumen e intensidad)");
      camposFaltantesAlimentacion.push("Fecha de nacimiento / Edad válida (requerido para requerimientos nutricionales)");
    }

    // Verificaciones de Perfil
    if (!perfil) {
      camposFaltantesEntrenamiento.push("Perfil de planificación activo (debe crearse una evaluación)");
      camposFaltantesAlimentacion.push("Perfil de planificación activo (debe crearse una evaluación)");

      return {
        success: true,
        data: {
          esValidoParaEntrenamiento: false,
          esValidoParaAlimentacion: false,
          puedeGenerar: false,
          camposFaltantesEntrenamiento,
          camposFaltantesAlimentacion,
          advertencias: ["No existe una evaluación o perfil de planificación activo para este socio."],
          detalles: {
            socio: { tieneEdad, tieneSexo },
            perfil: {
              existe: false,
              tieneObjetivo: false,
              tieneNivel: false,
              tieneDiasPorSemana: false,
              tieneDuracionMinutos: false,
              tienePreferenciaAlimenticia: false,
              tieneAlergiasDeclaradas: false,
              tieneAlimentosEvitados: false,
            },
            medidas: {
              tieneMedidas: Boolean(ultimaMedida),
              tienePeso: Boolean(ultimaMedida?.peso && ultimaMedida.peso > 0),
              tieneAltura: Boolean(ultimaMedida?.altura && ultimaMedida.altura > 0),
            },
          },
        },
      };
    }

    const tieneObjetivo = Boolean(perfil.objetivoPrincipal && perfil.objetivoPrincipal.trim().length > 0);
    if (!tieneObjetivo) {
      camposFaltantesEntrenamiento.push("Objetivo principal del entrenamiento");
    }

    const tieneNivel = Boolean(perfil.nivel && perfil.nivel.trim().length > 0);
    if (!tieneNivel) {
      camposFaltantesEntrenamiento.push("Nivel de experiencia / acondicionamiento");
    }

    const tieneDiasPorSemana = typeof perfil.diasPorSemana === "number" && perfil.diasPorSemana >= 1 && perfil.diasPorSemana <= 7;
    if (!tieneDiasPorSemana) {
      camposFaltantesEntrenamiento.push("Días disponibles por semana (1 a 7)");
    }

    const tieneDuracionMinutos = typeof perfil.duracionMinutos === "number" && perfil.duracionMinutos >= 15 && perfil.duracionMinutos <= 240;
    if (!tieneDuracionMinutos) {
      camposFaltantesEntrenamiento.push("Duración de la sesión en minutos (15 a 240)");
    }

    const tienePreferenciaAlimenticia = Boolean(perfil.preferenciaAlimenticia && perfil.preferenciaAlimenticia.trim().length > 0);
    if (!tienePreferenciaAlimenticia) {
      advertencias.push("Preferencia alimenticia no especificada (se asumirá dieta Omnívora por defecto).");
    }

    const tieneAlergiasDeclaradas = Boolean(perfil.alergiasDeclaradas && perfil.alergiasDeclaradas.trim().length > 0);
    if (!tieneAlergiasDeclaradas) {
      advertencias.push("No se han declarado alergias o intolerancias alimentarias.");
    }

    const tieneAlimentosEvitados = Boolean(perfil.alimentosEvitados && perfil.alimentosEvitados.trim().length > 0);

    // Verificaciones de Medidas
    const tienePeso = Boolean(ultimaMedida?.peso && ultimaMedida.peso > 0);
    const tieneAltura = Boolean(ultimaMedida?.altura && ultimaMedida.altura > 0);

    if (!ultimaMedida || !tienePeso || !tieneAltura) {
      advertencias.push("No se cuenta con registro reciente de Peso y Talla (se utilizarán estimaciones estándar).");
    }

    const esValidoParaEntrenamiento = camposFaltantesEntrenamiento.length === 0;
    const esValidoParaAlimentacion = camposFaltantesAlimentacion.length === 0;
    const puedeGenerar = esValidoParaEntrenamiento && esValidoParaAlimentacion;

    return {
      success: true,
      data: {
        esValidoParaEntrenamiento,
        esValidoParaAlimentacion,
        puedeGenerar,
        camposFaltantesEntrenamiento,
        camposFaltantesAlimentacion,
        advertencias,
        detalles: {
          socio: {
            tieneEdad,
            tieneSexo,
          },
          perfil: {
            existe: true,
            tieneObjetivo,
            tieneNivel,
            tieneDiasPorSemana,
            tieneDuracionMinutos,
            tienePreferenciaAlimenticia,
            tieneAlergiasDeclaradas,
            tieneAlimentosEvitados,
          },
          medidas: {
            tieneMedidas: Boolean(ultimaMedida),
            tienePeso,
            tieneAltura,
          },
        },
      },
    };
  } catch (err: any) {
    console.error("Error al validar datos para generación IA:", err);
    return { success: false, error: err.message || "Error al validar los requisitos del plan." };
  }
}
