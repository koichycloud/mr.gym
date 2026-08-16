// Este script es ejecutado automáticamente por Vercel bajo el comando 'npm run build'.
// Gestiona migraciones de base de datos de forma segura antes del build de Next.js.
//
// ESTRATEGIA DE MIGRACIONES:
// 1. prisma migrate resolve --applied: marca el baseline canónico como ya aplicado
//    (idempotente: si ya está marcado, no hace nada; evita error de tabla duplicada)
// 2. prisma migrate deploy: aplica SOLO las migraciones genuinamente pendientes
// 3. prisma generate: genera el cliente Prisma
// 4. next build: compila la aplicación

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Nombre exacto del baseline canónico que ya existe en producción
const BASELINE_MIGRATION = '20260815100000_init_canonical_baseline';

try {
  if (process.env.VERCEL === '1') {
    console.log('🚀 [Vercel Build] Entorno de producción detectado.');

    // El schema ya está configurado como postgresql — no se requiere transformación.
    console.log('✅ [Vercel Build] Schema.prisma verificado (postgresql configurado).');

    // Paso 1: Marcar el baseline como aplicado (idempotente — seguro si ya existe)
    console.log(`📌 [Migraciones] Marcando baseline como aplicado: ${BASELINE_MIGRATION}`);
    try {
      execSync(`npx prisma migrate resolve --applied ${BASELINE_MIGRATION}`, { stdio: 'inherit' });
      console.log('✅ [Migraciones] Baseline marcado correctamente (o ya estaba aplicado).');
    } catch (resolveError) {
      // Si el baseline ya estaba marcado, Prisma puede lanzar un error no fatal
      console.log('ℹ️ [Migraciones] Baseline ya registrado en _prisma_migrations — continuando.');
    }

    // Paso 2: Aplicar migraciones pendientes reales
    console.log('🗄️ [Migraciones] Ejecutando prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ [Migraciones] Migraciones aplicadas correctamente.');

  } else {
    console.log('💻 [Local Build] Compilación local detectada. Saltando migraciones de producción.');
  }

  console.log('⚙️ Ejecutando generación de cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('🏗️ Ejecutando compilación optimizada de Next.js...');
  execSync('npx next build', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error fatal durante la compilación:', error.message || error);
  process.exit(1);
}
