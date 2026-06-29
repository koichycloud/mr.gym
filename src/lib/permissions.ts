export const SYSTEM_PERMISSIONS = [
    { id: 'SOCIOS_VER', label: 'Ver Socios', description: 'Permite ver el listado y perfiles de socios.' },
    { id: 'SOCIOS_EDITAR', label: 'Editar Socios', description: 'Permite crear y modificar datos de socios.' },
    { id: 'SOCIOS_ELIMINAR', label: 'Eliminar Socios', description: 'Permite borrar socios del sistema.' },
    { id: 'PLANES_GESTIONAR', label: 'Gestionar Planes', description: 'Permite crear/editar tipos de planes y precios.' },
    { id: 'CAJA_VER', label: 'Ver Caja', description: 'Permite ver movimientos de caja y reportes financieros.' },
    { id: 'ASISTENCIA_REPORTE', label: 'Reporte Asistencia', description: 'Permite ver el historial completo de ingresos.' },
    { id: 'USUARIOS_GESTIONAR', label: 'Gestionar Usuarios', description: 'Permite crear/editar permisos de otros usuarios.' },
    { id: 'PERSONAL_VER', label: 'Ver Personal', description: 'Permite ver el listado y perfiles del personal.' },
    { id: 'PERSONAL_EDITAR', label: 'Editar Personal', description: 'Permite registrar, modificar y desactivar personal.' },
    { id: 'NOMINA_VER', label: 'Ver Nómina', description: 'Permite ver nóminas, pagos y adelantos del personal.' },
    { id: 'NOMINA_EDITAR', label: 'Gestionar Nómina', description: 'Permite registrar pagos, adelantos y procesar nóminas.' },
    { id: 'BITACORA_VER', label: 'Ver Bitácora', description: 'Permite visualizar la bitácora de auditoría del sistema.' },
    { id: 'PRODUCTOS_PERSONAL', label: 'Gestionar Productos Personal', description: 'Permite gestionar productos del personal y sus consumos.' },
] as const;

export type SystemPermission = typeof SYSTEM_PERMISSIONS[number]['id'];

