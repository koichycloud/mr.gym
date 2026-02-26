import { requireAdmin } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { FileText, UserCircle, Calendar, Hash, Activity } from 'lucide-react'

// Dynamic rendering to ensure fresh logs
export const dynamic = 'force-dynamic'

export default async function BitacoraPage() {
    await requireAdmin()

    // Fetch the latest 100 logs
    const logs = await prisma.auditLog.findMany({
        orderBy: { fecha: 'desc' },
        take: 100
    })

    const getActionColor = (action: string) => {
        if (action.includes('LOGIN')) return 'text-info'
        if (action.includes('CREAR') || action.includes('NUEVA')) return 'text-success'
        if (action.includes('EDITAR') || action.includes('RENOVAR')) return 'text-warning'
        if (action.includes('ELIMINAR')) return 'text-error'
        return 'text-base-content'
    }

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex items-center gap-3 mb-8">
                <FileText size={32} className="text-primary" />
                <h1 className="text-4xl font-bold font-heading text-neutral-content">
                    Bitácora de Auditoría
                </h1>
            </div>

            <div className="bg-base-100 rounded-xl shadow-xl overflow-hidden border border-base-200">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-base-200">
                            <tr>
                                <th><Calendar size={16} className="inline mr-2" />Fecha y Hora</th>
                                <th><UserCircle size={16} className="inline mr-2" />Usuario</th>
                                <th><Activity size={16} className="inline mr-2" />Acción</th>
                                <th className="w-1/2">Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-base-200/50 transition-colors">
                                        <td className="whitespace-nowrap opacity-80 text-sm">
                                            {log.fecha.toLocaleDateString()} {log.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="font-bold">
                                            {log.usuario}
                                            {log.usuario.toLowerCase().includes('admin') && (
                                                <span className="badge badge-error badge-xs ml-2">Admin</span>
                                            )}
                                        </td>
                                        <td className={`font-mono font-semibold text-xs ${getActionColor(log.accion)}`}>
                                            {log.accion}
                                        </td>
                                        <td className="text-sm opacity-90 break-words">
                                            {log.detalles || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-base-content/50">
                                        No hay registros en la bitácora aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col divide-y divide-base-200">
                    {logs.length > 0 ? (
                        logs.map((log: any) => (
                            <div key={log.id} className="p-4 space-y-1.5">
                                <div className="flex justify-between items-start gap-2">
                                    <span className={`font-mono font-bold text-xs ${getActionColor(log.accion)}`}>
                                        {log.accion}
                                    </span>
                                    <span className="text-xs opacity-50 whitespace-nowrap shrink-0">
                                        {log.fecha.toLocaleDateString()} {log.fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <UserCircle size={14} className="opacity-50 shrink-0" />
                                    <span className="font-semibold text-sm">{log.usuario}</span>
                                    {log.usuario.toLowerCase().includes('admin') && (
                                        <span className="badge badge-error badge-xs">Admin</span>
                                    )}
                                </div>
                                {log.detalles && (
                                    <p className="text-xs opacity-70 pl-5">{log.detalles}</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-base-content/50">
                            No hay registros en la bitácora aún.
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 text-center text-xs opacity-50">
                Visualizando los últimos 100 eventos del sistema.
            </div>
        </div>
    )
}
