import { getLimaStartOfDay, formatLimaDate } from "./date-utils";

export const DIAS_SEMANA_VALIDOS = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
] as const;

export type DiaSemana = typeof DIAS_SEMANA_VALIDOS[number];

export const ESTADOS_BLOQUEANTES = ["PROGRAMADA"] as const;

export const ESTADOS_LIBERADOS = [
  "CANCELADA_CLIENTE",
  "CANCELADA_ENTRENADOR",
  "CANCELADA_GIMNASIO",
  "REPROGRAMADA",
  "NO_ASISTIO",
  "COMPLETADA",
] as const;

/**
 * Función centralizada que determina si un estado de sesión bloquea disponibilidad horaria.
 * Únicamente 'PROGRAMADA' bloquea nuevos agendamientos.
 * Cancelaciones, reprogramaciones de origen, inasistencias y sesiones completadas (históricas) NO bloquean.
 */
export function isSessionBlockingAvailability(estado: string): boolean {
  return estado === "PROGRAMADA";
}

const PERU_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5

/**
 * Convierte string "YYYY-MM-DD" y "HH:mm" a Date UTC exacto para la zona horaria de Lima.
 */
export function createLimaDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, h, min, 0, 0) + PERU_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Formatea un Date a string "HH:mm" en la hora de Lima.
 */
