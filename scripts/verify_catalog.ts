import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function verifyCatalog() {
  console.log("==================================================================")
  console.log("MR. GYM — VERIFICACIÓN INTEGRAL DEL CATÁLOGO DE EJERCICIOS")
  console.log("==================================================================\n")

  const total = await prisma.ejercicio.count()
  const todos = await prisma.ejercicio.findMany({
    orderBy: [{ grupoMuscular: "asc" }, { nombre: "asc" }],
  })

  console.log(`1. TOTAL DE EJERCICIOS EN BASE DE DATOS: ${total}`)

  // Verificación de duplicados
  const nombres = todos.map(e => e.nombre.toLowerCase())
  const nombresSet = new Set(nombres)
  const hayDuplicados = nombres.length !== nombresSet.size
  console.log(`2. VERIFICACIÓN DE UNICIDAD: ${!hayDuplicados ? "✅ 0 Duplicados (Todos los nombres son únicos)" : "❌ ERROR: Hay duplicados"}`)

  // Conteo por Grupo Muscular
  const porGrupo: Record<string, number> = {}
  todos.forEach(e => {
    porGrupo[e.grupoMuscular] = (porGrupo[e.grupoMuscular] || 0) + 1
  })
  console.log("\n3. DISTRIBUCIÓN POR GRUPO MUSCULAR:")
  Object.entries(porGrupo).forEach(([grupo, cant]) => {
    console.log(`   - ${grupo}: ${cant} ejercicios`)
  })

  // Conteo por Nivel
  const porNivel: Record<string, number> = {}
  todos.forEach(e => {
    porNivel[e.nivel] = (porNivel[e.nivel] || 0) + 1
  })
  console.log("\n4. DISTRIBUCIÓN POR NIVEL:")
  Object.entries(porNivel).forEach(([nivel, cant]) => {
    console.log(`   - ${nivel}: ${cant} ejercicios`)
  })

  // Conteo por Equipamiento
  const porEquip: Record<string, number> = {}
  todos.forEach(e => {
    porEquip[e.equipamientoRequerido] = (porEquip[e.equipamientoRequerido] || 0) + 1
  })
  console.log("\n5. DISTRIBUCIÓN POR EQUIPAMIENTO:")
  Object.entries(porEquip).forEach(([eq, cant]) => {
    console.log(`   - ${eq}: ${cant} ejercicios`)
  })

  // Conteo por Tipo
  const porTipo: Record<string, number> = {}
  todos.forEach(e => {
    porTipo[e.tipoEjercicio] = (porTipo[e.tipoEjercicio] || 0) + 1
  })
  console.log("\n6. DISTRIBUCIÓN POR TIPO:")
  Object.entries(porTipo).forEach(([t, cant]) => {
    console.log(`   - ${t}: ${cant} ejercicios`)
  })

  // Verificación específica de los 4 ejercicios corregidos
  console.log("\n7. VERIFICACIÓN DE EJERCICIOS CON REVISIÓN TÉCNICA:")
  const criticos = [
    "Face Pull en Polea Alta",
    "Dead Bug (Bicho Muerto)",
    "Bird-Dog (Pájaro-Perro)",
    "Farmer’s Walk (Paseo del Granjero)",
  ]

  for (const nombre of criticos) {
    const ej = await prisma.ejercicio.findUnique({ where: { nombre } })
    if (ej) {
      console.log(`   ✅ [${ej.nombre}]`)
      console.log(`      - Grupo: ${ej.grupoMuscular} (Secundario: ${ej.grupoMuscularSecundario})`)
      console.log(`      - Nivel: ${ej.nivel} | Tipo: ${ej.tipoEjercicio} | Equipamiento: ${ej.equipamientoRequerido}`)
      console.log(`      - Restricciones: ${ej.restricciones}`)
    } else {
      console.log(`   ❌ ERROR: No se encontró "${nombre}"`)
    }
  }

  // Verificación de los 2 ejercicios preexistentes
  console.log("\n8. CONSERVACIÓN DE EJERCICIOS HISTÓRICOS PREEXISTENTES:")
  const hist1 = await prisma.ejercicio.findUnique({ where: { id: "e86aa66c-19a2-4f6f-aa8c-a14fbc029ed0" } })
  const hist2 = await prisma.ejercicio.findUnique({ where: { id: "ef4930d7-be4e-442c-aa12-c2640d654553" } })
  console.log(`   - Ejercicio Histórico 1 (ID: ${hist1?.id}): ${hist1 ? "✅ CONSERVADO (" + hist1.nombre + ")" : "❌ PERDIDO"}`)
  console.log(`   - Ejercicio Histórico 2 (ID: ${hist2?.id}): ${hist2 ? "✅ CONSERVADO (" + hist2.nombre + ")" : "❌ PERDIDO"}`)
}

verifyCatalog()
  .then(() => prisma.$disconnect())
  .catch(console.error)
