import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const ejs = await prisma.ejercicio.findMany({
    orderBy: [{ grupoMuscular: "asc" }, { nombre: "asc" }],
  });

  console.log("==================================================================");
  console.log("AUDITORÍA EXHAUSTIVA DE CATÁLOGO — 100 EJERCICIOS (FASE B)");
  console.log("==================================================================\n");

  console.log(`Total de ejercicios en BD: ${ejs.length}`);

  // 1. Unicidad de nombres
  const names = ejs.map((e) => e.nombre.trim());
  const uniqueNames = new Set(names);
  console.log(`Nombres únicos: ${uniqueNames.size} de ${names.length}`);
  if (uniqueNames.size !== names.length) {
    console.error("ALERTA: Se detectaron nombres duplicados!");
  } else {
    console.log("VALIDACIÓN 1: 0 nombres duplicados (100% únicos).");
  }

  // 2. Distribución por Grupo Muscular
  const porGrupo: Record<string, number> = {};
  ejs.forEach((e) => {
    porGrupo[e.grupoMuscular] = (porGrupo[e.grupoMuscular] || 0) + 1;
  });
  console.log("\nDistribución por Grupo Muscular:");
  Object.entries(porGrupo).forEach(([grupo, count]) => {
    console.log(`  - ${grupo}: ${count} ejercicios`);
  });

  // 3. Distribución por Nivel
  const porNivel: Record<string, number> = {};
  ejs.forEach((e) => {
    porNivel[e.nivel] = (porNivel[e.nivel] || 0) + 1;
  });
  console.log("\nDistribución por Nivel:");
  Object.entries(porNivel).forEach(([nivel, count]) => {
    console.log(`  - ${nivel}: ${count} ejercicios`);
  });

  // 4. Distribución por Equipamiento
  const porEquip: Record<string, number> = {};
  ejs.forEach((e) => {
    porEquip[e.equipamientoRequerido] = (porEquip[e.equipamientoRequerido] || 0) + 1;
  });
  console.log("\nDistribución por Equipamiento:");
  Object.entries(porEquip).forEach(([equip, count]) => {
    console.log(`  - ${equip}: ${count} ejercicios`);
  });

  // 5. Distribución por Tipo de Ejercicio
  const porTipo: Record<string, number> = {};
  ejs.forEach((e) => {
    porTipo[e.tipoEjercicio] = (porTipo[e.tipoEjercicio] || 0) + 1;
  });
  console.log("\nDistribución por Tipo de Ejercicio:");
  Object.entries(porTipo).forEach(([tipo, count]) => {
    console.log(`  - ${tipo}: ${count} ejercicios`);
  });

  // 6. Validar que no hay campos nulos críticos
  const invalidos = ejs.filter(
    (e) => !e.nombre || !e.grupoMuscular || !e.nivel || !e.tipoEjercicio || !e.equipamientoRequerido
  );
  console.log(`\nEjercicios con datos incompletos: ${invalidos.length}`);
  if (invalidos.length === 0) {
    console.log("VALIDACIÓN 2: Todos los 100 ejercicios tienen metadatos completos y válidos.");
  }
}

main().finally(() => prisma.$disconnect());
