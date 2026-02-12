const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Inspecting SQLite Database Structure ---');
        // Raw query to get all table names from sqlite_master
        const result = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table';`;
        console.log('Tables found in dev.db:', result);
    } catch (error) {
        console.error('Error inspecting database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
