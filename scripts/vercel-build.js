// Este script es ejecutado automáticamente por Vercel (o en local) bajo el comando 'npm run build'.
// Su propósito es permitirte desarrollar localmente con SQLite y que Vercel use PostgreSQL automáticamente.

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const prismaSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

try {
  // Verificamos si estamos construyendo en los servidores de Vercel (Vercel inyecta VERCEL=1)
  if (process.env.VERCEL === '1') {
    console.log('🚀 [Vercel Build] Entorno de Nube detectado. Transformando SQLite a PostgreSQL dinámicamente...');
    
    let schema = fs.readFileSync(prismaSchemaPath, 'utf8');
    
    // Reemplaza provider = "sqlite" por provider = "postgresql" solo en memoria/Vercel
    schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
    
    fs.writeFileSync(prismaSchemaPath, schema);
    console.log('✅ [Vercel Build] Schema.prisma actualizado a PostgreSQL temporalmente para la nube.');
  } else {
    console.log('💻 [Local Build] Compilación local detectada. Manteniendo el motor SQLite nativo.');
  }

  console.log('⚙️ Ejecutando Generación de Cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('🏗️ Ejecutando compilación optimizada de Next.js...');
  execSync('npx next build', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error fatal durante la compilación inteligente:', error);
  process.exit(1);
}
