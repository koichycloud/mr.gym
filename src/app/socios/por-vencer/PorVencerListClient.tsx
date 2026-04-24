'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, Download, FileText, ArrowLeft, AlertTriangle, Users, Calendar, CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import * as XLSX from 'xlsx'
import { generatePDFReport } from '@/lib/pdf-utils'

interface Socio {
    id: string
    codigo: string
    nombres: string
    apellidos: string
    sexo: string
    numeroDocumento: string
    telefono: string | null
    historialCodigos: { id: string; codigo: string; fechaCambio: Date }[]
}

interface Suscripcion {
    id: string
    fechaFin: string | Date
    socio: Socio
}

function getExpiringStatus(days: number) {
    if (days < 0) return { label: 'Vencido', color: 'badge-error text-white', icon: '❌' }
    if (days === 0) return { label: 'Vence Hoy', color: 'badge-error animate-pulse text-white', icon: '⚡' }
    if (days === 1) return { label: 'Mañana', color: 'badge-warning font-bold', icon: '⚠️' }
    if (days <= 3) return { label: `${days} días`, color: 'badge-warning', icon: '⏳' }
    return { label: `${days} días`, color: 'badge-info', icon: '📅' }
}

export default function PorVencerListClient({ suscripciones }: { suscripciones: Suscripcion[] }) {
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 20

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const filtered = useMemo(() => {
        return suscripciones.filter(sub => {
            const socio = sub.socio
            const searchLower = search.toLowerCase()

            return !search ||
                socio.nombres.toLowerCase().includes(searchLower) ||
                socio.apellidos.toLowerCase().includes(searchLower) ||
                socio.codigo.toLowerCase().includes(searchLower) ||
                socio.numeroDocumento?.toLowerCase().includes(searchLower) ||
                socio.telefono?.toLowerCase().includes(searchLower)
        })
    }, [suscripciones, search])

    useEffect(() => { setCurrentPage(1) }, [search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const stats = useMemo(() => {
        const total = suscripciones.length
        const expiresToday = suscripciones.filter(s => differenceInDays(new Date(s.fechaFin), today) === 0).length
        const next3Days = suscripciones.filter(s => {
            const d = differenceInDays(new Date(s.fechaFin), today)
            return d > 0 && d <= 3
        }).length
        return { total, expiresToday, next3Days }
    }, [suscripciones, today])

    const exportExcel = () => {
        const data = filtered.map(sub => ({
            Código: sub.socio.codigo,
            Nombres: sub.socio.nombres,
            Apellidos: sub.socio.apellidos,
            Documento: sub.socio.numeroDocumento,
            Teléfono: sub.socio.telefono || '',
            'Vence el': format(new Date(sub.fechaFin), 'dd/MM/yyyy'),
            'Días restantes': differenceInDays(new Date(sub.fechaFin), today)
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Por Vencer')
        XLSX.writeFile(wb, `suscripciones_por_vencer_${format(today, 'yyyyMMdd')}.xlsx`)
    }

    const exportPDF = () => {
        const columns = ['Código', 'Socio', 'Documento', 'Teléfono', 'Vence el', 'Días'];
        const rows = filtered.map(sub => [
            sub.socio.codigo,
            `${sub.socio.nombres} ${sub.socio.apellidos}`,
            sub.socio.numeroDocumento,
            sub.socio.telefono || '-',
            format(new Date(sub.fechaFin), 'dd/MM/yyyy'),
            differenceInDays(new Date(sub.fechaFin), today).toString()
        ]);

        generatePDFReport({
            title: 'Suscripciones Próximas a Vencer',
            subtitle: `Al: ${format(today, 'dd/MM/yyyy')} | Periodo: Próximos 10 días`,
            columns,
            rows,
            fileName: 'socios_por_vencer'
        });
    }

    return (
        <main className="min-h-screen p-4 md:p-8 pb-24">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/" className="btn btn-ghost btn-sm btn-circle">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-warning">
                            <CalendarDays /> Suscripciones por Vencer
                        </h1>
                        <p className="text-sm opacity-60">Socios cuya membresía termina en los próximos 10 días</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={exportExcel} className="btn btn-success btn-sm text-white flex-1 sm:flex-none">
                        <Download size={16} /> Excel
                    </button>
                    <button onClick={exportPDF} className="btn btn-error btn-sm text-white flex-1 sm:flex-none">
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4 shadow-sm">
                    <div className="stat-title text-xs font-bold opacity-60 uppercase">Total por Vencer</div>
                    <div className="stat-value text-warning text-2xl">{stats.total}</div>
                    <div className="stat-figure text-warning opacity-30"><Users size={24} /></div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4 shadow-sm">
                    <div className="stat-title text-xs font-bold opacity-60 uppercase">Vencen Hoy</div>
                    <div className="stat-value text-error text-2xl">{stats.expiresToday}</div>
                    <div className="stat-figure text-error opacity-30"><AlertTriangle size={24} /></div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-200 p-4 shadow-sm">
                    <div className="stat-title text-xs font-bold opacity-60 uppercase">Próximos 3 días</div>
                    <div className="stat-value text-info text-2xl">{stats.next3Days}</div>
                    <div className="stat-figure text-info opacity-30"><Clock size={24} /></div>
                </div>
            </div>

            <div className="bg-base-100 rounded-xl border border-base-200 p-4 mb-6 shadow-sm">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código, DNI..."
                        className="input input-bordered w-full pl-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto bg-base-100 rounded-xl border border-base-200 shadow-xl">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Socio</th>
                            <th className="text-center">Sexo</th>
                            <th>Documento</th>
                            <th>Teléfono</th>
                            <th>Vence</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.map(sub => {
                            const days = differenceInDays(new Date(sub.fechaFin), today)
                            const status = getExpiringStatus(days)
                            return (
                                <tr key={sub.id} className="hover">
                                    <td className="font-mono text-primary font-bold">{sub.socio.codigo}</td>
                                    <td className="font-bold">{sub.socio.nombres} {sub.socio.apellidos}</td>
                                    <td className="text-center">
                                        <div className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {sub.socio.sexo}
                                        </div>
                                    </td>
                                    <td className="text-sm">{sub.socio.numeroDocumento}</td>
                                    <td>{sub.socio.telefono || '-'}</td>
                                    <td className="font-semibold">{format(new Date(sub.fechaFin), 'dd/MM/yyyy')}</td>
                                    <td>
                                        <div className={`badge ${status.color} gap-1 border-none font-bold`}>
                                            {status.icon} {status.label}
                                        </div>
                                    </td>
                                    <td>
                                        <Link href={`/socios/${sub.socio.id}`} className="btn btn-ghost btn-xs btn-circle text-info">
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
                        <Calendar size={48} className="mx-auto mb-4" />
                        <p className="text-lg font-semibold">No hay suscripciones por vencer</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center mt-6">
                    <div className="join shadow-sm border border-base-200">
                        <button className="join-item btn btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
                        <button className="join-item btn btn-sm no-animation">Página {currentPage} de {totalPages}</button>
                        <button className="join-item btn btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
                    </div>
                </div>
            )}
        </main>
    )
}
