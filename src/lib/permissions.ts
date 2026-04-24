export const SYSTEM_PERMISSIONS = [
    { id: 'SOCIOS_VER', label: 'Ver Socios', description: 'Permite ver el listado y perfiles de socios.' },
    { id: 'SOCIOS_EDITAR', label: 'Editar Socios', description: 'Permite crear y modificar datos de socios.' },
    { id: 'SOCIOS_ELIMINAR', label: 'Eliminar Socios', description: 'Permite borrar socios del sistema.' },
    { id: 'PLANES_GESTIONAR', label: 'Gestionar Planes', description: 'Permite crear/editar tipos de planes y precios.' },
    { id: 'CAJA_VER', label: 'Ver Caja', description: 'Permite ver movimientos de caja y reportes financieros.' },
    { id: 'ASISTENCIA_REPORTE', label: 'Reporte Asistencia', description: 'Permite ver el historial completo de ingresos.' },
    { id: 'USUARIOS_GESTIONAR', label: 'Gestionar Usuarios', description: 'Permite crear/editar permisos de otros usuarios.' },
] as const;

export type SystemPermission = typeof SYSTEM_PERMISSIONS[number]['id'];
