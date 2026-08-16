-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "Ejercicio_nombre_key" ON "Ejercicio"("nombre");

-- CreateIndex
CREATE INDEX "Ejercicio_grupoMuscular_idx" ON "Ejercicio"("grupoMuscular");

-- CreateIndex
CREATE INDEX "Ejercicio_nivel_idx" ON "Ejercicio"("nivel");

-- CreateIndex
CREATE INDEX "Ejercicio_equipamientoRequerido_idx" ON "Ejercicio"("equipamientoRequerido");

-- CreateIndex
CREATE INDEX "Ejercicio_activo_idx" ON "Ejercicio"("activo");
