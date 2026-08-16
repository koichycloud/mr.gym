-- AlterTable User (agregar personalId opcional para vincular usuario con personal)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "personalId" TEXT;

-- CreateIndex User_personalId_key
CREATE UNIQUE INDEX IF NOT EXISTS "User_personalId_key" ON "User"("personalId");

-- CreateTable AsignacionEntrenador
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

-- CreateTable PerfilPlanificacion
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
    "capacidadCardiovascular" TEXT,
    "capacidadFuerza" TEXT,
    "equipamientoDisponible" TEXT,
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

-- CreateTable GeneracionIA
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

-- CreateTable PlanEntrenamiento
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

-- CreateTable PlanAlimentacion
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

-- CreateTable Ejercicio
CREATE TABLE "Ejercicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "instrucciones" TEXT,
    "grupoMuscular" TEXT NOT NULL,
    "grupoMuscularSecundario" TEXT,
    "nivel" TEXT NOT NULL DEFAULT 'PRINCIPIANTE',
    "tipoEjercicio" TEXT NOT NULL DEFAULT 'FUERZA',
    "equipamientoRequerido" TEXT NOT NULL DEFAULT 'GIMNASIO_COMPLETO',
    "restricciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Ejercicio
CREATE UNIQUE INDEX "Ejercicio_nombre_key" ON "Ejercicio"("nombre");
CREATE INDEX "Ejercicio_grupoMuscular_idx" ON "Ejercicio"("grupoMuscular");
CREATE INDEX "Ejercicio_nivel_idx" ON "Ejercicio"("nivel");
CREATE INDEX "Ejercicio_equipamientoRequerido_idx" ON "Ejercicio"("equipamientoRequerido");
CREATE INDEX "Ejercicio_activo_idx" ON "Ejercicio"("activo");

-- CreateIndex AsignacionEntrenador
CREATE INDEX "AsignacionEntrenador_socioId_idx" ON "AsignacionEntrenador"("socioId");
CREATE INDEX "AsignacionEntrenador_entrenadorId_idx" ON "AsignacionEntrenador"("entrenadorId");
CREATE INDEX "AsignacionEntrenador_activo_idx" ON "AsignacionEntrenador"("activo");

-- CreateIndex PerfilPlanificacion
CREATE INDEX "PerfilPlanificacion_socioId_idx" ON "PerfilPlanificacion"("socioId");
CREATE INDEX "PerfilPlanificacion_entrenadorId_idx" ON "PerfilPlanificacion"("entrenadorId");
CREATE INDEX "PerfilPlanificacion_asignacionId_idx" ON "PerfilPlanificacion"("asignacionId");
CREATE INDEX "PerfilPlanificacion_activo_idx" ON "PerfilPlanificacion"("activo");
CREATE INDEX "PerfilPlanificacion_fechaInicio_idx" ON "PerfilPlanificacion"("fechaInicio");

-- CreateIndex GeneracionIA
CREATE INDEX "GeneracionIA_socioId_idx" ON "GeneracionIA"("socioId");
CREATE INDEX "GeneracionIA_perfilPlanificacionId_idx" ON "GeneracionIA"("perfilPlanificacionId");
CREATE INDEX "GeneracionIA_entrenadorId_idx" ON "GeneracionIA"("entrenadorId");
CREATE INDEX "GeneracionIA_estado_idx" ON "GeneracionIA"("estado");
CREATE INDEX "GeneracionIA_createdAt_idx" ON "GeneracionIA"("createdAt");

-- CreateIndex PlanEntrenamiento
CREATE INDEX "PlanEntrenamiento_socioId_idx" ON "PlanEntrenamiento"("socioId");
CREATE INDEX "PlanEntrenamiento_perfilPlanificacionId_idx" ON "PlanEntrenamiento"("perfilPlanificacionId");
CREATE INDEX "PlanEntrenamiento_generacionIAId_idx" ON "PlanEntrenamiento"("generacionIAId");
CREATE INDEX "PlanEntrenamiento_activo_idx" ON "PlanEntrenamiento"("activo");
CREATE INDEX "PlanEntrenamiento_estado_idx" ON "PlanEntrenamiento"("estado");

-- CreateIndex PlanAlimentacion
CREATE INDEX "PlanAlimentacion_socioId_idx" ON "PlanAlimentacion"("socioId");
CREATE INDEX "PlanAlimentacion_perfilPlanificacionId_idx" ON "PlanAlimentacion"("perfilPlanificacionId");
CREATE INDEX "PlanAlimentacion_generacionIAId_idx" ON "PlanAlimentacion"("generacionIAId");
CREATE INDEX "PlanAlimentacion_activo_idx" ON "PlanAlimentacion"("activo");
CREATE INDEX "PlanAlimentacion_estado_idx" ON "PlanAlimentacion"("estado");

-- AddForeignKey User -> Personal
ALTER TABLE "User" ADD CONSTRAINT "User_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey AsignacionEntrenador
ALTER TABLE "AsignacionEntrenador" ADD CONSTRAINT "AsignacionEntrenador_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AsignacionEntrenador" ADD CONSTRAINT "AsignacionEntrenador_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey PerfilPlanificacion
ALTER TABLE "PerfilPlanificacion" ADD CONSTRAINT "PerfilPlanificacion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerfilPlanificacion" ADD CONSTRAINT "PerfilPlanificacion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerfilPlanificacion" ADD CONSTRAINT "PerfilPlanificacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "AsignacionEntrenador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey GeneracionIA
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey PlanEntrenamiento
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_generacionIAId_fkey" FOREIGN KEY ("generacionIAId") REFERENCES "GeneracionIA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEntrenamiento" ADD CONSTRAINT "PlanEntrenamiento_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey PlanAlimentacion
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_generacionIAId_fkey" FOREIGN KEY ("generacionIAId") REFERENCES "GeneracionIA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanAlimentacion" ADD CONSTRAINT "PlanAlimentacion_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Partial Unique Indexes for single active record per socio enforcement
CREATE UNIQUE INDEX "AsignacionEntrenador_un_activo_por_socio_key" ON "AsignacionEntrenador"("socioId") WHERE "activo" = true;
CREATE UNIQUE INDEX "PerfilPlanificacion_un_activo_por_socio_key" ON "PerfilPlanificacion"("socioId") WHERE "activo" = true;
CREATE UNIQUE INDEX "PlanEntrenamiento_un_activo_por_socio_key" ON "PlanEntrenamiento"("socioId") WHERE "activo" = true;
CREATE UNIQUE INDEX "PlanAlimentacion_un_activo_por_socio_key" ON "PlanAlimentacion"("socioId") WHERE "activo" = true;
