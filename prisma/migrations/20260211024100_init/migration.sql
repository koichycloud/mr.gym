-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
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
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meses" INTEGER NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_codigo_key" ON "Socio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_numeroDocumento_key" ON "Socio"("numeroDocumento");

-- AddForeignKey
ALTER TABLE "CodigoHistorial" ADD CONSTRAINT "CodigoHistorial_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedidaFisica" ADD CONSTRAINT "MedidaFisica_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
