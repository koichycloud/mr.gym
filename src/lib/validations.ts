import { z } from "zod"

export const socioSchema = z.object({
    codigo: z.string().min(1, "El código es requerido").max(10, "Código muy largo"),
    nombres: z.string().optional(),
    apellidos: z.string().optional(),
    tipoDocumento: z.enum(["DNI", "CE", "PASAPORTE"]).default("DNI"),
    numeroDocumento: z.string().min(5, "Documento inválido").max(20, "Documento muy largo"),
    fechaNacimiento: z.coerce.date(),
    sexo: z.enum(["M", "F"]),
    telefono: z.string().optional(),
    fotoUrl: z.string().optional().nullable(),
    suscripcion: z.object({
        meses: z.number().int().min(0).default(0),
        planId: z.string().uuid().optional(),
        monto: z.number().optional(),
        fechaInicio: z.coerce.date().default(() => new Date()),
        metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "YAPE", "PLIN"]).default("EFECTIVO"),
        montoEfectivo: z.number().optional(),
        montoTransferencia: z.number().optional(),
        montoYape: z.number().optional(),
        montoPlin: z.number().optional()
    }).optional()
})

export const suscripcionSchema = z.object({
    socioId: z.string().uuid(),
    planId: z.string().uuid().optional(),
    meses: z.number().int().positive("Los meses deben ser mayor a 0"),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    nuevoCodigo: z.string().optional()
})

export const medidaSchema = z.object({
    socioId: z.string().uuid(),
    fecha: z.coerce.date(),
    peso: z.number().optional(),
    altura: z.number().optional(),
    porcentajeGrasa: z.number().optional(),
    porcentajeMusculo: z.number().optional(),
    // Add other fields as needed, keeping it flexible
    cuello: z.number().optional(),
    hombros: z.number().optional(),
    pecho: z.number().optional(),
    cintura: z.number().optional(),
    vientreBajo: z.number().optional(),
    cadera: z.number().optional(),
    gluteos: z.number().optional(),
    biceps: z.number().optional(),
    antebrazos: z.number().optional(),
    muslos: z.number().optional(),
    cuadriceps: z.number().optional(),
    pantorrillas: z.number().optional()
})

export const userSchema = z.object({
    username: z.string().min(3, "Usuario muy corto").max(20, "Usuario muy largo"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional().or(z.literal('')),
    role: z.enum(["ADMIN", "RECEPCION", "ENTRENADOR"]).default("RECEPCION"),
    permissions: z.array(z.string()).optional()
})

export const pagoSchema = z.object({
    socioId: z.string().optional(),
    suscripcionId: z.string().optional(),
    monto: z.number().positive("El monto debe ser mayor a 0"),
    metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "YAPE", "PLIN"]),
    concepto: z.enum(["SUSCRIPCION", "PRODUCTO", "OTRO"]),
    descripcion: z.string().optional(),
})

// --- PLANIFICACIÓN PERSONALIZADA: ASIGNACIÓN ENTRENADOR ---

export const asignarEntrenadorSchema = z.object({
    socioId: z.string().min(1, "El ID del socio es requerido"),
    entrenadorId: z.string().min(1, "El ID del entrenador es requerido"),
    fechaInicio: z.coerce.date().default(() => new Date()),
    mesesPlan: z.number().int("mesesPlan debe ser un número entero").positive("mesesPlan debe ser mayor que cero"),
})

export const finalizarAsignacionSchema = z.object({
    asignacionId: z.string().min(1, "El ID de la asignación es requerido"),
    fechaFin: z.coerce.date().default(() => new Date()),
})

export const cambiarEntrenadorSchema = z.object({
    socioId: z.string().min(1, "El ID del socio es requerido"),
    nuevoEntrenadorId: z.string().min(1, "El ID del nuevo entrenador es requerido"),
    fechaInicio: z.coerce.date().default(() => new Date()),
    mesesPlan: z.number().int("mesesPlan debe ser un número entero").positive("mesesPlan debe ser mayor que cero"),
})

// --- PLANIFICACIÓN PERSONALIZADA: PERFIL DE PLANIFICACIÓN ---

