const fs = require('fs');

const filesToUpdate = {
    layout: 'c:/Users/HP/Desktop/mr_gym_dev/src/app/layout.tsx',
    page: 'c:/Users/HP/Desktop/mr_gym_dev/src/app/page.tsx',
    socios: 'c:/Users/HP/Desktop/mr_gym_dev/src/app/socios/SociosListClient.tsx',
    asistencia: 'c:/Users/HP/Desktop/mr_gym_dev/src/app/asistencia/AsistenciaClient.tsx'
};

// 1. Layout: Solo cambiar bg-white a bg-gray-100 en la etiqueta body
if (fs.existsSync(filesToUpdate.layout)) {
    let content = fs.readFileSync(filesToUpdate.layout, 'utf8');
    content = content.replace(/<body[\s\S]*?className="([^"]*?) bg-white([^"]*?)"[\s\S]*?>/, (match, p1, p2) => {
        return match.replace('bg-white', 'bg-gray-100');
    });
    fs.writeFileSync(filesToUpdate.layout, content);
    console.log('✔ Updated layout.tsx');
}

// 2. Page (Dashboard)
if (fs.existsSync(filesToUpdate.page)) {
    let content = fs.readFileSync(filesToUpdate.page, 'utf8');
    content = content.split('className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${vencimiento.socio.sexo === \'F\' ? \'bg-pink-100 text-pink-800\' : \'bg-blue-100 text-blue-800\'}`}').join('translate="no" className={`notranslate w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${vencimiento.socio.sexo === \'F\' ? \'bg-pink-100 text-pink-800\' : \'bg-blue-100 text-blue-800\'}`}');
    fs.writeFileSync(filesToUpdate.page, content);
    console.log('✔ Updated page.tsx');
}

// 3. Socios List
if (fs.existsSync(filesToUpdate.socios)) {
    let content = fs.readFileSync(filesToUpdate.socios, 'utf8');
    content = content.split('className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${socio.sexo === \'F\' ? \'bg-pink-100 text-pink-800\' : \'bg-blue-100 text-blue-800\'}`}').join('translate="no" className={`notranslate w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${socio.sexo === \'F\' ? \'bg-pink-100 text-pink-800\' : \'bg-blue-100 text-blue-800\'}`}');
    fs.writeFileSync(filesToUpdate.socios, content);
    console.log('✔ Updated SociosListClient.tsx');
}

// 4. Asistencia
if (fs.existsSync(filesToUpdate.asistencia)) {
    let content = fs.readFileSync(filesToUpdate.asistencia, 'utf8');
    content = content.split('className={`px-2 py-1 rounded text-sm font-semibold ${a.socio.sexo === \'F\' ? \'bg-pink-100 text-pink-800\' : \'bg-blue-100 text-blue-800\'}`}').join('translate="no" className={`notranslate px-2 py-1 rounded text-sm font-semibold ${a.socio.sexo === \'F\' ? \'bg-pink-100 text-pink-800\' : \'bg-blue-100 text-blue-800\'}`}');
    fs.writeFileSync(filesToUpdate.asistencia, content);
    console.log('✔ Updated AsistenciaClient.tsx');
}

console.log('✨ All targeted fixes applied successfully.');
