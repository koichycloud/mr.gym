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
    suscripcion: z.object({
        meses: z.number().int().min(0).default(0),
        fechaInicio: z.coerce.date().default(() => new Date())
    }).optional()
})

export const suscripcionSchema = z.object({
    socioId: z.string().uuid(),
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
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    role: z.enum(["ADMIN", "RECEPCION"]).default("RECEPCION")
})

export const pagoSchema = z.object({
    socioId: z.string().optional(),
    suscripcionId: z.string().optional(),
    monto: z.number().positive("El monto debe ser mayor a 0"),
    metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "YAPE", "PLIN"]),
    concepto: z.enum(["SUSCRIPCION", "PRODUCTO", "OTRO"]),
    descripcion: z.string().optional(),
})