export const OBJETIVOS_PLANIFICACION = [
    "HIPERTROFIA",
    "PERDIDA_GRASA",
    "RECOMPOSICION",
    "FUERZA",
    "RESISTENCIA",
    "ACONDICIONAMIENTO",
    "MANTENIMIENTO",
    "OTRO"
] as const

export const NIVELES_PLANIFICACION = [
    "PRINCIPIANTE",
    "INTERMEDIO",
    "AVANZADO"
] as const

export const DIAS_SEMANA_VALIDOS = [
    "LUNES",
    "MARTES",
    "MIERCOLES",
    "JUEVES",
    "VIERNES",
    "SABADO",
    "DOMINGO"
] as const

export const createPlanningProfileSchema = z.object({
    socioId: z.string().min(1, "El ID del socio es requerido"),
    entrenadorId: z.string().min(1, "El ID del entrenador es requerido"),
    asignacionId: z.string().optional().nullable(),
    fechaInicio: z.coerce.date().default(() => new Date()),
    objetivoPrincipal: z.enum(OBJETIVOS_PLANIFICACION),
    objetivoSecundario: z.string().max(250, "Objetivo secundario muy largo").optional().nullable(),
    nivel: z.enum(NIVELES_PLANIFICACION),
    tiempoEntrenando: z.string().max(100).optional().nullable(),
    experienciaPrevia: z.string().max(500).optional().nullable(),
    capacidadCardiovascular: z.string().max(100).optional().nullable(),
    capacidadFuerza: z.string().max(100).optional().nullable(),
    equipamientoDisponible: z.string().max(200).optional().nullable(),
    diasPorSemana: z.number().int("diasPorSemana debe ser un número entero").min(1, "Mínimo 1 día").max(7, "Máximo 7 días").default(3),
    diasPreferidos: z.array(z.enum(DIAS_SEMANA_VALIDOS)).optional().nullable().refine(
        (days) => !days || new Set(days).size === days.length,
        "No se permiten días repetidos en días preferidos"
    ),
    duracionMinutos: z.number().int("duracionMinutos debe ser un número entero").min(15, "Mínimo 15 minutos").max(240, "Máximo 240 minutos").default(60),
    horarioPreferido: z.string().max(100).optional().nullable(),
    tipoEntrenamiento: z.string().max(200).optional().nullable(),
    ejerciciosEvitados: z.string().max(500).optional().nullable(),
    lesionesReportadas: z.string().max(500).optional().nullable(),
    preferenciaAlimenticia: z.string().max(100).optional().nullable(),
    alergiasDeclaradas: z.string().max(500).optional().nullable(),
    alimentosEvitados: z.string().max(500).optional().nullable(),
    numeroComidasDia: z.number().int().min(1, "Mínimo 1 comida al día").max(10, "Máximo 10 comidas al día").optional().nullable(),
    consumoAguaLitros: z.number().min(0, "Consumo de agua no puede ser negativo").max(20, "Consumo de agua fuera de rango").optional().nullable(),
    observaciones: z.string().max(1000).optional().nullable(),
    motivoVersionado: z.string().max(250).optional().nullable(),
})

export const createPlanningProfileVersionSchema = createPlanningProfileSchema.extend({
    motivoVersionado: z.string().min(1, "Debe especificar el motivo del versionado").max(250),
})

export const updatePlanningProfileSchema = z.object({
    id: z.string().min(1, "El ID del perfil es requerido"),
    objetivoPrincipal: z.enum(OBJETIVOS_PLANIFICACION).optional(),
    objetivoSecundario: z.string().max(250).optional().nullable(),
    nivel: z.enum(NIVELES_PLANIFICACION).optional(),
    tiempoEntrenando: z.string().max(100).optional().nullable(),
    experienciaPrevia: z.string().max(500).optional().nullable(),
    capacidadCardiovascular: z.string().max(100).optional().nullable(),
    capacidadFuerza: z.string().max(100).optional().nullable(),
    equipamientoDisponible: z.string().max(200).optional().nullable(),
    diasPorSemana: z.number().int().min(1).max(7).optional(),
    diasPreferidos: z.array(z.enum(DIAS_SEMANA_VALIDOS)).optional().nullable().refine(
        (days) => !days || new Set(days).size === days.length,
        "No se permiten días repetidos en días preferidos"
    ),
    duracionMinutos: z.number().int().min(15).max(240).optional(),
    horarioPreferido: z.string().max(100).optional().nullable(),
    tipoEntrenamiento: z.string().max(200).optional().nullable(),
    ejerciciosEvitados: z.string().max(500).optional().nullable(),
    lesionesReportadas: z.string().max(500).optional().nullable(),
    preferenciaAlimenticia: z.string().max(100).optional().nullable(),
    alergiasDeclaradas: z.string().max(500).optional().nullable(),
    alimentosEvitados: z.string().max(500).optional().nullable(),
    numeroComidasDia: z.number().int().min(1).max(10).optional().nullable(),
    consumoAguaLitros: z.number().min(0).max(20).optional().nullable(),
    observaciones: z.string().max(1000).optional().nullable(),
})

