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
    // FASE 7: ejercicioId es OPCIONAL — referencia a la Biblioteca de Ejercicios (Fase 6).
    // Los planes históricos sin este campo continúan funcionando normalmente.
    ejercicioId: z.string().uuid("ID de ejercicio inválido").optional().nullable(),
    nombre: z.string().min(1, "Nombre de ejercicio requerido"),
    grupoMuscular: z.string().min(1, "Grupo muscular requerido"),
    series: z.number().int().min(1).max(10),
    repeticiones: z.string().min(1, "Repeticiones requeridas"),
    descansoSegundos: z.number().int().min(15).max(600),
    tempo: z.string().max(20).optional().nullable(),
    rpe: z.number().min(1).max(10).optional().nullable(),
    instrucciones: z.string().max(500).optional().nullable(),
    // FASE 7: observaciones adicionales por ejercicio (distintas de instrucciones técnicas)
    observaciones: z.string().max(500).optional().nullable(),
})

export const sesionEntrenamientoAISchema = z.object({
    nombre: z.string().min(1, "Nombre de sesión requerido"),
    dia: z.string().max(50).optional().nullable(),
    calentamiento: z.string().min(1, "Calentamiento requerido"),
    ejercicios: z.array(ejercicioAISchema).min(1, "La sesión debe contener al menos 1 ejercicio"),
    vueltaALaCalma: z.string().max(500).optional().nullable(),
    // FASE 7: campos de periodicidad — opcionales para compatibilidad histórica
    semana: z.number().int().min(1).max(52).optional().nullable(),
    orden: z.number().int().min(1).max(20).optional().nullable(),
    objetivo: z.string().max(200).optional().nullable(),
    duracionEstimadaMinutos: z.number().int().min(1).max(300).optional().nullable(),
    observaciones: z.string().max(500).optional().nullable(),
})

