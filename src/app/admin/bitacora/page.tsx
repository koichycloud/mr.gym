import { requireAdmin } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { FileText, UserCircle, Calendar, Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'

// Dynamic rendering to ensure fresh logs
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

/** Format a UTC date as dd/MM/yyyy HH:mm in Lima time (UTC-5) */
function formatLimaDateTime(date: Date): string {
    const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000
    const limaDate = new Date(date.getTime() - LIMA_OFFSET_MS)
    const dd = String(limaDate.getUTCDate()).padStart(2, '0')
    const mm = String(limaDate.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = limaDate.getUTCFullYear()
    const hh = String(limaDate.getUTCHours()).padStart(2, '0')
    const min = String(limaDate.getUTCMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export default async function BitacoraPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; q?: string }>
}) {
    await requireAdmin()
    const { page, q } = await searchParams
    const currentPage = parseInt(page || '1')
    const searchQuery = q || ''

    const where = searchQuery ? {
        OR: [
            { usuario: { contains: searchQuery, mode: 'insensitive' as const } },
            { accion: { contains: searchQuery, mode: 'insensitive' as const } },
            { detalles: { contains: searchQuery, mode: 'insensitive' as const } },
        ]
    } : {}

    // Fetch logs with pagination
    const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            take: PAGE_SIZE,
            skip: (currentPage - 1) * PAGE_SIZE,
            orderBy: { fecha: 'desc' }
        }),
        prisma.auditLog.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    const getActionColor = (action: string) => {
        if (action.includes('LOGIN')) return 'text-info'
        if (action.includes('CREAR') || action.includes('NUEVA')) return 'text-success'
        if (action.includes('EDITAR') || action.includes('RENOVAR')) return 'text-warning'
        if (action.includes('ELIMINAR')) return 'text-error'
        return 'text-base-content'
    }

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <FileText size={32} className="text-primary" />
                    <h1 className="text-4xl font-bold font-heading text-neutral-content">
                        Bitácora de Auditoría
                    </h1>
                </div>

                <form className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
                    <input 
                        type="text" 
                        name="q"
                        defaultValue={searchQuery}
                        placeholder="Buscar en bitácora..." 
                        className="input input-bordered w-full pl-10 bg-base-200"
                    />
                </form>
            </div>

            <div className="bg-base-100 rounded-xl shadow-xl overflow-hidden border border-base-200">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-base-200">
                            <tr>
                                <th><Calendar size={16} className="inline mr-2" />Fecha y Hora (Lima)</th>
                                <th><UserCircle size={16} className="inline mr-2" />Usuario</th>
                                <th><Activity size={16} className="inline mr-2" />Acción</th>
                                <th className="w-1/2">Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-base-200/50 transition-colors">
                                        <td className="whitespace-nowrap opacity-80 text-sm font-mono">
                                            {formatLimaDateTime(log.fecha)}
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
                                        No hay registros que coincidan con la búsqueda.
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
                                    <span className="text-xs opacity-50 whitespace-nowrap shrink-0 font-mono">
                                        {formatLimaDateTime(log.fecha)}
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
                            No hay registros que coincidan con la búsqueda.
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                    <Link 
                        href={`/admin/bitacora?page=${currentPage - 1}${q ? `&q=${q}` : ''}`}
                        className={`btn btn-sm btn-outline gap-1 ${currentPage <= 1 ? 'btn-disabled' : ''}`}
                    >
                        <ChevronLeft size={16} /> Anterior
                    </Link>
                    
                    <span className="text-sm font-bold opacity-60">
                        Página {currentPage} de {totalPages}
                    </span>

                    <Link 
                        href={`/admin/bitacora?page=${currentPage + 1}${q ? `&q=${q}` : ''}`}
                        className={`btn btn-sm btn-outline gap-1 ${currentPage >= totalPages ? 'btn-disabled' : ''}`}
                    >
                        Siguiente <ChevronRight size={16} />
                    </Link>
                </div>
            )}

            <div className="mt-4 text-center text-xs opacity-50">
                Mostrando {logs.length} de {totalCount} eventos del sistema · Hora: Lima (UTC-5)
            </div>
        </div>
    )
}
