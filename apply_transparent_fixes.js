const fs = require('fs');
const glob = require('glob');

const files = [
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/users/page.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/socios/[id]/SocioDetailClient.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/socios/[id]/editar/page.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/socios/SociosListClient.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/socios/nuevo/NuevoSocioClient.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/caja/page.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/asistencia/page.tsx',
    'c:/Users/HP/Desktop/mr_gym_dev/src/app/admin/scanner/page.tsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        // Reemplazar bg-white por bg-transparent solo en las clases que definen el contenedor principal
        // Por ejemplo: min-h-screen bg-white -> min-h-screen bg-transparent
        if (content.includes('min-h-screen bg-white')) {
            content = content.replace(/min-h-screen bg-white/g, 'min-h-screen bg-transparent');
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