export const closePlanningProfileSchema = z.object({
    id: z.string().min(1, "El ID del perfil es requerido"),
    fechaFin: z.coerce.date().default(() => new Date()),
})

// --- MOTOR DE PLANIFICACIÓN IA: CONTRATOS Y ESQUEMAS ---

export const ESTADOS_GENERACION_IA = [
    "GENERADO",
    "EN_REVISION",
    "APROBADO",
    "RECHAZADO",
    "ARCHIVADO",
    "ERROR"
] as const

export const ESTADOS_PLAN_PERSONALIZADO = [
    "GENERADO",
    "EN_REVISION",
    "APROBADO",
    "MODIFICADO",
    "ARCHIVADO"
] as const

export const MOMENTOS_COMIDA_VALIDOS = [
    "DESAYUNO",
    "ALMUERZO",
    "CENA",
    "SNACK_PRE",
    "SNACK_POST",
    "SNACK_MEDIA_MANANA",
    "SNACK_MEDIA_TARDE"
] as const

// 1. INPUT DEL MOTOR IA
export const planningAIInputSchema = z.object({
    socio: z.object({
        id: z.string().min(1),
        codigo: z.string().min(1),
        edad: z.number().int().min(10).max(120),
        sexo: z.enum(["M", "F"]),
    }),
    medidasActuales: z.object({
        fecha: z.string(),
        pesoKg: z.number().positive(),
        tallaCm: z.number().positive(),
        porcentajeGrasa: z.number().min(0).max(100).optional().nullable(),
        porcentajeMusculo: z.number().min(0).max(100).optional().nullable(),
        imc: z.number().positive().optional().nullable(),
        perimetrosCm: z.record(z.string(), z.number().nullable().optional()).optional().nullable(),
    }).nullable().optional(),
    evolucionHistorica: z.object({
        medicionInicial: z.object({
            fecha: z.string(),
            pesoKg: z.number(),
            porcentajeGrasa: z.number().optional().nullable(),
        }).optional(),
        medicionPrevia: z.object({
            fecha: z.string(),
            pesoKg: z.number(),
            porcentajeGrasa: z.number().optional().nullable(),
        }).optional(),
        totalMedicionesRegistradas: z.number().int().min(0),
        tendenciaPeso: z.enum(["DESCENDENTE", "ASCENDENTE", "ESTABLE", "SIN_HISTORIAL"]),
    }).optional().nullable(),
    objetivos: z.object({
        principal: z.enum(OBJETIVOS_PLANIFICACION),
        secundario: z.string().max(250).optional().nullable(),
        nivel: z.enum(NIVELES_PLANIFICACION),
        tiempoEntrenando: z.string().max(100).optional().nullable(),
        experienciaPrevia: z.string().max(500).optional().nullable(),
    }),
    disponibilidad: z.object({
        diasPorSemana: z.number().int().min(1).max(7),
        diasPreferidos: z.array(z.enum(DIAS_SEMANA_VALIDOS)),
        duracionMinutosPorSesion: z.number().int().min(15).max(240),
        horarioPreferido: z.string().max(100).optional().nullable(),
    }),
    entrenamiento: z.object({
        tipoPreferido: z.string().max(200).optional().nullable(),
        ejerciciosExcluidos: z.string().max(500).optional().nullable(),
        lesionesDeclaradas: z.string().max(500).optional().nullable(),
        capacidadCardiovascular: z.string().max(100).optional().nullable(),
        capacidadFuerza: z.string().max(100).optional().nullable(),
        equipamientoDisponible: z.string().max(200).optional().nullable(),
    }),
    alimentacionDeclarada: z.object({
        preferencia: z.string().max(100),
        alergiasIntolerancias: z.string().max(500).optional().nullable(),
        alimentosEvitados: z.string().max(500).optional().nullable(),
        comidasPorDia: z.number().int().min(1).max(10).optional().nullable(),
        consumoAguaLitrosPorDia: z.number().min(0).max(20).optional().nullable(),
    }),
    criterioEntrenador: z.object({
        observaciones: z.string().max(1000).optional().nullable(),
        motivoVersion: z.string().max(250).optional().nullable(),
    }).optional().nullable(),
})

