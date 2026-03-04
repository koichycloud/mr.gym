'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, Download, FileText, ArrowLeft, AlertTriangle, Users, Calendar, CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Socio {
    id: string
    codigo: string
    nombres: string
    apellidos: string
    sexo: string
    documento: string
    telefono: string | null
    historialCodigos: { codigo: string; fechaCambio: Date }[]
}

interface Suscripcion {
    id: string
    fechaFin: string | Date
    socio: Socio
}

function getSeverity(days: number) {
    if (days <= 7) return { label: `${days}d`, color: 'badge-warning text-warning-content', icon: '⏱' }
    if (days <= 30) return { label: `${days}d`, color: 'badge-error text-white', icon: '🔴' }
    if (days <= 90) return { label: `${days}d`, color: 'badge-error text-white', icon: '⛔' }
    return { label: `${days}d`, color: 'bg-gray-800 text-white', icon: '💀' }
}

export default function VencidosListClient({ suscripciones }: { suscripciones: Suscripcion[] }) {
    const [search, setSearch] = useState('')
    const [filterDays, setFilterDays] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const filtered = useMemo(() => {
        return suscripciones.filter(sub => {
            const socio = sub.socio
            const days = differenceInDays(today, new Date(sub.fechaFin))
            const searchLower = search.toLowerCase()

            const matchesSearch = !search ||
                socio.nombres.toLowerCase().includes(searchLower) ||
                socio.apellidos.toLowerCase().includes(searchLower) ||
                socio.codigo.toLowerCase().includes(searchLower) ||
                socio.documento?.toLowerCase().includes(searchLower) ||
                socio.telefono?.toLowerCase().includes(searchLower)

            const matchesFilter = filterDays === 'all' ||
                (filterDays === '7' && days <= 7) ||
                (filterDays === '30' && days <= 30) ||
                (filterDays === '90' && days <= 90) ||
                (filterDays === '90+' && days > 90)

            return matchesSearch && matchesFilter
        })
    }, [suscripciones, search, filterDays])

    // Reset page when search or filter changes
    useEffect(() => { setCurrentPage(1) }, [search, filterDays])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const stats = useMemo(() => {
        const total = suscripciones.length
        const week = suscripciones.filter(s => differenceInDays(today, new Date(s.fechaFin)) <= 7).length
        const month = suscripciones.filter(s => differenceInDays(today, new Date(s.fechaFin)) <= 30).length
        const over90 = suscripciones.filter(s => differenceInDays(today, new Date(s.fechaFin)) > 90).length
        return { total, week, month, over90 }
    }, [suscripciones])

    const exportExcel = () => {
        const data = filtered.map(sub => ({
            Código: sub.socio.codigo,
            Nombres: sub.socio.nombres,
            Apellidos: sub.socio.apellidos,
            Sexo: sub.socio.sexo,
            Documento: sub.socio.documento,
            Teléfono: sub.socio.telefono || '',
            'Fecha Vencimiento': format(new Date(sub.fechaFin), 'dd/MM/yyyy'),
            'Días Vencido': differenceInDays(today, new Date(sub.fechaFin))
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Vencidos')
        XLSX.writeFile(wb, `suscripciones_vencidas_${format(today, 'yyyyMMdd')}.xlsx`)
    }

    const exportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Suscripciones Vencidas - Mr. GYM', 14, 20)
        doc.setFontSize(10)
        doc.text(`Fecha: ${format(today, 'dd/MM/yyyy')} | Total: ${filtered.length}`, 14, 28)

        autoTable(doc, {
            startY: 35,
            head: [['Código', 'Socio', 'Documento', 'Teléfono', 'Venció', 'Días']],
            body: filtered.map(sub => [
                sub.socio.codigo,
                `${sub.socio.nombres} ${sub.socio.apellidos}`,
                sub.socio.documento,
                sub.socio.telefono || '-',
                format(new Date(sub.fechaFin), 'dd/MM/yyyy'),
                differenceInDays(today, new Date(sub.fechaFin)).toString()
            ]),
            styles: { fontSize: 8 }
        })
        doc.save(`suscripciones_vencidas_${format(today, 'yyyyMMdd')}.pdf`)
    }

    return (
        <main className="min-h-screen p-4 md:p-8 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/" className="btn btn-ghost btn-sm btn-circle">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            <AlertTriangle className="text-warning" /> Suscripciones Vencidas
                        </h1>
                        <p className="text-sm opacity-60">Socios con suscripciones activas cuya fecha de fin ya pasó</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportExcel} className="btn btn-success btn-sm text-white">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={exportPDF} className="btn btn-error btn-sm text-white">
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4">
                    <div className="stat-title text-xs">Total Vencidos</div>
                    <div className="stat-value text-error text-2xl">{stats.total}</div>
                    <div className="stat-figure text-error"><Users /></div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4">
                    <div className="stat-title text-xs">Esta Semana</div>
                    <div className="stat-value text-warning text-2xl">{stats.week}</div>
                    <div className="stat-figure text-warning"><Calendar /></div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4">
                    <div className="stat-title text-xs">Este Mes</div>
                    <div className="stat-value text-info text-2xl">{stats.month}</div>
                    <div className="stat-figure text-info"><CalendarDays /></div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4">
                    <div className="stat-title text-xs">+90 Días</div>
                    <div className="stat-value text-2xl">{stats.over90}</div>
                    <div className="stat-figure"><Clock /></div>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="bg-base-100 rounded-xl border border-base-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código, DNI o teléfono..."
                            className="input input-bordered w-full pl-10"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {[
                            { key: 'all', label: 'Todos' },
                            { key: '7', label: '≤ 7 días' },
                            { key: '30', label: '≤ 30 días' },
                            { key: '90', label: '≤ 90 días' },
                            { key: '90+', label: '> 90 días' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilterDays(f.key)}
                                className={`btn btn-sm ${filterDays === f.key ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-sm opacity-60 whitespace-nowrap">{filtered.length} resultados</span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-200">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Socio</th>
                            <th className="text-center">Sexo</th>
                            <th>Documento</th>
                            <th>Teléfono</th>
                            <th>Venció</th>
                            <th>Días Vencido</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.map(sub => {
                            const days = differenceInDays(today, new Date(sub.fechaFin))
                            const severity = getSeverity(days)
                            return (
                                <tr key={sub.id} className="hover">
                                    <td className="font-mono text-primary font-bold">{sub.socio.codigo}</td>
                                    <td className="font-bold">{sub.socio.nombres} {sub.socio.apellidos}</td>
                                    <td className="text-center">
                                        <div className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {sub.socio.sexo}
                                        </div>
                                    </td>
                                    <td className="text-sm">{sub.socio.documento}</td>
                                    <td>{sub.socio.telefono || '-'}</td>
                                    <td className="text-error font-semibold">{format(new Date(sub.fechaFin), 'dd/MM/yyyy')}</td>
                                    <td>
                                        <div className={`badge ${severity.color} gap-1`}>
                                            {severity.icon} {severity.label}
                                        </div>
                                    </td>
                                    <td>
                                        <Link href={`/socios/${sub.socio.id}`} className="btn btn-ghost btn-xs btn-circle">
                                            👁
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 opacity-60">
                        <AlertTriangle size={48} className="mx-auto mb-4" />
                        <p className="text-lg font-semibold">No se encontraron resultados</p>
                        <p>Prueba con otro término de búsqueda o filtro</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 bg-base-100 rounded-xl border border-base-200 p-3">
                    <span className="text-sm opacity-60">
                        Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
                    </span>
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .reduce<(number | string)[]>((acc, p, i, arr) => {
                                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                                acc.push(p)
                                return acc
                            }, [])
                            .map((p, i) =>
                                typeof p === 'string' ? (
                                    <button key={`ellipsis-${i}`} className="join-item btn btn-sm btn-disabled">…</button>
                                ) : (
                                    <button
                                        key={p}
                                        className={`join-item btn btn-sm ${currentPage === p ? 'btn-primary' : ''}`}
                                        onClick={() => setCurrentPage(p)}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            className="join-item btn btn-sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}
