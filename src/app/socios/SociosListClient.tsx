'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ArrowLeft, Eye, Edit, Clock, FileDown, FileText } from 'lucide-react'
import { differenceInMonths, differenceInDays, differenceInWeeks, format } from 'date-fns'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function SociosListClient({ initialSocios }: { initialSocios: any[] }) {
    const [search, setSearch] = useState('')

    const filteredSocios = initialSocios.filter(socio =>
        socio.nombres.toLowerCase().includes(search.toLowerCase()) ||
        socio.apellidos.toLowerCase().includes(search.toLowerCase()) ||
        socio.numeroDocumento.includes(search) ||
        socio.codigo.toLowerCase().includes(search.toLowerCase())
    )

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
                                    <th>Documento</th>
                                    <th>Suscripción</th>
                                    <th>Teléfono</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSocios.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            No se encontraron socios.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSocios.map((socio) => (
                                        <tr key={socio.id} className="hover">
                                            <td className="font-mono font-bold text-primary">{socio.codigo}</td>
                                            <td>
                                                <div className={`font-bold inline-block px-2 py-1 rounded ${socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {socio.nombres} {socio.apellidos}
                                                </div>
                                                <div className="text-xs opacity-50">
                                                    Edad: {new Date().getFullYear() - new Date(socio.fechaNacimiento).getFullYear()} años
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
