/**
 * SEED DE DATOS DE PRUEBA - Módulo Personal y Nómina
 * Ejecutar: node scratch/seed_personal.js
 */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Leer DATABASE_URL del .env
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/^DATABASE_URL="(.+)"/m);
if (match) process.env.DATABASE_URL = match[1];

const prisma = new PrismaClient();

// Utilidad para generar fechas relativas
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const addHours = (date, h) => new Date(date.getTime() + h * 60 * 60 * 1000);
const addMinutes = (date, m) => new Date(date.getTime() + m * 60 * 1000);

async function main() {
  console.log('🧹 Limpiando datos previos del módulo personal...');
  await prisma.pagoPersonal.deleteMany();
  await prisma.consumoPersonal.deleteMany();
  await prisma.adelantoPersonal.deleteMany();
  await prisma.asistenciaPersonal.deleteMany();
  await prisma.productoPersonal.deleteMany();
  await prisma.personal.deleteMany();
  console.log('✅ Limpieza completada.\n');

  // =============================================
  // 1. PRODUCTOS DEL CATÁLOGO
  // =============================================
  console.log('📦 Creando catálogo de productos...');
  const productos = await Promise.all([
    prisma.productoPersonal.create({ data: {
      nombre: 'Agua Mineral 625ml',
      descripcion: 'Botella de agua mineral San Luis',
      precio: 2.00,
      fotoUrl: 'https://www.supermercadoswong.com/wcsstore/WongCAS/images/catalog/full/1047843_1.jpg',
      activo: true,
    }}),
    prisma.productoPersonal.create({ data: {
      nombre: 'Gatorade 500ml',
      descripcion: 'Bebida isotónica sabor limón',
      precio: 4.50,
      fotoUrl: 'https://www.supermercadoswong.com/wcsstore/WongCAS/images/catalog/full/115540_1.jpg',
      activo: true,
    }}),
    prisma.productoPersonal.create({ data: {
      nombre: 'Barra de Proteína',
      descripcion: 'Quest Bar sabor cookies & cream',
      precio: 8.00,
      fotoUrl: null,
      activo: true,
    }}),
    prisma.productoPersonal.create({ data: {
      nombre: 'Café Americano',
      descripcion: 'Café negro en vaso grande',
      precio: 3.00,
      fotoUrl: null,
      activo: true,
    }}),
    prisma.productoPersonal.create({ data: {
      nombre: 'Whey Protein (1 scoop)',
      descripcion: 'Proteína en polvo sabor vainilla',
      precio: 6.00,
      fotoUrl: null,
      activo: true,
    }}),
  ]);
  console.log(`✅ ${productos.length} productos creados.\n`);

  // =============================================
  // 2. PERSONAL (5 empleados, distintos roles/métodos)
  // =============================================
  console.log('👥 Creando personal...');
  const personalData = [
    {
      codigo: 'INS001',
      nombres: 'Carlos',
      apellidos: 'Mendoza Ríos',
      dni: '40123456',
      telefono: '987654321',
      rol: 'Instructor',
      metodoPago: 'QUINCENAL',
      montoPago: 800.00,
      horasObjetivo: 80,
    },
    {
      codigo: 'INS002',
      nombres: 'María',
      apellidos: 'Torres Vega',
      dni: '42345678',
      telefono: '976543210',
      rol: 'Instructor',
      metodoPago: 'POR_HORA',
      montoPago: 15.00,
      horasObjetivo: 40,
    },
    {
      codigo: 'REC001',
      nombres: 'Juan',
      apellidos: 'Castillo López',
      dni: '45678901',
      telefono: '965432109',
      rol: 'Recepcionista',
      metodoPago: 'MENSUAL',
      montoPago: 1200.00,
      horasObjetivo: 160,
    },
    {
      codigo: 'LIM001',
      nombres: 'Rosa',
      apellidos: 'Huamán Ccori',
      dni: '43210987',
      telefono: '954321098',
      rol: 'Limpieza',
      metodoPago: 'SEMANAL',
      montoPago: 250.00,
      horasObjetivo: 40,
    },
    {
      codigo: 'ADM001',
      nombres: 'Pedro',
      apellidos: 'Alvarado Soto',
      dni: '41098765',
      telefono: '943210987',
      rol: 'Administrativo',
      metodoPago: 'QUINCENAL',
      montoPago: 950.00,
      horasObjetivo: 80,
    },
  ];

  const personalCreado = await Promise.all(
    personalData.map(d => prisma.personal.create({ data: d }))
  );
  console.log(`✅ ${personalCreado.length} empleados creados.\n`);

  const [carlos, maria, juan, rosa, pedro] = personalCreado;

  // =============================================
  // 3. ASISTENCIAS (últimas 2 semanas)
  // =============================================
  console.log('📅 Generando asistencias...');

  // Helper para crear una asistencia completa de un día
  const crearAsistencia = async (personalId, diasAtras, entradaHora, salidaHora, conAlmuerzo = true) => {
    const baseDate = daysAgo(diasAtras);
    // Evitar fines de semana (sáb=6, dom=0)
    if (baseDate.getDay() === 0 || baseDate.getDay() === 6) return null;

    baseDate.setHours(0, 0, 0, 0);
    const entrada = new Date(baseDate);
    entrada.setHours(entradaHora, Math.floor(Math.random() * 15), 0);
    const salida = new Date(baseDate);
    salida.setHours(salidaHora, Math.floor(Math.random() * 15), 0);

    let saliAlm = null, entAlm = null;
    if (conAlmuerzo) {
      saliAlm = addHours(entrada, 4);  // almuerza 4h después de entrar
      entAlm = addMinutes(saliAlm, 45); // retorna 45 min después
    }

    // Calcular horas netas
    let horasTrabajadas = (salida - entrada) / 3600000;
    if (conAlmuerzo) horasTrabajadas -= 0.75; // restar 45 min de almuerzo

    return prisma.asistenciaPersonal.create({
      data: {
        personalId,
        fecha: baseDate,
        horaEntrada: entrada,
        horaSalidaAlmuerzo: saliAlm,
        horaEntradaAlmuerzo: entAlm,
        horaSalida: salida,
        horasTrabajadas: parseFloat(horasTrabajadas.toFixed(2)),
      }
    });
  };

  // Carlos: Instructor quincenal — asistencias últimas 2 semanas (lunes a viernes)
  for (let d = 1; d <= 14; d++) {
    await crearAsistencia(carlos.id, d, 8, 17); // 8am - 5pm
  }

  // María: Instructora por hora — asistencias irregulares
  for (let d of [1, 2, 3, 5, 6, 8, 9, 10]) {
    await crearAsistencia(maria.id, d, 9, 14, false); // 9am - 2pm sin almuerzo
  }

  // Juan: Recepcionista — asistencias completas
  for (let d = 1; d <= 12; d++) {
    await crearAsistencia(juan.id, d, 7, 16);
  }

  // Rosa: Limpieza — medio turno
  for (let d of [1, 2, 5, 6, 7, 8]) {
    await crearAsistencia(rosa.id, d, 6, 12, false);
  }

  // Pedro: Administrativo — horario normal
  for (let d = 1; d <= 14; d++) {
    await crearAsistencia(pedro.id, d, 9, 18);
  }

  // Hoy — asistencia abierta (sin salida) para Carlos y Juan
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  await prisma.asistenciaPersonal.create({
    data: {
      personalId: carlos.id,
      fecha: hoy,
      horaEntrada: (() => { const d = new Date(hoy); d.setHours(8, 10, 0); return d; })(),
    }
  });
  await prisma.asistenciaPersonal.create({
    data: {
      personalId: juan.id,
      fecha: hoy,
      horaEntrada: (() => { const d = new Date(hoy); d.setHours(7, 5, 0); return d; })(),
    }
  });

  console.log('✅ Asistencias generadas.\n');

  // =============================================
  // 4. CONSUMOS DE PRODUCTOS
  // =============================================
  console.log('🛒 Registrando consumos...');
  const [agua, gatorade, barra, cafe, whey] = productos;

  await prisma.consumoPersonal.createMany({ data: [
    // Carlos - varios consumos sin pagar
    { personalId: carlos.id, productoPersonalId: agua.id, cantidad: 1, montoTotal: 2.00, fecha: daysAgo(1), pagado: false },
    { personalId: carlos.id, productoPersonalId: whey.id, cantidad: 2, montoTotal: 12.00, fecha: daysAgo(3), pagado: false },
    { personalId: carlos.id, productoPersonalId: gatorade.id, cantidad: 1, montoTotal: 4.50, fecha: daysAgo(5), pagado: false },
    { personalId: carlos.id, productoPersonalId: barra.id, cantidad: 1, montoTotal: 8.00, fecha: daysAgo(7), pagado: false },
    // María - consumos
    { personalId: maria.id, productoPersonalId: agua.id, cantidad: 2, montoTotal: 4.00, fecha: daysAgo(2), pagado: false },
    { personalId: maria.id, productoPersonalId: cafe.id, cantidad: 3, montoTotal: 9.00, fecha: daysAgo(4), pagado: false },
    // Juan - consumos
    { personalId: juan.id, productoPersonalId: agua.id, cantidad: 1, montoTotal: 2.00, fecha: daysAgo(1), pagado: false },
    { personalId: juan.id, productoPersonalId: cafe.id, cantidad: 5, montoTotal: 15.00, fecha: daysAgo(6), pagado: false },
    // Rosa
    { personalId: rosa.id, productoPersonalId: agua.id, cantidad: 1, montoTotal: 2.00, fecha: daysAgo(2), pagado: false },
  ]});
  console.log('✅ Consumos registrados.\n');

  // =============================================
  // 5. ADELANTOS
  // =============================================
  console.log('💰 Registrando adelantos...');
  await prisma.adelantoPersonal.createMany({ data: [
    // Carlos — adelanto APROBADO (listo para descontar en nómina)
    { personalId: carlos.id, monto: 150.00, fecha: daysAgo(8), motivo: 'Pasajes y gastos personales', estado: 'APROBADO', pagado: false },
    // Carlos — adelanto PENDIENTE (esperando aprobación)
    { personalId: carlos.id, monto: 100.00, fecha: daysAgo(1), motivo: 'Emergencia familiar', estado: 'PENDIENTE', pagado: false },
    // María — adelanto PENDIENTE
    { personalId: maria.id, monto: 80.00, fecha: daysAgo(2), motivo: 'Medicamentos', estado: 'PENDIENTE', pagado: false },
    // Juan — adelanto APROBADO
    { personalId: juan.id, monto: 200.00, fecha: daysAgo(5), motivo: 'Reparación de celular', estado: 'APROBADO', pagado: false },
    // Pedro — adelanto RECHAZADO (para que se vea el flujo)
    { personalId: pedro.id, monto: 500.00, fecha: daysAgo(3), motivo: 'Vacaciones', estado: 'RECHAZADO', pagado: false },
  ]});
  console.log('✅ Adelantos registrados.\n');

  // =============================================
  // RESUMEN
  // =============================================
  console.log('═══════════════════════════════════════════');
  console.log('🎉 DATOS DE PRUEBA GENERADOS EXITOSAMENTE');
  console.log('═══════════════════════════════════════════');
  console.log('\n👥 PERSONAL CREADO (códigos de acceso al kiosco):');
  personalCreado.forEach(p => {
    console.log(`   • ${p.nombres} ${p.apellidos} (${p.rol}) → Código: ${p.codigo} | Pago: ${p.metodoPago} S/${p.montoPago}`);
  });
  console.log('\n📦 PRODUCTOS EN CATÁLOGO:');
  productos.forEach(p => console.log(`   • ${p.nombre} → S/ ${p.precio.toFixed(2)}`));
  console.log('\n💰 ADELANTOS PENDIENTES DE APROBACIÓN: 2 (Carlos + María)');
  console.log('\n📅 Rango sugerido para generar pago de Carlos:');
  console.log(`   Inicio: ${daysAgo(14).toISOString().split('T')[0]}`);
  console.log(`   Fin:    ${new Date().toISOString().split('T')[0]}`);
  console.log('\n✅ Usa el código en el kiosco (/kiosco-personal) para probar asistencia en tiempo real.');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
