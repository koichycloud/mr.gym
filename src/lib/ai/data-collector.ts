import prisma from "../prisma";

export interface RawPlanningData {
  socio: {
    id: string;
    codigo: string;
    fechaNacimiento: Date;
    sexo: string;
  };
  perfil: {
    id: string;
    version: number;
    activo: boolean;
    entrenadorId: string;
    asignacionId: string | null;
    objetivoPrincipal: string;
    objetivoSecundario: string | null;
    nivel: string;
    tiempoEntrenando: string | null;
    experienciaPrevia: string | null;
    capacidadCardiovascular: string | null;
    capacidadFuerza: string | null;
    equipamientoDisponible: string | null;
    diasPorSemana: number;
    diasPreferidos: string[] | null;
    duracionMinutos: number;
    horarioPreferido: string | null;
    tipoEntrenamiento: string | null;
    ejerciciosEvitados: string | null;
    lesionesReportadas: string | null;
    preferenciaAlimenticia: string | null;
    alergiasDeclaradas: string | null;
    alimentosEvitados: string | null;
    numeroComidasDia: number | null;
    consumoAguaLitros: number | null;
    observaciones: string | null;
    motivoVersionado: string | null;
  };
  entrenador?: {
    id: string;
    rol: string;
  } | null;
  medidaActual?: {
    fecha: Date;
    peso: number | null;
    altura: number | null;
    porcentajeGrasa: number | null;
    porcentajeMusculo: number | null;
    pecho?: number | null;
    cintura?: number | null;
    vientreBajo?: number | null;
    gluteos?: number | null;
    cuello?: number | null;
    hombros?: number | null;
    biceps?: number | null;
    antebrazos?: number | null;
    cuadriceps?: number | null;
    pantorrillas?: number | null;
  } | null;
  historialMedidas: Array<{
    fecha: Date;
    peso: number | null;
    porcentajeGrasa: number | null;
    porcentajeMusculo: number | null;
  }>;
}

/**
 * Recopila exclusivamente la información requerida para el motor de planificación IA
 * desde la base de datos, omitiendo intencionalmente datos administrativos y sensibles.
 */
export async function collectPlanningData(socioId: string): Promise<RawPlanningData> {
  // 1. Obtener socio con campos mínimos autorizados
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
    throw new Error(`Socio con ID ${socioId} no encontrado.`);
  }

  // 2. Obtener Perfil de Planificación activo vigente
  const perfil = await prisma.perfilPlanificacion.findFirst({
    where: {
      socioId,
      activo: true,
    },
    include: {
      entrenador: {
        select: {
          id: true,
          rol: true,
        },
      },
    },
  });

  if (!perfil) {
    throw new Error(`El socio ${socio.codigo} no cuenta con un Perfil de Planificación activo.`);
  }

  // 3. Obtener medidas físicas (actual y evolutiva)
  const medidas = await prisma.medidaFisica.findMany({
    where: { socioId },
    orderBy: { fecha: "desc" },
    take: 10,
    select: {
      fecha: true,
      peso: true,
      altura: true,
      porcentajeGrasa: true,
      porcentajeMusculo: true,
      pecho: true,
      cintura: true,
      vientreBajo: true,
      gluteos: true,
      cuello: true,
      hombros: true,
      biceps: true,
      antebrazos: true,
      cuadriceps: true,
      pantorrillas: true,
    },
  });

  const medidaActual = medidas.length > 0 ? medidas[0] : null;
  const historialMedidas = medidas.map((m) => ({
    fecha: m.fecha,
    peso: m.peso,
    porcentajeGrasa: m.porcentajeGrasa,
    porcentajeMusculo: m.porcentajeMusculo,
  }));

  // Parsear diasPreferidos de JSON si viene como array
  let parsedDiasPreferidos: string[] | null = null;
  if (Array.isArray(perfil.diasPreferidos)) {
    parsedDiasPreferidos = perfil.diasPreferidos as string[];
  }

  return {
    socio: {
      id: socio.id,
      codigo: socio.codigo,
      fechaNacimiento: socio.fechaNacimiento,
      sexo: socio.sexo,
    },
    perfil: {
      id: perfil.id,
      version: perfil.version,
      activo: perfil.activo,
      entrenadorId: perfil.entrenadorId,
      asignacionId: perfil.asignacionId,
      objetivoPrincipal: perfil.objetivoPrincipal,
      objetivoSecundario: perfil.objetivoSecundario,
      nivel: perfil.nivel,
      tiempoEntrenando: perfil.tiempoEntrenando,
      experienciaPrevia: perfil.experienciaPrevia,
      capacidadCardiovascular: perfil.capacidadCardiovascular,
      capacidadFuerza: perfil.capacidadFuerza,
      equipamientoDisponible: perfil.equipamientoDisponible,
      diasPorSemana: perfil.diasPorSemana,
      diasPreferidos: parsedDiasPreferidos,
      duracionMinutos: perfil.duracionMinutos,
      horarioPreferido: perfil.horarioPreferido,
      tipoEntrenamiento: perfil.tipoEntrenamiento,
      ejerciciosEvitados: perfil.ejerciciosEvitados,
      lesionesReportadas: perfil.lesionesReportadas,
      preferenciaAlimenticia: perfil.preferenciaAlimenticia,
      alergiasDeclaradas: perfil.alergiasDeclaradas,
      alimentosEvitados: perfil.alimentosEvitados,
      numeroComidasDia: perfil.numeroComidasDia,
      consumoAguaLitros: perfil.consumoAguaLitros,
      observaciones: perfil.observaciones,
      motivoVersionado: perfil.motivoVersionado,
    },
    entrenador: perfil.entrenador
      ? {
          id: perfil.entrenador.id,
          rol: perfil.entrenador.rol,
        }
      : null,
    medidaActual,
    historialMedidas,
  };
}
