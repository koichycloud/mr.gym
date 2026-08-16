# MR. GYM — DOCUMENTACIÓN DEL MÓDULO DE PLANIFICACIÓN PERSONALIZADA E IA

## 1. Propósito del Módulo
El Módulo de Planificación Personalizada, Entrenamiento, Nutrición e IA de Mr. Gym tiene como objetivo brindar herramientas avanzadas al personal autorizado del gimnasio (entrenadores y administradores) para diseñar, supervisar, adaptar y documentar planes de entrenamiento físico y sugerencias de alimentación personalizadas de alta calidad.

---

## 2. Alcance
- **Sistema Cerrado e Interno**: El módulo está diseñado para operar estrictamente dentro del panel administrativo de Mr. Gym.
- **Acceso Exclusivo**: Utilizado únicamente por el personal del gimnasio.
- **El Socio**: El socio es el objeto de gestión dentro del sistema y no posee cuenta, login ni acceso directo a la plataforma.

---

## 3. Usuarios Autorizados
- **Roles Permitidos**: `ADMIN`, `SUPERADMIN` o personal autorizado con el permiso explícito server-side `PLANES_PERSONALIZADOS_GESTIONAR`.
- **Entrenadores / Instructores**: Personal registrado con rol de instructor/entrenador asignado a la supervisión física del socio.

---

## 4. Flujo Operativo Canónico
1. **Creación del Perfil Deportivo**: Registro de nivel físico, experiencia, disponibilidad horaria y equipamiento.
2. **Estructuración de Objetivos**: Registro de objetivo principal y secundario del socio.
3. **Salud y Restricciones**: Declaración de lesiones, dolencias, alergias alimentarias y alimentos evitados.
4. **Asignación de Entrenador**: Vinculación oficial del entrenador responsable y sus horarios disponibles.
5. **Biblioteca de Ejercicios**: Selección e integración de ejercicios validados por grupo muscular y nivel.
6. **Generación Asistida por IA**: Solicitud de propuesta asistida mediante el motor de IA (`GeneracionIA`).
7. **Validación Zod & Safety Evaluator**: Inspección automatizada de la propuesta y evaluación de banderas de salud.
8. **Revisión Humana Obligatoria (Human-in-the-loop)**: Inspección técnica por parte del entrenador responsable.
9. **Aprobación & Materialización**: Creación de los planes activos de Entrenamiento ($V+1$) y Alimentación ($V+1$).
10. **Archivado Inmutable**: Desactivación y archivado inmutable de la versión anterior ($V$).
11. **Seguimiento & Adherencia**: Registro de evaluaciones físicas (`MedidaFisica`) y asistencias reales (`Asistencia`).
12. **Exportación PDF & Impresión**: Generación de documentos oficiales A4 e impresión física.
13. **Trazabilidad en AuditLog**: Registro inmutable de cada acción operativa.

---

## 5. Uso del Motor de IA
- **Rol Asistencial**: La IA opera estrictamente como un asistente de borrador para agilizar la labor del entrenador.
- **Structured Output**: El output generado se valida bajo esquemas Zod deterministas (`planningAIOutputSchema`), garantizando 6 niveles progresivos de entrenamiento y $\ge 20$ recetas organizadas por momentos de comida.
- **Mock Provider Activo**: El motor funciona de forma predeterminada con `AI_PROVIDER="mock"`, sin requerir credenciales ni API keys externas.

---

## 6. Revisión Humana (Human-in-the-Loop)
- **Control de Salud**: `requiresHumanReview: true` se activa automáticamente si se detectan lesiones, alergias o restricciones.
- **Confirmación Obligatoria**: La Server Action `aprobarGeneracionIA` exige la bandera server-side `confirmacionRevisionHumana: true` para materializar la propuesta. Ninguna generación de IA se activa automáticamente en la base de datos.

---

## 7. Seguridad y Privacidad
- **Validación Server-Side**: Verificación de permisos y roles en el backend mediante `requirePermission`.
- **Protección IDOR**: Verificación estricta de pertenencia de planes y socios para evitar accesos no autorizados.
- **Aislamiento de Secretos**: Exclusión total de contraseñas, tokens, variables de entorno, prompts e `inputSnapshot` en respuestas y PDFs.

---

## 8. Versionado e Inmutabilidad
- **Patrón $V+1$**: Cada nueva aprobación incrementa el número de versión ($V \rightarrow V+1$).
- **Archivado Inmutable**: Las versiones previas pasan a `activo: false` y `estado: "ARCHIVADO"`. Permanece prohibido alterar el contenido de una versión histórica.
- **Máximo 1 Plan Activo**: Se garantiza server-side que cada socio tenga como máximo 1 plan activo por tipo (entrenamiento / alimentación).

---

## 9. Seguimiento y Evolución Física
- **Evaluación Física**: Registro de peso, porcentaje de grasa y masa muscular en `MedidaFisica`.
- **Reevaluación Diagnóstica**: Cálculo automatizado de días transcurridos para recomendar reevaluaciones si han pasado $>45$ días desde la última medición.
- **Adherencia**: Monitoreo basado en datos reales de asistencia del socio a las instalaciones del gimnasio.

---

## 10. Recomendaciones Nutricionales (Disclaimers)
- **Naturaleza Orientativa**: Las pautas y recetas de alimentación son estrictamente orientativas para apoyar el entrenamiento deportivo.
- **No es Prescripción Médica**: El sistema no realiza diagnósticos clínicos, no prescribe dietas terapéuticas ni sustituye la consulta médica o nutricional especializada.

---

## 11. Exportación PDF e Impresión
- **Documentación Canónica**: Generación de archivos PDF A4 (`%PDF-`) mediante `jsPDF` y `jspdf-autotable`.
- **Sanitización**: Nombres de archivo desinfectados con `sanitizeFilename` para prevenir Path Traversal (`../`).
- **Versiones Históricas**: Los documentos de planes archivados exhiben claramente el distintivo `"DOCUMENTO DE VERSIÓN HISTÓRICA — PLAN INACTIVO"`.

---

## 12. Trazabilidad en AuditLog
- **Registro Canónico**: AuditLog inmutable para las acciones `GENERAR_PLAN_IA`, `APROBAR_PLAN_IA`, `RECHAZAR_PLAN_IA`, `ARCHIVAR_GENERACION_IA` y `EXPORTAR_PLAN_PDF`.

---

## 13. Limitaciones Operativas y Exenciones
- El sistema es una herramienta tecnológica de gestión deportiva para el personal del gimnasio.
- Toda recomendación de entrenamiento y nutrición debe ser validada por el profesional a cargo antes de ser entregada al socio.

---

## 14. Funcionalidades Fuera de Alcance
Las siguientes características permanecen intencionalmente fuera de alcance de este módulo:
- Caja, Inventario, POS, Ventas, Compras, Facturación, Contabilidad, CRM, ERP.
- Portal del Socio, Login de Socio, Autoservicio y App Móvil del Socio.
- Integraciones médicas o clínicas externas.
