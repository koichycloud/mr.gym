// Este script es ejecutado automáticamente por Vercel bajo el comando 'npm run build'.
// Ejecuta las migraciones pendientes antes de compilar Next.js.

const { execSync } = require('child_process');

try {
  if (process.env.VERCEL === '1') {
    console.log('🚀 [Vercel Build] Entorno de producción detectado.');
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
