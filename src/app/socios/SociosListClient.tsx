'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ArrowLeft, Eye, Edit, Clock, FileDown, FileText, Trash2 } from 'lucide-react'
import { differenceInMonths, differenceInDays, differenceInWeeks, format } from 'date-fns'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { deleteSocio } from '@/app/actions/socios'
import { useRouter } from 'next/navigation'

export default function SociosListClient({ initialSocios, isAdmin }: { initialSocios: any[], isAdmin: boolean }) {
    const [search, setSearch] = useState('')
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al socio ${name}? Esta acción no se puede deshacer y borrará todo su historial y suscripciones.`)) {
            return
        }

        setIsDeleting(true)
        try {
            const result = await deleteSocio(id)
            if (result.success) {
                // Success message or toast could go here
                router.refresh()
            } else {
                alert(result.error || 'Error al eliminar socio')
            }
        } catch (error) {
            alert('Error al procesar la solicitud')
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredSocios = initialSocios.filter(socio => {
        const term = search.toLowerCase()
        const fullName = `${socio.nombres} ${socio.apellidos}`.toLowerCase()

        return (
            socio.nombres.toLowerCase().includes(term) ||
            socio.apellidos.toLowerCase().includes(term) ||
            fullName.includes(term) ||
            socio.numeroDocumento.includes(search) ||
            socio.codigo.toLowerCase().includes(term) ||
            socio.historialCodigos?.some((h: any) => h.codigo.toLowerCase().includes(term))
        )
    })

    const exportToExcel = () => {
        const dataToExport = filteredSocios.map(s => ({
            Código: s.codigo,
            Nombres: s.nombres,
            Apellidos: s.apellidos,
            Documento: `${s.tipoDocumento} ${s.numeroDocumento}`,
            Teléfono: s.telefono || '',
            'Fecha Registro': format(new Date(s.createdAt), 'yyyy-MM-dd')
        }))

        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Socios")
        XLSX.writeFile(wb, "socios_mr_gym.xlsx")
    }

    const exportToPDF = () => {
        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text("Reporte de Socios - Mr. GYM", 14, 22)
        doc.setFontSize(11)
        doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30)

        const tableColumn = ["Código", "Nombres", "Apellidos", "Documento", "Teléfono"]
        const tableRows = filteredSocios.map(s => [
            s.codigo,
            s.nombres,
            s.apellidos,
            `${s.tipoDocumento} ${s.numeroDocumento}`,
            s.telefono || '-'
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [41, 128, 185] }
        })

        doc.save("socios_mr_gym.pdf")
    }

    const getRemainingTime = (socio: any) => {
        const activeSub = socio.suscripciones && socio.suscripciones.length > 0 ? socio.suscripciones[0] : null
        if (!activeSub) return <span className="badge badge-ghost">Sin suscripción</span>

        const today = new Date()
        const endDate = new Date(activeSub.fechaFin)

        if (endDate < today) return <span className="badge badge-error">Vencida</span>

        const months = differenceInMonths(endDate, today)
        const daysTotal = differenceInDays(endDate, today)

        // Exact calculation approximation
        if (months > 0) {
            const extraDays = daysTotal - (months * 30) // Rough approx
            return (
                <div className="flex flex-col text-sm">
                    <span className="font-bold text-success">{months} meses</span>
                    {extraDays > 0 && <span className="text-xs opacity-60">{extraDays} días</span>}
                </div>
            )
        }

        const weeks = differenceInWeeks(endDate, today)
        if (weeks > 0) {
            const extraDays = daysTotal - (weeks * 7)
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
        <div className="min-h-screen bg-base-200 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="btn btn-ghost btn-circle">
                            <ArrowLeft />
                        </Link>
                        <h1 className="text-3xl font-bold">Socios</h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportToExcel} className="btn btn-success text-white btn-sm md:btn-md">
                            <FileDown size={18} /> Excel
                        </button>
                        <button onClick={exportToPDF} className="btn btn-error text-white btn-sm md:btn-md">
                            <FileText size={18} /> PDF
                        </button>
                        <Link href="/socios/nuevo" className="btn btn-primary btn-sm md:btn-md">
                            <Plus className="w-5 h-5 mr-1" />
                            Nuevo Socio
                        </Link>
                    </div>
                </div>

                <div className="bg-base-100 rounded-xl shadow-xl overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-base-200">
                        <div className="join w-full max-w-md">
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search size={20} className="text-base-content/50" />
                                </span>
                                <input
                                    className="input input-bordered w-full pl-10"
                                    placeholder="Buscar por nombre, DNI o código..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
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
                                {filteredSocios.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No se encontraron socios.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSocios.map((socio) => (
                                        <tr key={socio.id} className="hover">
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-primary">{socio.codigo}</span>
                                                    {socio.historialCodigos && socio.historialCodigos.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] opacity-40 font-mono">
                                                            <Clock size={10} />
                                                            {socio.historialCodigos.map((h: any, i: number) => (
                                                                <span key={h.id}>
                                                                    {i > 0 && " ← "}
                                                                    {h.codigo}
                                                                </span>
                                                            )).slice(0, 2)} {/* Limit to last 2 historical codes for UI space */}
                                                            {socio.historialCodigos.length > 2 && " ..."}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="font-bold">
                                                    {socio.nombres} {socio.apellidos}
                                                </div>
                                                <div className="text-xs opacity-50">
                                                    Edad: {new Date().getFullYear() - new Date(socio.fechaNacimiento).getFullYear()} años
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {socio.sexo === 'F' ? 'F' : 'M'}
                                                </div>
                                            </td>
                                            <td>{socio.tipoDocumento} {socio.numeroDocumento}</td>
                                            <td>
                                                {getRemainingTime(socio)}
                                            </td>
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
                </div>
            </div>
        </div >
    )
}
