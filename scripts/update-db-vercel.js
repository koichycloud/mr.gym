const { execSync } = require('child_process');

console.log("Removing old DATABASE_URL...");
try {
    execSync(`npx vercel env rm DATABASE_URL production -y`, { stdio: 'inherit', shell: true });
} catch (e) { }

console.log("Adding new Pooler DATABASE_URL...");
// process.stdout.write prevents the trailing newline that 'echo' adds on Windows
const url = "postgresql://postgres.irqlkbihlqgwzpfbbzhz:jJh7uow22TI83H1i@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
execSync(`node -e "process.stdout.write('${url}')" | npx vercel env add DATABASE_URL production`, { stdio: 'inherit', shell: true });

console.log("Triggering Vercel production redeploy...");
try {
    execSync(`npx vercel --prod --yes`, { stdio: 'inherit', shell: true });
} catch (e) {
    console.log("Deploy failed or already in progress");
}

console.log("Finished!");
