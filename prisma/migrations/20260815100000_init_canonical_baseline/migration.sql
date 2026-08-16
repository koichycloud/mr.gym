-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "personalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombres" TEXT,
    "apellidos" TEXT,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'DNI',
    "numeroDocumento" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT NOT NULL DEFAULT 'M',
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fotoUrl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "motivoAnulacion" TEXT,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoHistorial" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "planId" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meses" INTEGER NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "codigo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "meses" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedidaFisica" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peso" DOUBLE PRECISION,
    "altura" DOUBLE PRECISION,
    "porcentajeGrasa" DOUBLE PRECISION,
    "porcentajeMusculo" DOUBLE PRECISION,
    "cuello" DOUBLE PRECISION,
    "hombros" DOUBLE PRECISION,
    "pecho" DOUBLE PRECISION,
    "cintura" DOUBLE PRECISION,
    "vientreBajo" DOUBLE PRECISION,
    "cadera" DOUBLE PRECISION,
    "gluteos" DOUBLE PRECISION,
    "biceps" DOUBLE PRECISION,
    "antebrazos" DOUBLE PRECISION,
    "muslos" DOUBLE PRECISION,
    "cuadriceps" DOUBLE PRECISION,
    "pantorrillas" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedidaFisica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL DEFAULT 'ENTRADA',

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "socioId" TEXT,
    "suscripcionId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "concepto" TEXT NOT NULL DEFAULT 'SUSCRIPCION',
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalles" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personal" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'DNI',
    "dni" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "montoPago" DOUBLE PRECISION NOT NULL,
    "horasObjetivo" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "horaEntradaManana" TEXT,
    "horaEntradaTarde" TEXT,

    CONSTRAINT "Personal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsistenciaPersonal" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaEntrada" TIMESTAMP(3),
    "horaSalidaAlmuerzo" TIMESTAMP(3),
    "horaEntradaAlmuerzo" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "horasTrabajadas" DOUBLE PRECISION,

    CONSTRAINT "AsistenciaPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoPersonal" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "fotoUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumoPersonal" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "productoPersonalId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "pagoId" TEXT,

    CONSTRAINT "ConsumoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdelantoPersonal" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "pagoId" TEXT,

    CONSTRAINT "AdelantoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoPersonal" (
    "id" TEXT NOT NULL,
    "personalId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horasTrabajadas" DOUBLE PRECISION NOT NULL,
    "horasObjetivo" DOUBLE PRECISION NOT NULL,
    "montoBase" DOUBLE PRECISION NOT NULL,
    "totalConsumos" DOUBLE PRECISION NOT NULL,
    "totalAdelantos" DOUBLE PRECISION NOT NULL,
    "montoFinal" DOUBLE PRECISION NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionEntrenador" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "mesesPlan" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsignacionEntrenador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilPlanificacion" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "objetivoPrincipal" TEXT NOT NULL,
    "objetivoSecundario" TEXT,
    "nivel" TEXT NOT NULL,
    "tiempoEntrenando" TEXT,
    "experienciaPrevia" TEXT,
    "diasPorSemana" INTEGER NOT NULL DEFAULT 3,
    "diasPreferidos" JSONB,
    "duracionMinutos" INTEGER NOT NULL DEFAULT 60,
    "horarioPreferido" TEXT,
    "tipoEntrenamiento" TEXT,
    "ejerciciosEvitados" TEXT,
    "lesionesReportadas" TEXT,
    "preferenciaAlimenticia" TEXT,
    "alergiasDeclaradas" TEXT,
    "alimentosEvitados" TEXT,
    "numeroComidasDia" INTEGER,
    "consumoAguaLitros" DOUBLE PRECISION,
    "observaciones" TEXT,
    "motivoVersionado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilPlanificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneracionIA" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "perfilPlanificacionId" TEXT NOT NULL,
    "entrenadorId" TEXT,
    "usuarioId" TEXT,
    "numeroGeneracion" INTEGER NOT NULL DEFAULT 1,
    "modeloUtilizado" TEXT NOT NULL,
    "versionSchema" TEXT NOT NULL DEFAULT '2.0',
    "estado" TEXT NOT NULL DEFAULT 'GENERADO',
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "banderasAdvertencia" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "tiempoGeneracionMs" INTEGER,
    "inputSnapshot" JSONB NOT NULL,
    "rawOutput" JSONB,
    "fechaAprobacion" TIMESTAMP(3),
    "aprobadoPorId" TEXT,
    "motivoRechazo" TEXT,
    "motivoRegeneracion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneracionIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEntrenamiento" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "perfilPlanificacionId" TEXT NOT NULL,
    "generacionIAId" TEXT,
    "entrenadorId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'GENERADO',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "splitSugerido" TEXT,
    "frecuenciaSemanal" INTEGER NOT NULL DEFAULT 3,
    "nivelActual" INTEGER NOT NULL DEFAULT 1,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "aprobadoPorId" TEXT,
    "contenido" JSONB NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanEntrenamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAlimentacion" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "perfilPlanificacionId" TEXT NOT NULL,
    "generacionIAId" TEXT,
    "entrenadorId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'GENERADO',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "lineamientosGenerales" JSONB,
    "recomendacionHidratacion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "aprobadoPorId" TEXT,
    "contenido" JSONB NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanAlimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_personalId_key" ON "User"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_codigo_key" ON "Socio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_numeroDocumento_key" ON "Socio"("numeroDocumento");

-- CreateIndex
CREATE INDEX "Socio_nombres_apellidos_idx" ON "Socio"("nombres", "apellidos");

-- CreateIndex
CREATE INDEX "CodigoHistorial_codigo_idx" ON "CodigoHistorial"("codigo");

-- CreateIndex
CREATE INDEX "CodigoHistorial_socioId_idx" ON "CodigoHistorial"("socioId");

-- CreateIndex
CREATE INDEX "Suscripcion_fechaFin_estado_idx" ON "Suscripcion"("fechaFin", "estado");

-- CreateIndex
CREATE INDEX "Suscripcion_socioId_idx" ON "Suscripcion"("socioId");

-- CreateIndex
CREATE INDEX "MedidaFisica_socioId_fecha_idx" ON "MedidaFisica"("socioId", "fecha");

-- CreateIndex
CREATE INDEX "Asistencia_socioId_fecha_idx" ON "Asistencia"("socioId", "fecha");

-- CreateIndex
CREATE INDEX "Asistencia_fecha_idx" ON "Asistencia"("fecha");

-- CreateIndex
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");

-- CreateIndex
CREATE INDEX "Pago_socioId_idx" ON "Pago"("socioId");

-- CreateIndex
CREATE INDEX "AuditLog_usuario_fecha_idx" ON "AuditLog"("usuario", "fecha");

-- CreateIndex
CREATE INDEX "AuditLog_accion_idx" ON "AuditLog"("accion");

-- CreateIndex
CREATE UNIQUE INDEX "Personal_codigo_key" ON "Personal"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Personal_dni_key" ON "Personal"("dni");

-- CreateIndex
CREATE INDEX "Personal_nombres_apellidos_idx" ON "Personal"("nombres", "apellidos");

-- CreateIndex
CREATE INDEX "AsistenciaPersonal_personalId_fecha_idx" ON "AsistenciaPersonal"("personalId", "fecha");

-- CreateIndex
CREATE INDEX "AsignacionEntrenador_socioId_idx" ON "AsignacionEntrenador"("socioId");

-- CreateIndex
CREATE INDEX "AsignacionEntrenador_entrenadorId_idx" ON "AsignacionEntrenador"("entrenadorId");

-- CreateIndex
CREATE INDEX "AsignacionEntrenador_activo_idx" ON "AsignacionEntrenador"("activo");

-- CreateIndex
CREATE INDEX "PerfilPlanificacion_socioId_idx" ON "PerfilPlanificacion"("socioId");

-- CreateIndex
CREATE INDEX "PerfilPlanificacion_entrenadorId_idx" ON "PerfilPlanificacion"("entrenadorId");

-- CreateIndex
CREATE INDEX "PerfilPlanificacion_asignacionId_idx" ON "PerfilPlanificacion"("asignacionId");

-- CreateIndex
CREATE INDEX "PerfilPlanificacion_activo_idx" ON "PerfilPlanificacion"("activo");

-- CreateIndex
CREATE INDEX "PerfilPlanificacion_fechaInicio_idx" ON "PerfilPlanificacion"("fechaInicio");

-- CreateIndex
CREATE INDEX "GeneracionIA_socioId_idx" ON "GeneracionIA"("socioId");

-- CreateIndex
CREATE INDEX "GeneracionIA_perfilPlanificacionId_idx" ON "GeneracionIA"("perfilPlanificacionId");

-- CreateIndex
CREATE INDEX "GeneracionIA_entrenadorId_idx" ON "GeneracionIA"("entrenadorId");

-- CreateIndex
CREATE INDEX "GeneracionIA_estado_idx" ON "GeneracionIA"("estado");

-- CreateIndex
CREATE INDEX "GeneracionIA_createdAt_idx" ON "GeneracionIA"("createdAt");

-- CreateIndex
CREATE INDEX "PlanEntrenamiento_socioId_idx" ON "PlanEntrenamiento"("socioId");

-- CreateIndex
CREATE INDEX "PlanEntrenamiento_perfilPlanificacionId_idx" ON "PlanEntrenamiento"("perfilPlanificacionId");

-- CreateIndex
CREATE INDEX "PlanEntrenamiento_generacionIAId_idx" ON "PlanEntrenamiento"("generacionIAId");

-- CreateIndex
CREATE INDEX "PlanEntrenamiento_activo_idx" ON "PlanEntrenamiento"("activo");

-- CreateIndex
CREATE INDEX "PlanEntrenamiento_estado_idx" ON "PlanEntrenamiento"("estado");

-- CreateIndex
CREATE INDEX "PlanAlimentacion_socioId_idx" ON "PlanAlimentacion"("socioId");

-- CreateIndex
CREATE INDEX "PlanAlimentacion_perfilPlanificacionId_idx" ON "PlanAlimentacion"("perfilPlanificacionId");

-- CreateIndex
CREATE INDEX "PlanAlimentacion_generacionIAId_idx" ON "PlanAlimentacion"("generacionIAId");

-- CreateIndex
CREATE INDEX "PlanAlimentacion_activo_idx" ON "PlanAlimentacion"("activo");

-- CreateIndex
CREATE INDEX "PlanAlimentacion_estado_idx" ON "PlanAlimentacion"("estado");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoHistorial" ADD CONSTRAINT "CodigoHistorial_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedidaFisica" ADD CONSTRAINT "MedidaFisica_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsistenciaPersonal" ADD CONSTRAINT "AsistenciaPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoPersonal" ADD CONSTRAINT "ConsumoPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoPersonal" ADD CONSTRAINT "ConsumoPersonal_productoPersonalId_fkey" FOREIGN KEY ("productoPersonalId") REFERENCES "ProductoPersonal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoPersonal" ADD CONSTRAINT "ConsumoPersonal_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "PagoPersonal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdelantoPersonal" ADD CONSTRAINT "AdelantoPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdelantoPersonal" ADD CONSTRAINT "AdelantoPersonal_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "PagoPersonal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoPersonal" ADD CONSTRAINT "PagoPersonal_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionEntrenador" ADD CONSTRAINT "AsignacionEntrenador_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionEntrenador" ADD CONSTRAINT "AsignacionEntrenador_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPlanificacion" ADD CONSTRAINT "PerfilPlanificacion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPlanificacion" ADD CONSTRAINT "PerfilPlanificacion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPlanificacion" ADD CONSTRAINT "PerfilPlanificacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "AsignacionEntrenador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_generacionIAId_fkey" FOREIGN KEY ("generacionIAId") REFERENCES "GeneracionIA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_generacionIAId_fkey" FOREIGN KEY ("generacionIAId") REFERENCES "GeneracionIA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Create Partial Unique Indexes for active single record per socio enforcement
CREATE UNIQUE INDEX "AsignacionEntrenador_un_activo_por_socio_key" ON "AsignacionEntrenador"("socioId") WHERE "activo" = true;
CREATE UNIQUE INDEX "PerfilPlanificacion_un_activo_por_socio_key" ON "PerfilPlanificacion"("socioId") WHERE "activo" = true;
CREATE UNIQUE INDEX "PlanEntrenamiento_un_activo_por_socio_key" ON "PlanEntrenamiento"("socioId") WHERE "activo" = true;
CREATE UNIQUE INDEX "PlanAlimentacion_un_activo_por_socio_key" ON "PlanAlimentacion"("socioId") WHERE "activo" = true;