export type PlanningAIInput = z.infer<typeof planningAIInputSchema>

// 2. ESTRUCTURA JSON PLAN DE ENTRENAMIENTO (6 NIVELES)
export const ejercicioAISchema = z.object({
    nombre: z.string().min(1, "Nombre de ejercicio requerido"),
    grupoMuscular: z.string().min(1, "Grupo muscular requerido"),
    series: z.number().int().min(1, "Mínimo 1 serie").max(10, "Máximo 10 series"),
    repeticiones: z.string().min(1, "Repeticiones requeridas"),
    descansoSegundos: z.number().int().min(15, "Mínimo 15 segundos").max(600, "Máximo 600 segundos"),
    tempo: z.string().max(20).optional().nullable(),
    rpe: z.number().min(1).max(10).optional().nullable(),
    instrucciones: z.string().max(500).optional().nullable(),
})

export const sesionEntrenamientoAISchema = z.object({
    nombre: z.string().min(1, "Nombre de sesión requerido"),
    dia: z.string().max(50).optional().nullable(),
    calentamiento: z.string().min(1, "Calentamiento requerido"),
    ejercicios: z.array(ejercicioAISchema).min(1, "La sesión debe contener al menos 1 ejercicio"),
    vueltaALaCalma: z.string().max(500).optional().nullable(),
})

export const nivelEntrenamientoAISchema = z.object({
    numeroNivel: z.number().int().min(1).max(6),
    nombreNivel: z.string().min(1, "Nombre de nivel requerido"),
    objetivoEspecifico: z.string().min(1, "Objetivo específico requerido"),
    duracionSugeridaSemanas: z.number().int().min(1).max(12),
    criteriosDeProgreso: z.string().min(1, "Criterios de progreso requeridos"),
    criteriosDeRegresion: z.string().min(1, "Criterios de regresión requeridos"),
    sesiones: z.array(sesionEntrenamientoAISchema).min(1, "El nivel debe contener al menos 1 sesión"),
})

export const planEntrenamientoJSONSchema = z.object({
    titulo: z.string().min(1, "Título de plan requerido"),
    descripcionGeneral: z.string().min(1, "Descripción requerida"),
    splitSugerido: z.string().max(100).optional().nullable(),
    frecuenciaSemanal: z.number().int().min(1).max(7),
    niveles: z.array(nivelEntrenamientoAISchema).length(6, "El plan de entrenamiento debe contener exactamente 6 niveles"),
}).refine(
    (data) => {
        const niveles = data.niveles.map((n) => n.numeroNivel)
        const sorted = [...niveles].sort((a, b) => a - b)
        return JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5, 6])
    },
    { message: "Los 6 niveles deben ser exactamente 1, 2, 3, 4, 5 y 6 sin duplicados" }
)

export type PlanEntrenamientoJSON = z.infer<typeof planEntrenamientoJSONSchema>

// 3. ESTRUCTURA JSON PLAN ALIMENTARIO (20+ RECETAS)
export const recetaSugeridaAISchema = z.object({
    idReceta: z.string().min(1, "ID de receta requerido"),
    nombre: z.string().min(1, "Nombre de receta requerido"),
    momentoSugerido: z.enum(MOMENTOS_COMIDA_VALIDOS),
    tiempoPreparacionMinutos: z.number().int().min(1).max(180),
    ingredientes: z.array(z.string().min(1)).min(1, "Al menos 1 ingrediente"),
    instrucciones: z.array(z.string().min(1)).min(1, "Al menos 1 paso de preparación"),
    porciones: z.number().int().min(1).max(10).default(1),
    opcionesSustitucion: z.string().max(500).optional().nullable(),
    beneficioClave: z.string().max(300).optional().nullable(),
})

