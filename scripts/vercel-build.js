// Este script es ejecutado automáticamente por Vercel (o en local) bajo el comando 'npm run build'.
const { execSync } = require('child_process');

try {
  if (process.env.VERCEL === '1') {
    console.log('🚀 [Vercel Build] Entorno de producción detectado.');
  } else {
    console.log('💻 [Local Build] Compilación local detectada.');
  }

  console.log('⚙️ Ejecutando generación de cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('🏗️ Ejecutando compilación optimizada de Next.js...');
  execSync('npx next build', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error fatal durante la compilación:', error.message || error);
  process.exit(1);
}
