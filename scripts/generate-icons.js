const fs = require('fs');
const path = require('path');
const https = require('https');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function downloadIcon(size) {
    const url = `https://ui-avatars.com/api/?name=Mr+Gym&size=${size}&background=000000&color=ffffff&rounded=true&bold=true`;
    const dest = path.join(iconsDir, `icon-${size}x${size}.png`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve(dest));
            });
        }).on('error', err => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

Promise.all([downloadIcon(192), downloadIcon(512)])
    .then(files => console.log('Successfully generated PWA icons:', files))
    .catch(err => console.error('Failed to generate icons:', err));
