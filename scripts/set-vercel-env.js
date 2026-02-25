const { execSync } = require('child_process');

try {
    // Use execSync with trim to avoid passing newlines from echo
    console.log("Setting NEXTAUTH_URL...");
    execSync(`npx vercel env rm NEXTAUTH_URL production -y`, { stdio: 'inherit', shell: true }).catch(() => { });
} catch (e) { }

try {
    execSync(`npx vercel env rm AUTH_URL production -y`, { stdio: 'inherit', shell: true }).catch(() => { });
} catch (e) { }

console.log("Adding NEXTAUTH_URL...");
execSync(`echo https://mr-gym-dev.vercel.app | npx vercel env add NEXTAUTH_URL production`, { stdio: 'inherit', shell: true });

console.log("Adding AUTH_URL...");
execSync(`echo https://mr-gym-dev.vercel.app | npx vercel env add AUTH_URL production`, { stdio: 'inherit', shell: true });

console.log("Done.");
