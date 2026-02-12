"use strict";
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Data Export from SQLite ---');

    try {
        // 1. Users
        const users = await prisma.user.findMany();
        console.log(`Exported ${users.length} Users`);

        // 2. Socios
        const socios = await prisma.socio.findMany();
        console.log(`Exported ${socios.length} Socios`);

        // 3. Suscripciones
        const suscripciones = await prisma.suscripcion.findMany();
        console.log(`Exported ${suscripciones.length} Suscripciones`);

        // 4. MedidasFisicas
        const medidas = await prisma.medidaFisica.findMany();
        console.log(`Exported ${medidas.length} MedidasFisicas`);

        // 5. HistorialCodigos
        const historial = await prisma.codigoHistorial.findMany();
        console.log(`Exported ${historial.length} CodigoHistorial entries`);

        const data = {
            users,
            socios,
            suscripciones,
            medidas,
            historial
        };

        const outputPath = path.join(__dirname, 'migration_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`Data successfully saved to ${outputPath}`);

    } catch (error) {
        console.error('Error exporting data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