export const planAlimentacionJSONSchema = z.object({
    titulo: z.string().min(1, "Título de plan alimentario requerido"),
    descripcionGeneral: z.string().min(1, "Descripción requerida"),
    lineamientosGenerales: z.array(z.string().min(1)).min(1, "Al menos 1 lineamiento general"),
    recomendacionHidratacion: z.string().min(1, "Recomendación de hidratación requerida"),
    recetas: z.array(recetaSugeridaAISchema).min(20, "El plan alimentario debe contener un mínimo de 20 recetas"),
}).refine(
    (data) => {
        const ids = data.recetas.map((r) => r.idReceta)
        return new Set(ids).size === ids.length
    },
    { message: "Los IDs de recetas no deben contener duplicados" }
)

export type PlanAlimentacionJSON = z.infer<typeof planAlimentacionJSONSchema>

// 4. OUTPUT DEL MOTOR IA COMPLETO
export const planningAIOutputSchema = z.object({
    metadataGeneracion: z.object({
        versionSchema: z.literal("2.0"),
        timestamp: z.string(),
        resumenEstrategia: z.string().min(1),
        nivelInicialRecomendado: z.number().int().min(1).max(6),
        justificacionNivelInicial: z.string().min(1),
    }),
    planEntrenamiento: planEntrenamientoJSONSchema,
    planAlimentacion: planAlimentacionJSONSchema,
    evaluacionSeguridad: z.object({
        requiresHumanReview: z.boolean(),
        banderasAdvertencia: z.array(z.string()),
        observacionesMedicasDeclaradas: z.string(),
        alergiasDetectadasYMitigadas: z.array(z.string()),
    }),
})

export type PlanningAIOutput = z.infer<typeof planningAIOutputSchema>

// ============================================================================
// 5. BIBLIOTECA DE EJERCICIOS (FASE 6)
// ============================================================================

export const GRUPOS_MUSCULARES = [
    "PECHO",
    "ESPALDA",
    "PIERNAS",
    "HOMBROS",
    "BRAZOS",
    "CORE",
    "CUERPO_COMPLETO"
] as const

export const TIPOS_EJERCICIO = [
    "FUERZA",
    "CARDIO",
    "HIPERTROFIA",
    "MOVILIDAD"
] as const

export const EQUIPAMIENTO_EJERCICIO = [
    "GIMNASIO_COMPLETO",
    "MANCUERNAS_BANCOS",
    "PESO_CORPORAL",
    "BANDAS_RESISTENCIA",
    "OTRO"
] as const

export const createEjercicioSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre no puede exceder 100 caracteres"),
    descripcion: z.string().max(500, "La descripción no puede exceder 500 caracteres").optional().nullable(),
    instrucciones: z.string().max(1000, "Las instrucciones no pueden exceder 1000 caracteres").optional().nullable(),
    grupoMuscular: z.enum(GRUPOS_MUSCULARES),
    grupoMuscularSecundario: z.string().max(100).optional().nullable(),
    nivel: z.enum(NIVELES_PLANIFICACION),
    tipoEjercicio: z.enum(TIPOS_EJERCICIO),
    equipamientoRequerido: z.enum(EQUIPAMIENTO_EJERCICIO),
    restricciones: z.string().max(500, "Las restricciones no pueden exceder 500 caracteres").optional().nullable(),
    activo: z.boolean().optional().default(true),
})

export const updateEjercicioSchema = createEjercicioSchema.partial().extend({
    id: z.string().uuid("ID de ejercicio inválido"),
})

export const filterEjercicioSchema = z.object({
    query: z.string().optional(),
    grupoMuscular: z.enum(GRUPOS_MUSCULARES).optional(),
    nivel: z.enum(NIVELES_PLANIFICACION).optional(),
    equipamientoRequerido: z.enum(EQUIPAMIENTO_EJERCICIO).optional(),
    activo: z.boolean().optional(),
})

export type CreateEjercicioInput = z.infer<typeof createEjercicioSchema>
export type UpdateEjercicioInput = z.infer<typeof updateEjercicioSchema>
export type FilterEjercicioInput = z.infer<typeof filterEjercicioSchema>