export function formatLimaTime(date: Date): string {
  const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
  const h = String(limaDate.getUTCHours()).padStart(2, "0");
  const m = String(limaDate.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Retorna el nombre del día en mayúsculas ("LUNES", "MARTES", etc.) en zona horaria Lima.
 */
export function getLimaDayOfWeek(date: Date): DiaSemana {
  const limaDate = new Date(date.getTime() - PERU_OFFSET_MS);
  const days: DiaSemana[] = [
    "DOMINGO",
    "LUNES",
    "MARTES",
    "MIERCOLES",
    "JUEVES",
    "VIERNES",
    "SABADO",
  ];
  return days[limaDate.getUTCDay()];
}

export interface SesionTentativa {
  fecha: Date; // Timestamp medianoche Lima
  fechaStr: string; // "YYYY-MM-DD"
  diaSemana: DiaSemana;
  horaInicio: string; // "08:00"
  horaFin: string; // "09:00"
  fechaHoraInicio: Date; // Timestamp UTC exacto
  fechaHoraFin: Date; // Timestamp UTC exacto
  duracionMinutos: number;
  socioId: string;
  entrenadorId: string;
}

export interface GenerateSessionsParams {
  fechaInicio: string | Date; // "YYYY-MM-DD" o Date
  fechaFin: string | Date; // "YYYY-MM-DD" o Date
  frecuenciaAcordada: number;
  diasAcordados: string[];
  horaInicio: string; // "08:00"
  duracionMinutos: number;
  socioId: string;
  entrenadorId: string;
}

/**
 * Genera en memoria la colección de sesiones tentativas que corresponden al periodo
 * según los días y horarios acordados. Función PURA, no accede a base de datos.
 */
export function generatePersonalizedSessions(
  params: GenerateSessionsParams
): SesionTentativa[] {
  const {
    fechaInicio,
    fechaFin,
    diasAcordados,
    horaInicio,
    duracionMinutos,
    socioId,
    entrenadorId,
  } = params;

  if (duracionMinutos <= 0) {
    throw new Error("La duración de la sesión debe ser mayor a 0 minutos.");
  }

  const fechaInicioStr =
    typeof fechaInicio === "string"
      ? fechaInicio.substring(0, 10)
      : formatLimaDate(fechaInicio);
  const fechaFinStr =
    typeof fechaFin === "string"
      ? fechaFin.substring(0, 10)
      : formatLimaDate(fechaFin);

  const startDay = getLimaStartOfDay(createLimaDateTime(fechaInicioStr, "00:00"));
  const endDay = getLimaStartOfDay(createLimaDateTime(fechaFinStr, "00:00"));

  if (startDay > endDay) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin.");
  }

  const diasNormalizados = diasAcordados.map((d) => d.toUpperCase().trim());
  const sesiones: SesionTentativa[] = [];

  let current = new Date(startDay.getTime());

  while (current <= endDay) {
    const diaActual = getLimaDayOfWeek(current);

    if (diasNormalizados.includes(diaActual)) {
      const fechaStr = formatLimaDate(current);
      const fechaHoraInicio = createLimaDateTime(fechaStr, horaInicio);
      const fechaHoraFin = new Date(
        fechaHoraInicio.getTime() + duracionMinutos * 60 * 1000
      );

      // Verificación de cruce de medianoche en Lima
      const fechaFinCalculadaStr = formatLimaDate(fechaHoraFin);
      if (fechaFinCalculadaStr !== fechaStr) {
        throw new Error(
          `La sesión iniciada a las ${horaInicio} con duración de ${duracionMinutos} min cruza la medianoche (termina a las ${formatLimaTime(
            fechaHoraFin
          )} del día siguiente). Las sesiones deben concluir dentro de la misma jornada.`
        );
      }

      const horaFin = formatLimaTime(fechaHoraFin);
      const fechaMedianoche = getLimaStartOfDay(fechaHoraInicio);

      sesiones.push({
        fecha: fechaMedianoche,
        fechaStr,
        diaSemana: diaActual,
        horaInicio,
        horaFin,
        fechaHoraInicio,
        fechaHoraFin,
        duracionMinutos,
        socioId,
        entrenadorId,
      });
    }

    // Avanzar 1 día (24 horas)
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return sesiones;
}

export interface ConflictoSesion {
  tipo: "ENTRENADOR_OCUPADO" | "SOCIO_OCUPADO" | "CONFLICTO_INTERNO_LOTE";
  sesionTentativa: {
    fechaStr: string;
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
  };
  sesionExistente: {
    id: string;
    fechaHoraInicio: Date;
    fechaHoraFin: Date;
    horaInicio: string;
    horaFin: string;
    estado: string;
    socioNombre?: string;
    entrenadorNombre?: string;
  };
  descripcion: string;
}

export interface SesionExistenteEvaluada {
  id: string;
  socioId: string;
  entrenadorId: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  horaInicio: string;
  horaFin: string;
  estado: string;
  socio?: { nombres: string | null; apellidos: string | null; codigo: string };
  entrenador?: { nombres: string | null; apellidos: string | null; codigo: string };
}

/**
 * Evalúa colisiones de horario aplicando la regla estricta:
 * InicioA < FinB AND FinA > InicioB
 * - Detecta conflictos contra sesiones existentes en DB (filtradas por isSessionBlockingAvailability).
 * - Detecta colisiones internas entre las propias sesiones tentativas del lote.
 */
export function detectSessionConflicts(
  sesionesTentativas: SesionTentativa[],
  sesionesExistentes: SesionExistenteEvaluada[]
): ConflictoSesion[] {
  const conflictos: ConflictoSesion[] = [];

  // 1. Detección de colisiones internas entre las propias sesiones tentativas del lote
  for (let i = 0; i < sesionesTentativas.length; i++) {
    for (let j = i + 1; j < sesionesTentativas.length; j++) {
      const t1 = sesionesTentativas[i];
      const t2 = sesionesTentativas[j];

      const seSolapanInternamente =
        t1.fechaHoraInicio < t2.fechaHoraFin &&
        t1.fechaHoraFin > t2.fechaHoraInicio;

      if (seSolapanInternamente) {
        if (t1.entrenadorId === t2.entrenadorId) {
          conflictos.push({
            tipo: "CONFLICTO_INTERNO_LOTE",
            sesionTentativa: {
              fechaStr: t1.fechaStr,
              diaSemana: t1.diaSemana,
              horaInicio: t1.horaInicio,
              horaFin: t1.horaFin,
            },
            sesionExistente: {
              id: `tentativa-${j}`,
              fechaHoraInicio: t2.fechaHoraInicio,
              fechaHoraFin: t2.fechaHoraFin,
              horaInicio: t2.horaInicio,
              horaFin: t2.horaFin,
              estado: "TENTATIVA_DUPLICADA",
            },
            descripcion: `Colisión interna en el lote de generación para el entrenador el ${t1.fechaStr} entre ${t1.horaInicio}-${t1.horaFin} y ${t2.horaInicio}-${t2.horaFin}.`,
          });
        }
      }
    }
  }

  // 2. Detección contra sesiones existentes en base de datos
  const sesionesBloqueantes = sesionesExistentes.filter((s) =>
    isSessionBlockingAvailability(s.estado)
  );

  for (const tent of sesionesTentativas) {
    for (const exist of sesionesBloqueantes) {
      // Regla estricta de solapamiento de intervalos
      const seSolapan =
        tent.fechaHoraInicio < exist.fechaHoraFin &&
        tent.fechaHoraFin > exist.fechaHoraInicio;

      if (seSolapan) {
        if (tent.entrenadorId === exist.entrenadorId) {
          const nombreSocioOcupante = exist.socio
            ? `${exist.socio.nombres || ""} ${exist.socio.apellidos || ""}`.trim() || exist.socio.codigo
            : "otro socio";

          conflictos.push({
            tipo: "ENTRENADOR_OCUPADO",
            sesionTentativa: {
              fechaStr: tent.fechaStr,
              diaSemana: tent.diaSemana,
              horaInicio: tent.horaInicio,
              horaFin: tent.horaFin,
            },
            sesionExistente: {
              id: exist.id,
              fechaHoraInicio: exist.fechaHoraInicio,
              fechaHoraFin: exist.fechaHoraFin,
              horaInicio: exist.horaInicio,
              horaFin: exist.horaFin,
              estado: exist.estado,
              socioNombre: nombreSocioOcupante,
            },
            descripcion: `El entrenador ya tiene la sesión ${exist.id.substring(0, 8)} asignada con ${nombreSocioOcupante} el ${tent.fechaStr} de ${exist.horaInicio} a ${exist.horaFin}.`,
          });
        }

        if (tent.socioId === exist.socioId) {
          conflictos.push({
            tipo: "SOCIO_OCUPADO",
            sesionTentativa: {
              fechaStr: tent.fechaStr,
              diaSemana: tent.diaSemana,
              horaInicio: tent.horaInicio,
              horaFin: tent.horaFin,
            },
            sesionExistente: {
              id: exist.id,
              fechaHoraInicio: exist.fechaHoraInicio,
              fechaHoraFin: exist.fechaHoraFin,
              horaInicio: exist.horaInicio,
              horaFin: exist.horaFin,
              estado: exist.estado,
            },
            descripcion: `El socio ya cuenta con otra sesión programada el ${tent.fechaStr} de ${exist.horaInicio} a ${exist.horaFin}.`,
          });
        }
      }
    }
  }

  return conflictos;
}