export const nivelEntrenamientoAISchema = z.object({
    numeroNivel: z.number().int().min(1).max(6),
    nombreNivel: z.string().min(1, "Nombre de nivel requerido"),
    objetivoEspecifico: z.string().min(1, "Objetivo específico requerido"),
    duracionSugeridaSemanas: z.number().int().min(1).max(12),
    criteriosDeProgreso: z.string().min(1, "Criterios de progreso requeridos"),
    criteriosDeRegresion: z.string().min(1, "Criterios de regresión requeridos"),
    sesiones: z.array(sesionEntrenamientoAISchema).min(1, "El nivel debe contener al menos 1 sesión"),
    ajustesProgresion: z.object({
        descripcionProgresion: z.string().max(500).optional().nullable(),
        cambioVolumen: z.string().max(200).optional().nullable(),
        cambioIntensidad: z.string().max(200).optional().nullable(),
        cambioDescanso: z.string().max(200).optional().nullable(),
        observacionesProgresion: z.string().max(500).optional().nullable(),
    }).optional().nullable(),
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

// 3. ESTRUCTURA JSON PLAN ALIMENTARIO (20+ RECETAS, INGREDIENTES DETALLADOS Y MACRONUTRIENTES)

export const ingredienteDetalleSchema = z.object({
    nombre: z.string().min(1, "Nombre de ingrediente requerido"),
    cantidad: z.number().positive("La cantidad debe ser positiva"),
    unidad: z.string().min(1, "Unidad requerida (ej. g, ml, unidad, cda, taza)"),
    notas: z.string().max(200).optional().nullable(),
})

export type IngredienteDetalle = z.infer<typeof ingredienteDetalleSchema>

export const macrosPorcionSchema = z.object({
    caloriasKcal: z.number().nonnegative("Calorías no pueden ser negativas"),
    proteinasG: z.number().nonnegative("Proteínas no pueden ser negativas"),
    carbohidratosG: z.number().nonnegative("Carbohidratos no pueden ser negativos"),
    grasasG: z.number().nonnegative("Grasas no pueden ser negativas"),
})

export type MacrosPorcion = z.infer<typeof macrosPorcionSchema>

export const porcionRecetaSchema = z.object({
    cantidad: z.number().int().min(1).default(1),
    unidad: z.string().default("porción"),
    descripcion: z.string().max(200).optional().nullable(),
})

export type PorcionReceta = z.infer<typeof porcionRecetaSchema>

export const objetivosNutricionalesDiariosSchema = z.object({
    caloriasObjetivoKcal: z.number().int().positive("Calorías objetivo deben ser positivas"),
    proteinasObjetivoG: z.number().int().positive("Proteínas objetivo deben ser positivas"),
    carbohidratosObjetivoG: z.number().int().positive("Carbohidratos objetivo deben ser positivos"),
    grasasObjetivoG: z.number().int().positive("Grasas objetivo deben ser positivas"),
    distribucionCaloricaPorcentaje: z.object({
        proteinas: z.number().min(0).max(100).optional().nullable(),
        carbohidratos: z.number().min(0).max(100).optional().nullable(),
        grasas: z.number().min(0).max(100).optional().nullable(),
    }).optional().nullable(),
    resumenEstrategiaNutricional: z.string().max(500).optional().nullable(),
})

export type ObjetivosNutricionalesDiarios = z.infer<typeof objetivosNutricionalesDiariosSchema>

/**
 * Valida la coherencia aproximada entre los macronutrientes declarados y las calorías (P*4 + C*4 + G*9 ~ kcal)
 * con una tolerancia razonable de redondeo (±20%).
 */
export function validarCoherenciaMacros(macros: MacrosPorcion, toleranciaPorcentaje = 0.20): boolean {
    const { caloriasKcal, proteinasG, carbohidratosG, grasasG } = macros;
    if (caloriasKcal <= 0) return false;
    const caloriasCalculadas = (proteinasG * 4) + (carbohidratosG * 4) + (grasasG * 9);
    const diferencia = Math.abs(caloriasKcal - caloriasCalculadas);
    const margenPermitido = Math.max(25, caloriasKcal * toleranciaPorcentaje);
    return diferencia <= margenPermitido;
}

export const recetaSugeridaAISchema = z.object({
    idReceta: z.string().min(1, "ID de receta requerido"),
    nombre: z.string().min(1, "Nombre de receta requerido"),
    momentoSugerido: z.enum(MOMENTOS_COMIDA_VALIDOS),
    tiempoPreparacionMinutos: z.number().int().min(1).max(180),
    porcion: porcionRecetaSchema.optional().nullable(),
    ingredientesDetalle: z.array(ingredienteDetalleSchema).optional().nullable(),
    macrosPorcion: macrosPorcionSchema.optional().nullable(),
    ingredientes: z.array(z.string().min(1)).optional().nullable(),
    instrucciones: z.array(z.string().min(1)).min(1, "Al menos 1 paso de preparación"),
    porciones: z.number().int().min(1).max(10).default(1),
    opcionesSustitucion: z.string().max(500).optional().nullable(),
    beneficioClave: z.string().max(300).optional().nullable(),
}).refine(
    (data) => {
        const tieneDetalle = Array.isArray(data.ingredientesDetalle) && data.ingredientesDetalle.length > 0;
        const tieneHistorico = Array.isArray(data.ingredientes) && data.ingredientes.length > 0;
        return tieneDetalle || tieneHistorico;
    },
    { message: "La receta debe contener al menos un ingrediente (ingredientesDetalle o ingredientes)" }
)

export const planAlimentacionJSONSchema = z.object({
    titulo: z.string().min(1, "Título de plan alimentario requerido"),
    descripcionGeneral: z.string().min(1, "Descripción requerida"),
    lineamientosGenerales: z.array(z.string().min(1)).min(1, "Al menos 1 lineamiento general"),
    recomendacionHidratacion: z.string().min(1, "Recomendación de hidratación requerida"),
    objetivosNutricionalesDiarios: objetivosNutricionalesDiariosSchema.optional().nullable(),
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

// ============================================================================
// MÓDULO: ENTRENAMIENTO PERSONALIZADO Y HORARIOS (FASE H2)
// ============================================================================

export const DIAS_SEMANA_ENUM = [
    "LUNES",
    "MARTES",
    "MIERCOLES",
    "JUEVES",
    "VIERNES",
    "SABADO",
    "DOMINGO",
] as const

export const ESTADOS_PERIODO_PERSONALIZADO = [
    "ACTIVO",
    "FINALIZADO",
    "PAUSADO",
    "CANCELADO",
] as const

export const ESTADOS_SESION_PERSONALIZADA = [
    "PROGRAMADA",
    "COMPLETADA",
    "CANCELADA_CLIENTE",
    "CANCELADA_ENTRENADOR",
    "CANCELADA_GIMNASIO",
    "NO_ASISTIO",
    "REPROGRAMADA",
] as const

const basePeriodoSchema = z.object({
    socioId: z.string().min(1, "El ID del socio es requerido"),
    entrenadorId: z.string().min(1, "El ID del entrenador es requerido"),
    fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de inicio inválido (YYYY-MM-DD)"),
    fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de fin inválido (YYYY-MM-DD)"),
    frecuenciaRecomendada: z.number().int().min(1, "La frecuencia recomendada mínima es 1").max(7, "La frecuencia máxima es 7"),
    frecuenciaAcordada: z.number().int().min(1, "La frecuencia acordada mínima es 1").max(7, "La frecuencia máxima es 7"),
    diasAcordados: z.array(z.enum(DIAS_SEMANA_ENUM)).min(1, "Debe seleccionar al menos un día de la semana"),
    horaInicioAcordada: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:mm)"),
    duracionMinutos: z.number().int().min(15, "La duración mínima es 15 minutos").max(240, "La duración máxima es 240 minutos").default(60),
})

const validarPeriodoReglas = (data: z.infer<typeof basePeriodoSchema>, ctx: z.RefinementCtx) => {
    if (data.fechaInicio > data.fechaFin) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La fecha de inicio no puede ser posterior a la fecha de fin.",
            path: ["fechaFin"],
        })
    }
    if (data.frecuenciaAcordada !== data.diasAcordados.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La cantidad de días seleccionados (${data.diasAcordados.length}) debe coincidir exactamente con la frecuencia acordada (${data.frecuenciaAcordada} días/sem).`,
            path: ["diasAcordados"],
        })
    }
}

export const previewPeriodoPersonalizadoSchema = basePeriodoSchema.superRefine(validarPeriodoReglas)

export const crearPeriodoPersonalizadoSchema = basePeriodoSchema.extend({
    asignacionId: z.string().optional().nullable(),
    perfilPlanificacionId: z.string().optional().nullable(),
    mesesPeriodo: z.number().int().min(1, "El periodo mínimo es de 1 mes").max(24, "El periodo máximo es de 24 meses").default(1),
    objetivoAcordado: z.string().max(300, "El objetivo no puede exceder 300 caracteres").optional().nullable(),
    observaciones: z.string().max(1000, "Las observaciones no pueden exceder 1000 caracteres").optional().nullable(),
}).superRefine(validarPeriodoReglas)

export type PreviewPeriodoPersonalizadoInput = z.infer<typeof previewPeriodoPersonalizadoSchema>
export type CrearPeriodoPersonalizadoInput = z.infer<typeof crearPeriodoPersonalizadoSchema>

// ============================================================================
// MÓDULO: REPROGRAMACIÓN Y CANCELACIÓN DE SESIONES PERSONALIZADAS (FASE H4)
// ============================================================================

export const TIPOS_CANCELACION_SESION = [
    "CANCELADA_CLIENTE",
    "CANCELADA_ENTRENADOR",
    "CANCELADA_GIMNASIO",
] as const

export const reprogramarSesionPersonalizadaSchema = z.object({
    sesionId: z.string().min(1, "El ID de la sesión es requerido"),
    nuevaFecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
    nuevaHoraInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:mm)"),
    duracionMinutos: z.number().int().min(15, "La duración mínima es 15 minutos").max(240, "La duración máxima es 240 minutos").optional(),
    nuevoEntrenadorId: z.string().optional().nullable(),
    motivoReprogramacion: z.string().min(3, "El motivo debe tener al menos 3 caracteres").max(500, "El motivo no puede exceder 500 caracteres"),
})

export const cancelarSesionPersonalizadaSchema = z.object({
    sesionId: z.string().min(1, "El ID de la sesión es requerido"),
    tipoCancelacion: z.enum(TIPOS_CANCELACION_SESION, {
        message: "Tipo de cancelación inválido. Debe ser CANCELADA_CLIENTE, CANCELADA_ENTRENADOR o CANCELADA_GIMNASIO.",
    }),
    motivoCancelacion: z.string().min(3, "El motivo debe tener al menos 3 caracteres").max(500, "El motivo no puede exceder 500 caracteres"),
})

export type ReprogramarSesionPersonalizadaInput = z.infer<typeof reprogramarSesionPersonalizadaSchema>
export type CancelarSesionPersonalizadaInput = z.infer<typeof cancelarSesionPersonalizadaSchema>

// ============================================================================
// MÓDULO: GESTIÓN OPERATIVA DEL PERIODO PERSONALIZADO (FASE H6)
// ============================================================================

export const ESTADOS_PERIODO_ENUM = [
    "ACTIVO",
    "PAUSADO",
    "FINALIZADO",
    "CANCELADO",
] as const

export const cambiarEstadoPeriodoSchema = z.object({
    periodoId: z.string().min(1, "El ID del periodo es requerido"),
    nuevoEstado: z.enum(ESTADOS_PERIODO_ENUM, {
        message: "Estado inválido. Debe ser ACTIVO, PAUSADO, FINALIZADO o CANCELADO.",
    }),
    motivo: z.string().max(500, "El motivo no puede exceder 500 caracteres").optional().nullable(),
})

export const actualizarAcuerdoPeriodoSchema = z.object({
    periodoId: z.string().min(1, "El ID del periodo es requerido"),
    frecuenciaRecomendada: z.number().int().min(1).max(7).optional(),
    frecuenciaAcordada: z.number().int().min(1, "La frecuencia acordada mínima es 1").max(7, "La frecuencia máxima es 7"),
    diasAcordados: z.array(z.enum(DIAS_SEMANA_ENUM)).min(1, "Debe seleccionar al menos un día de la semana"),
    horaInicioAcordada: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:mm)"),
    duracionMinutos: z.number().int().min(15, "La duración mínima es 15 minutos").max(240, "La duración máxima es 240 minutos").default(60),
    objetivoAcordado: z.string().max(300, "El objetivo no puede exceder 300 caracteres").optional().nullable(),
    observaciones: z.string().max(1000, "Las observaciones no pueden exceder 1000 caracteres").optional().nullable(),
    motivoCambio: z.string().min(3, "El motivo del cambio debe tener al menos 3 caracteres").max(500, "El motivo no puede exceder 500 caracteres"),
}).superRefine((data, ctx) => {
    if (data.frecuenciaAcordada !== data.diasAcordados.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `La cantidad de días seleccionados (${data.diasAcordados.length}) debe coincidir exactamente con la frecuencia acordada (${data.frecuenciaAcordada} días/sem).`,
            path: ["diasAcordados"],
        })
    }
})

export type CambiarEstadoPeriodoInput = z.infer<typeof cambiarEstadoPeriodoSchema>
export type ActualizarAcuerdoPeriodoInput = z.infer<typeof actualizarAcuerdoPeriodoSchema>

