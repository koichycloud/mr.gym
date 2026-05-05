const fs = require('fs');
const path = require('path');

// Read .env.prod file
const envPath = path.join(__dirname, '..', '.env.prod');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/\\n/gm, '\n');
      }
      value = value.replace(/(^['"]|['"]$)/g, '').trim();
      process.env[key] = value;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const socios = await prisma.socio.findMany({
    select: { codigo: true }
  });
  
  const historial = await prisma.codigoHistorial.findMany({
    select: { codigo: true }
  });

  const allCodeStrings = new Set([
      ...socios.map(s => s.codigo),
      ...historial.map(h => h.codigo)
  ]);

  const codes = Array.from(allCodeStrings)
    .map(c => parseInt(c, 10))
    .filter(c => !isNaN(c))
    .sort((a, b) => a - b);

  if (codes.length === 0) {
    console.log("No valid numeric codes found.");
    return;
  }

  const min = Math.min(...codes);
  const max = Math.max(...codes);
  
  const missing = [];
  for (let i = 1; i <= max; i++) { 
    if (!codes.includes(i)) {
      missing.push(i);
    }
  }

  console.log(`Total unique used codes (active + historical): ${codes.length}`);
  console.log(`Min code: ${min}, Max code: ${max}`);
  console.log(`Missing codes (from 1 to ${max}):`);
  
  if (missing.length > 0) {
      const ranges = [];
      let start = missing[0];
      let end = missing[0];

      for (let i = 1; i < missing.length; i++) {
        if (missing[i] === end + 1) {
          end = missing[i];
        } else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          start = missing[i];
          end = missing[i];
        }
      }
      ranges.push(start === end ? `${start}` : `${start}-${end}`);

      console.log(ranges.join(', '));
      console.log(`\nTotal missing codes: ${missing.length}`);
  } else {
      console.log("No missing codes found!");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
