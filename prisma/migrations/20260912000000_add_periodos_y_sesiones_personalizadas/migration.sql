-- CreateTable
CREATE TABLE "PeriodoEntrenamientoPersonalizado" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "perfilPlanificacionId" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "mesesPeriodo" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "frecuenciaRecomendada" INTEGER NOT NULL,
    "frecuenciaAcordada" INTEGER NOT NULL,
    "diasAcordados" JSONB NOT NULL,
    "horaInicioAcordada" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL DEFAULT 60,
    "objetivoAcordado" TEXT,
    "observaciones" TEXT,
    "creadoPorUsuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodoEntrenamientoPersonalizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionEntrenamientoPersonalizado" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "entrenadorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "duracionMinutos" INTEGER NOT NULL DEFAULT 60,
    "estado" TEXT NOT NULL DEFAULT 'PROGRAMADA',
    "esReprogramada" BOOLEAN NOT NULL DEFAULT false,
    "sesionOriginalId" TEXT,
    "reprogramadaEnSesionId" TEXT,
    "motivoReprogramacion" TEXT,
    "motivoCancelacion" TEXT,
    "notasEntrenador" TEXT,
    "asistio" BOOLEAN,
    "horaCheckIn" TIMESTAMP(3),
    "marcadoPorUsuarioId" TEXT,
    "creadoPorUsuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SesionEntrenamientoPersonalizado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeriodoEntrenamientoPersonalizado_socioId_idx" ON "PeriodoEntrenamientoPersonalizado"("socioId");

-- CreateIndex
CREATE INDEX "PeriodoEntrenamientoPersonalizado_entrenadorId_idx" ON "PeriodoEntrenamientoPersonalizado"("entrenadorId");

-- CreateIndex
CREATE INDEX "PeriodoEntrenamientoPersonalizado_asignacionId_idx" ON "PeriodoEntrenamientoPersonalizado"("asignacionId");

-- CreateIndex
CREATE INDEX "PeriodoEntrenamientoPersonalizado_perfilPlanificacionId_idx" ON "PeriodoEntrenamientoPersonalizado"("perfilPlanificacionId");

-- CreateIndex
CREATE INDEX "PeriodoEntrenamientoPersonalizado_estado_idx" ON "PeriodoEntrenamientoPersonalizado"("estado");

-- CreateIndex
CREATE INDEX "PeriodoEntrenamientoPersonalizado_fechaInicio_fechaFin_idx" ON "PeriodoEntrenamientoPersonalizado"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "SesionEntrenamientoPersonalizado_socioId_fechaHoraInicio_idx" ON "SesionEntrenamientoPersonalizado"("socioId", "fechaHoraInicio");

-- CreateIndex
CREATE INDEX "SesionEntrenamientoPersonalizado_entrenadorId_fechaHoraInicio_idx" ON "SesionEntrenamientoPersonalizado"("entrenadorId", "fechaHoraInicio");

-- CreateIndex
CREATE INDEX "SesionEntrenamientoPersonalizado_periodoId_idx" ON "SesionEntrenamientoPersonalizado"("periodoId");

-- CreateIndex
CREATE INDEX "SesionEntrenamientoPersonalizado_estado_idx" ON "SesionEntrenamientoPersonalizado"("estado");

-- CreateIndex
CREATE INDEX "SesionEntrenamientoPersonalizado_fecha_idx" ON "SesionEntrenamientoPersonalizado"("fecha");

-- CreateIndex
CREATE INDEX "SesionEntrenamientoPersonalizado_fechaHoraInicio_fechaHoraFin_idx" ON "SesionEntrenamientoPersonalizado"("fechaHoraInicio", "fechaHoraFin");

-- AddForeignKey
ALTER TABLE "PeriodoEntrenamientoPersonalizado" ADD CONSTRAINT "PeriodoEntrenamientoPersonalizado_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoEntrenamientoPersonalizado" ADD CONSTRAINT "PeriodoEntrenamientoPersonalizado_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoEntrenamientoPersonalizado" ADD CONSTRAINT "PeriodoEntrenamientoPersonalizado_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "AsignacionEntrenador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodoEntrenamientoPersonalizado" ADD CONSTRAINT "PeriodoEntrenamientoPersonalizado_perfilPlanificacionId_fkey" FOREIGN KEY ("perfilPlanificacionId") REFERENCES "PerfilPlanificacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEntrenamientoPersonalizado" ADD CONSTRAINT "SesionEntrenamientoPersonalizado_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "PeriodoEntrenamientoPersonalizado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEntrenamientoPersonalizado" ADD CONSTRAINT "SesionEntrenamientoPersonalizado_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEntrenamientoPersonalizado" ADD CONSTRAINT "SesionEntrenamientoPersonalizado_entrenadorId_fkey" FOREIGN KEY ("entrenadorId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionEntrenamientoPersonalizado" ADD CONSTRAINT "SesionEntrenamientoPersonalizado_sesionOriginalId_fkey" FOREIGN KEY ("sesionOriginalId") REFERENCES "SesionEntrenamientoPersonalizado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
