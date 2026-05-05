'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, ArrowLeft, Eye, Edit, Clock, FileDown, FileText, Trash2, XCircle } from 'lucide-react'
import { differenceInMonths, differenceInDays, differenceInWeeks, format } from 'date-fns'
import * as XLSX from 'xlsx'
import { deleteSocio, exportSocios } from '@/app/actions/socios'
import { useRouter } from 'next/navigation'
import { generatePDFReport } from '@/lib/pdf-utils'

interface Props {
    initialSocios: any[]
    isAdmin: boolean
    totalCount: number
    totalPages: number
    currentPage: number
    currentSearch: string
    currentFilter: 'all' | 'expiring' | 'vencidos'
}

export default function SociosListClient({
    initialSocios,
    isAdmin,
    totalCount,
    totalPages,
    currentPage,
    currentSearch,
    currentFilter,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isDeleting, setIsDeleting] = useState(false)
    const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null)
    const [searchInput, setSearchInput] = useState(currentSearch)
    const [isExporting, setIsExporting] = useState(false)

    const navigate = useCallback((page: number, q: string, filter: string) => {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (filter !== 'all') params.set('filter', filter)
        if (page > 1) params.set('page', String(page))
        startTransition(() => {
            router.push(`/socios?${params.toString()}`)
        })
    }, [router])

    const handleSearch = useCallback((value: string) => {
        setSearchInput(value)
        navigate(1, value, currentFilter)
    }, [navigate, currentFilter])

    const handleFilterChange = (filter: 'all' | 'expiring' | 'vencidos') => {
        navigate(1, currentSearch, filter)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al socio ${name}? Esta acción no se puede deshacer.`)) return
        setIsDeleting(true)
        try {
            const result = await deleteSocio(id)
            if (result.success) {
                router.refresh()
            } else {
                alert(result.error || 'Error al eliminar socio')
            }
        } catch {
            alert('Error al procesar la solicitud')
        } finally {
            setIsDeleting(false)
        }
    }

    const exportToExcel = async () => {
        setIsExporting(true)
        try {
            const data = await exportSocios({ search: currentSearch, filterType: currentFilter })
            const dataToExport = data.map((s: any) => ({
                Código: s.codigo,
                Nombres: s.nombres,
                Apellidos: s.apellidos,
                Documento: `${s.tipoDocumento} ${s.numeroDocumento}`,
                Teléfono: s.telefono || '',
                'Fecha Registro': format(new Date(s.createdAt), 'dd/MM/yyyy'),
            }))
            const ws = XLSX.utils.json_to_sheet(dataToExport)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Socios')
            XLSX.writeFile(wb, 'socios_mr_gym.xlsx')
        } finally {
            setIsExporting(false)
        }
    }

    const exportToPDF = async () => {
        setIsExporting(true)
        try {
            const data = await exportSocios({ search: currentSearch, filterType: currentFilter })
            const columns = ['Código', 'Nombres', 'Apellidos', 'Documento', 'Suscripción']
            const rows = data.map((s: any) => [
                s.codigo,
                s.nombres,
                s.apellidos,
                `${s.tipoDocumento} ${s.numeroDocumento}`,
                s.suscripciones?.[0] ? format(new Date(s.suscripciones[0].fechaFin), 'dd/MM/yyyy') : 'Sin suscripción',
            ])
            let subtitle = 'Listado General de Socios'
            if (currentFilter === 'expiring') subtitle = 'Socios Próximos a Vencer (Próximos 7 días)'
            if (currentFilter === 'vencidos') subtitle = 'Socios con Suscripción Vencida'
            generatePDFReport({ title: 'Reporte de Socios', subtitle, columns, rows, fileName: `socios_${currentFilter}` })
        } finally {
            setIsExporting(false)
        }
    }

    const getRemainingTime = (socio: any) => {
        const activeSub = socio.suscripciones?.[0]
        if (!activeSub) return <span className="badge badge-ghost">Sin suscripción</span>
        const today = new Date()
        const endDate = new Date(activeSub.fechaFin)
        if (endDate < today) return <span className="badge badge-error">Vencida</span>
        const months = differenceInMonths(endDate, today)
        const daysTotal = differenceInDays(endDate, today)
        if (months > 0) {
            const extraDays = daysTotal - months * 30
            return (
                <div className="flex flex-col text-sm">
                    <span className="font-bold text-success">{months} meses</span>
                    {extraDays > 0 && <span className="text-xs opacity-60">{extraDays} días</span>}
                </div>
            )
        }
        const weeks = differenceInWeeks(endDate, today)
        if (weeks > 0) {
            const extraDays = daysTotal - weeks * 7
            return (
                <div className="flex flex-col text-sm">
                    <span className="font-bold text-warning">{weeks} semanas</span>
                    {extraDays > 0 && <span className="text-xs opacity-60">{extraDays} días</span>}
                </div>
            )
        }
        return <span className="font-bold text-error">{daysTotal} días</span>
    }

    return (
        <div className="min-h-screen bg-transparent p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="btn btn-ghost btn-circle">
                            <ArrowLeft />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Socios</h1>
                            <p className="text-sm opacity-50">{totalCount} socios encontrados</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportToExcel} disabled={isExporting} className="btn btn-success text-white btn-sm md:btn-md">
                            {isExporting ? <span className="loading loading-spinner loading-xs" /> : <FileDown size={18} />} Excel
                        </button>
                        <button onClick={exportToPDF} disabled={isExporting} className="btn btn-error text-white btn-sm md:btn-md">
                            {isExporting ? <span className="loading loading-spinner loading-xs" /> : <FileText size={18} />} PDF
                        </button>
                        <Link href="/socios/nuevo" className="btn btn-primary btn-sm md:btn-md">
                            <Plus className="w-5 h-5 mr-1" />
                            Nuevo Socio
                        </Link>
                    </div>
                </div>

                <div className="bg-base-100 rounded-xl shadow-xl overflow-hidden">
                    {/* Search + Filter Bar */}
                    <div className="p-4 border-b border-base-200 flex flex-col gap-3">
                        <div className="relative w-full max-w-md">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search size={20} className="text-base-content/50" />
                            </span>
                            <input
                                className={`input input-bordered w-full pl-10 ${isPending ? 'opacity-60' : ''}`}
                                placeholder="Buscar por nombre, DNI o código..."
                                value={searchInput}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {isPending && (
                                <span className="absolute inset-y-0 right-3 flex items-center">
                                    <span className="loading loading-spinner loading-xs text-primary" />
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleFilterChange('all')}
                                className={`btn btn-xs md:btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                            >Todos</button>
                            <button
                                onClick={() => handleFilterChange('expiring')}
                                className={`btn btn-xs md:btn-sm ${currentFilter === 'expiring' ? 'btn-warning' : 'btn-ghost'}`}
                            >Por Vencer (7d)</button>
                            <button
                                onClick={() => handleFilterChange('vencidos')}
                                className={`btn btn-xs md:btn-sm ${currentFilter === 'vencidos' ? 'btn-error' : 'btn-ghost'}`}
                            >Vencidos</button>
                        </div>
                    </div>

                    <div className={`bg-base-100 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                        {/* Desktop Table */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Nombre</th>
                                        <th className="w-10 text-center">Sexo</th>
                                        <th>Documento</th>
                                        <th>Suscripción</th>
                                        <th>Teléfono</th>
                                        <th className="text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {initialSocios.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-gray-500">
                                                No se encontraron socios.
                                            </td>
                                        </tr>
                                    ) : (
                                        initialSocios.map((socio) => (
                                            <tr key={socio.id} className="hover">
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-mono font-bold text-primary">{socio.codigo}</span>
                                                        {socio.historialCodigos?.length > 0 && (
                                                            <div className="flex items-center gap-1 text-[10px] opacity-40 font-mono">
                                                                <Clock size={10} />
                                                                {socio.historialCodigos.slice(0, 2).map((h: any, i: number) => (
                                                                    <span key={h.id}>{i > 0 && ' ← '}{h.codigo}</span>
                                                                ))}
                                                                {socio.historialCodigos.length > 2 && ' ...'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        {socio.fotoUrl ? (
                                                            <div
                                                                className="avatar cursor-pointer hover:scale-110 transition-transform"
                                                                onClick={() => setViewingPhoto({ url: socio.fotoUrl, name: `${socio.nombres} ${socio.apellidos}` })}
                                                            >
                                                                <div className="w-10 h-10 rounded-full shadow-sm">
                                                                    <img src={socio.fotoUrl} alt="Avatar" className="object-cover" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="avatar placeholder">
                                                                <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                                                                    <span className="text-lg font-bold">{socio.nombres?.[0] || 'S'}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold">{socio.nombres} {socio.apellidos}</div>
                                                            <div className="text-xs opacity-50">
                                                                Edad: {new Date().getFullYear() - new Date(socio.fechaNacimiento).getFullYear()} años
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <div translate="no" className={`notranslate w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                                                        {socio.sexo === 'F' ? 'F' : 'M'}
                                                    </div>
                                                </td>
                                                <td>{socio.tipoDocumento} {socio.numeroDocumento}</td>
                                                <td>{getRemainingTime(socio)}</td>
                                                <td>{socio.telefono || '-'}</td>
                                                <td className="text-right space-x-2">
                                                    <Link href={`/socios/${socio.id}`} className="btn btn-sm btn-circle btn-ghost" title="Ver detalle">
                                                        <Eye size={18} />
                                                    </Link>
                                                    <Link href={`/socios/${socio.id}/editar`} className="btn btn-sm btn-circle btn-ghost" title="Editar">
                                                        <Edit size={18} />
                                                    </Link>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleDelete(socio.id, `${socio.nombres} ${socio.apellidos}`)}
                                                            className="btn btn-sm btn-circle btn-ghost text-error"
                                                            title="Eliminar"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden flex flex-col gap-3 p-4 bg-base-200/50">
                            {initialSocios.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-base-100 rounded-xl shadow-sm">
                                    No se encontraron socios.
                                </div>
                            ) : (
                                initialSocios.map((socio) => (
                                    <div key={socio.id} className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3 flex-1">
                                                {socio.fotoUrl ? (
                                                    <div
                                                        className="avatar cursor-pointer hover:scale-110 transition-transform"
                                                        onClick={() => setViewingPhoto({ url: socio.fotoUrl, name: `${socio.nombres} ${socio.apellidos}` })}
                                                    >
                                                        <div className="w-10 h-10 rounded-full shadow-sm">
                                                            <img src={socio.fotoUrl} alt="Avatar" className="object-cover" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="avatar placeholder">
                                                        <div className="bg-neutral text-neutral-content rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
                                                            <span className="text-lg font-bold">{socio.nombres?.[0] || 'S'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-lg leading-tight">{socio.nombres} {socio.apellidos}</div>
                                                    <div className="text-xs opacity-60 mt-1 flex items-center gap-2">
                                                        <span>{socio.tipoDocumento} {socio.numeroDocumento}</span>
                                                        <span>•</span>
                                                        <span>{new Date().getFullYear() - new Date(socio.fechaNacimiento).getFullYear()} años</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <span className="font-mono font-bold text-primary block text-lg bg-primary/10 px-2 rounded">{socio.codigo}</span>
                                                {socio.historialCodigos?.length > 0 && (
                                                    <div className="flex items-center justify-end gap-1 text-[9px] opacity-40 font-mono mt-0.5">
                                                        <Clock size={9} />
                                                        {socio.historialCodigos.slice(0, 2).map((h: any, i: number) => (
                                                            <span key={h.id}>{i > 0 && ' ← '}{h.codigo}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-base-200 pt-3">
                                            <div>
                                                <div className="text-[10px] uppercase font-bold opacity-50 mb-1">Membresía</div>
                                                {getRemainingTime(socio)}
                                            </div>
                                            <div className="flex space-x-2">
                                                <Link href={`/socios/${socio.id}`} className="btn btn-sm btn-circle btn-ghost bg-base-200"><Eye size={16} /></Link>
                                                <Link href={`/socios/${socio.id}/editar`} className="btn btn-sm btn-circle btn-ghost bg-base-200"><Edit size={16} /></Link>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete(socio.id, `${socio.nombres} ${socio.apellidos}`)}
                                                        className="btn btn-sm btn-circle btn-ghost bg-error/10 text-error"
                                                        disabled={isDeleting}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center p-6 border-t border-base-200">
                                <div className="join shadow-sm">
                                    <button
                                        className="join-item btn btn-sm bg-base-200 hover:bg-base-300 border-none"
                                        onClick={() => navigate(currentPage - 1, currentSearch, currentFilter)}
                                        disabled={currentPage <= 1 || isPending}
                                    >« Anterior</button>
                                    <button className="join-item btn btn-sm bg-base-100 pointer-events-none border-none">
                                        Página {currentPage} de {totalPages}
                                    </button>
                                    <button
                                        className="join-item btn btn-sm bg-base-200 hover:bg-base-300 border-none"
                                        onClick={() => navigate(currentPage + 1, currentSearch, currentFilter)}
                                        disabled={currentPage >= totalPages || isPending}
                                    >Siguiente »</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Photo Zoom Modal */}
            {viewingPhoto && (
                <div className="modal modal-open z-[9999]" onClick={() => setViewingPhoto(null)}>
                    <div className="modal-box p-0 bg-transparent shadow-none max-w-4xl w-auto overflow-visible relative" onClick={e => e.stopPropagation()}>
                        <button
                            className="btn btn-circle btn-sm absolute -top-10 right-0 md:-right-10 bg-base-100 border-none shadow-lg"
                            onClick={() => setViewingPhoto(null)}
                        >
                            <XCircle size={24} />
                        </button>
                        <img
                            src={viewingPhoto.url}
                            alt="Foto ampliada"
                            className="max-h-[85vh] w-auto mx-auto rounded-2xl shadow-2xl border-4 border-white/10 ring-1 ring-white/20"
                        />
                        <div className="text-center mt-4 text-white font-bold text-lg drop-shadow-lg">
                            {viewingPhoto.name}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
