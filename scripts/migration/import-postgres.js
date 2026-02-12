"use strict";
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Data Import to PostgreSQL ---');

    const dataPath = path.join(__dirname, 'migration_data.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Migration data file not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    try {
        // 1. Users (Handle conflicts)
        console.log(`Importing ${data.users.length} Users...`);
        for (const user of data.users) {
            await prisma.user.upsert({
                where: { username: user.username },
                update: {}, // Don't update if exists
                create: {
                    id: user.id,
                    username: user.username,
                    password: user.password,
                    role: user.role,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(user.updatedAt)
                }
            });
        }

        // 2. Socios
        console.log(`Importing ${data.socios.length} Socios...`);
        for (const socio of data.socios) {
            // Check if exists by code or document to avoid unique constraint errors
            const exists = await prisma.socio.findFirst({
                where: {
                    OR: [
                        { codigo: socio.codigo },
                        { numeroDocumento: socio.numeroDocumento }
                    ]
                }
            });

            if (!exists) {
                await prisma.socio.create({
                    data: {
                        id: socio.id,
                        codigo: socio.codigo,
                        nombres: socio.nombres,
                        apellidos: socio.apellidos,
                        tipoDocumento: socio.tipoDocumento,
                        numeroDocumento: socio.numeroDocumento,
                        fechaNacimiento: new Date(socio.fechaNacimiento),
                        sexo: socio.sexo,
                        telefono: socio.telefono,
                        createdAt: new Date(socio.createdAt),
                        updatedAt: new Date(socio.updatedAt)
                    }
                });
            }
        }

        // 3. Suscripciones
        console.log(`Importing ${data.suscripciones.length} Suscripciones...`);
        for (const sub of data.suscripciones) {
            const exists = await prisma.suscripcion.findUnique({ where: { id: sub.id } });
            if (!exists) {
                // Ensure socio exists
                const socioExists = await prisma.socio.findUnique({ where: { id: sub.socioId } });
                if (socioExists) {
                    await prisma.suscripcion.create({
                        data: {
                            id: sub.id,
                            socioId: sub.socioId,
                            fechaInicio: new Date(sub.fechaInicio),
                            meses: sub.meses,
                            fechaFin: new Date(sub.fechaFin),
                            estado: sub.estado,
                            createdAt: new Date(sub.createdAt),
                            updatedAt: new Date(sub.updatedAt)
                        }
                    });
                }
            }
        }

        // 4. MedidasFisicas
        console.log(`Importing ${data.medidas.length} MedidasFisicas...`);
        for (const medida of data.medidas) {
            const exists = await prisma.medidaFisica.findUnique({ where: { id: medida.id } });
            if (!exists) {
                const socioExists = await prisma.socio.findUnique({ where: { id: medida.socioId } });
                if (socioExists) {
                    await prisma.medidaFisica.create({
                        data: {
                            id: medida.id,
                            socioId: medida.socioId,
                            fecha: new Date(medida.fecha),
                            peso: medida.peso,
                            altura: medida.altura,
                            porcentajeGrasa: medida.porcentajeGrasa,
                            porcentajeMusculo: medida.porcentajeMusculo,
                            cuello: medida.cuello,
                            hombros: medida.hombros,
                            pecho: medida.pecho,
                            cintura: medida.cintura,
                            vientreBajo: medida.vientreBajo,
                            cadera: medida.cadera,
                            gluteos: medida.gluteos,
                            biceps: medida.biceps,
                            antebrazos: medida.antebrazos,
                            muslos: medida.muslos,
                            cuadriceps: medida.cuadriceps,
                            pantorrillas: medida.pantorrillas,
                            createdAt: new Date(medida.createdAt),
                            updatedAt: new Date(medida.updatedAt)
                        }
                    });
                }
            }
        }

        // 5. HistorialCodigos
        console.log(`Importing ${data.historial.length} CodigoHistorial entries...`);
        for (const h of data.historial) {
            const exists = await prisma.codigoHistorial.findUnique({ where: { id: h.id } });
            if (!exists) {
                const socioExists = await prisma.socio.findUnique({ where: { id: h.socioId } });
                if (socioExists) {
                    await prisma.codigoHistorial.create({
                        data: {
                            id: h.id,
                            socioId: h.socioId,
                            codigo: h.codigo,
                            fechaCambio: new Date(h.fechaCambio)
                        }
                    });
                }
            }
        }

        console.log('--- Import completed successfully ---');

    } catch (error) {
        console.error('Error importing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
