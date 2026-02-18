'use client'

import { useState, useEffect } from 'react'
import { getMedidasBySocio, createMedida, deleteMedida } from '@/app/actions/medidas'
import { Plus, Trash, Activity, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import AddMedidaModal from './AddMedidaModal'
import MedidasChart from './MedidasChart'
import BodyVisualizer, { BodyVisualizerPdf } from './BodyVisualizer'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function MedidasTab({ socioId, fechaNacimiento, sexo = 'M' }: { socioId: string, fechaNacimiento: Date | string, sexo?: string }) {
    const [medidas, setMedidas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [viewMode, setViewMode] = useState<'visual' | 'table'>('table')
    const [selectedMedidaIndex, setSelectedMedidaIndex] = useState(0)
    const [generatingPdf, setGeneratingPdf] = useState(false)

    const fetchMedidas = async () => {
        setLoading(true)
        const res = await getMedidasBySocio(socioId)
        if (res.success && res.medidas) {
            setMedidas(res.medidas)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchMedidas()
    }, [socioId])

    const handleCreate = async (data: any) => {
        const res = await createMedida({ ...data, socioId })
        if (res.success) {
            fetchMedidas()
            return { success: true }
        }
        return res
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar registro?')) return
        await deleteMedida(id, socioId)
        fetchMedidas()
    }

    const handleExportPDF = async () => {
        const input = document.getElementById('pdf-export-container')
        if (!input) {
            alert('No se encontró el contenido para exportar')
            return
        }

        setGeneratingPdf(true)

        try {
            // Wait a bit for images to be ready in the hidden container
            await new Promise(resolve => setTimeout(resolve, 1500))

            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: true,
                backgroundColor: '#ffffff',
                windowWidth: 1200,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    // 1. Remove stylesheets to prevent OKLCH errors from DaisyUI/Tailwind
                    const styles = clonedDoc.getElementsByTagName('style')
                    const links = clonedDoc.getElementsByTagName('link')

                    // Remove style tags (reverse loop to avoid index issues)
                    for (let i = styles.length - 1; i >= 0; i--) {
                        styles[i].parentNode?.removeChild(styles[i])
                    }

                    // Remove stylesheet links
                    for (let i = links.length - 1; i >= 0; i--) {
                        if (links[i].rel === 'stylesheet') {
                            links[i].parentNode?.removeChild(links[i])
                        }
                    }

                    // 2. Ensure visibility in the CLONED document
                    const clonedContainer = clonedDoc.getElementById('pdf-export-container')
                    if (clonedContainer) {
                        clonedContainer.style.opacity = '1'
                        clonedContainer.style.display = 'block'
                        clonedContainer.style.zIndex = '2147483647' // Max z-index
                        clonedContainer.style.position = 'absolute'
                        clonedContainer.style.top = '0'
                        clonedContainer.style.left = '0'
                    }
                }
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgWidth = 210
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
            pdf.save(`medidas-socio-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        } catch (error: any) {
            console.error('Error creating PDF:', error)
            alert(`Error al generar el PDF: ${error.message || error}`)
        } finally {
            setGeneratingPdf(false)
        }
    }

    if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center bg-base-100 p-4 rounded-xl shadow">
                <div className="flex items-center gap-4">
                    <Activity className="text-primary w-6 h-6" />
                    <h3 className="text-xl font-bold">Evolución Física</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportPDF}
                        className="btn btn-outline btn-sm"
                        disabled={medidas.length === 0 || generatingPdf}
                    >
                        {generatingPdf ? <span className="loading loading-spinner loading-xs"></span> : <FileDown size={16} className="mr-1" />}
                        Exportar PDF
                    </button>
                    <div className="join">
                        <button
                            className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-active' : ''}`}
                            onClick={() => setViewMode('table')}
                        >
                            Tabla
                        </button>
                        <button
                            className={`join-item btn btn-sm ${viewMode === 'visual' ? 'btn-active' : ''}`}
                            onClick={() => setViewMode('visual')}
                        >
                            Gráfico / Visual
                        </button>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
                        <Plus size={16} className="mr-1" /> Nuevo Registro
                    </button>
                </div>
            </div>

            <div className="bg-base-100 rounded-xl shadow-xl overflow-hidden min-h-[400px] p-4">
                {viewMode === 'visual' && (
                    <div className="flex flex-col xl:flex-row gap-6">
                        {/* Chart Section */}
                        <div className="w-full xl:w-[35%] min-h-[400px]">
                            <h4 className="font-bold text-center mb-4 opacity-70">Tendencias</h4>
                            <MedidasChart data={medidas} />
                        </div>

                        <div className="divider xl:divider-horizontal"></div>

                        {/* Visualizer Section */}
                        <div className="w-full xl:w-[65%] flex flex-col items-center">
                            <h4 className="font-bold text-center mb-4 opacity-70">Visualización 3D ({sexo === 'F' ? 'Femenino' : 'Masculino'})</h4>
                            {medidas.length > 0 && (
                                <div className="flex justify-center items-center gap-4 bg-base-200 p-2 rounded-lg mb-4">
                                    <span className="text-xs uppercase font-bold opacity-50">Fecha:</span>
                                    <select
                                        className="select select-sm select-bordered w-auto"
                                        onChange={(e) => setSelectedMedidaIndex(parseInt(e.target.value))}
                                        value={selectedMedidaIndex}
                                    >
                                        {medidas.map((m, idx) => (
                                            <option key={m.id} value={idx}>
                                                {format(new Date(m.fecha), 'dd/MM/yyyy')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <BodyVisualizer
                                key={`${socioId}-${sexo}`}
                                data={medidas.length > 0 ? medidas[selectedMedidaIndex] : null}
                                sexo={sexo}
                            />
                        </div>
                    </div>
                )}

                {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="table table-xs md:table-sm">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Peso</th>
                                    <th>Talla</th>
                                    <th>% Grasa</th>
                                    <th>% Masa</th>
                                    <th>Pecho</th>
                                    <th>Cintura</th>
                                    <th>Vientre Bajo</th>
                                    <th>Glúteos</th>
                                    <th>Bíceps</th>
                                    <th>Cuádriceps</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medidas.map((m) => (
                                    <tr key={m.id} className="hover">
                                        <td className="font-bold">{format(new Date(m.fecha), 'dd/MM/yyyy')}</td>
                                        <td>{m.peso ? `${m.peso} kg` : '-'}</td>
                                        <td>{m.altura ? `${Number(m.altura).toFixed(2)} cm` : '-'}</td>
                                        <td>{m.porcentajeGrasa ? `${m.porcentajeGrasa}%` : '-'}</td>
                                        <td>{m.porcentajeMusculo ? `${m.porcentajeMusculo}%` : '-'}</td>
                                        <td>{m.pecho || '-'}</td>
                                        <td>{m.cintura || '-'}</td>
                                        <td>{m.vientreBajo || '-'}</td>
                                        <td>{m.gluteos || '-'}</td>
                                        <td>{m.biceps || '-'}</td>
                                        <td>{m.cuadriceps || '-'}</td>
                                        <td>
                                            <button
                                                onClick={() => handleDelete(m.id)}
                                                className="btn btn-ghost btn-xs text-error"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {
                showModal && (
                    <AddMedidaModal
                        onClose={() => setShowModal(false)}
                        onSubmit={handleCreate}
                        fechaNacimiento={fechaNacimiento}
                    />
                )
            }

            {/* HIDDEN PDF TEMPLATE */}
            <div
                id="pdf-export-container"
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '10px 40px 40px 40px',
                    backgroundColor: 'white',
                    color: 'black',
                    zIndex: -50,
                    opacity: 0,
                    pointerEvents: 'none',
                    fontFamily: 'Arial, sans-serif'
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #4338ca', paddingBottom: '20px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#4338ca', margin: '0', letterSpacing: '-1px' }}>MR. GYM</h1>
                    <h2 style={{ fontSize: '20px', fontWeight: '500', marginTop: '10px', color: '#4b5563', margin: '5px 0' }}>Reporte de Evolución Física</h2>
                    <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px' }}>Generado el: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                    {/* Latest Visualizer */}
                    {medidas.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', backgroundColor: '#f3f4f6', padding: '5px 20px', borderRadius: '9999px', color: '#374151' }}>
                                Estado Actual ({format(new Date(medidas[0].fecha), 'dd/MM/yyyy')})
                            </h3>
                            <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', height: '660px', width: '100%' }}>
                                <BodyVisualizerPdf
                                    data={medidas[0]}
                                    sexo={sexo}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats Table */}
                    <div style={{ marginTop: '0px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', borderLeft: '4px solid #4338ca', paddingLeft: '12px', color: '#1f2937' }}>Historial de Medidas</h3>
                        <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Fecha</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Peso</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>% Grasa</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>% Masa</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Pecho</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Cintura</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Vientre</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Glúteos</th>
                                    <th style={{ padding: '8px', borderRight: '1px solid #e5e7eb', color: '#374151', fontWeight: 'bold' }}>Bíceps</th>
                                    <th style={{ padding: '8px', color: '#374151', fontWeight: 'bold' }}>Piernas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medidas.map((m, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#1f2937' }}>{format(new Date(m.fecha), 'dd/MM/yyyy')}</td>
                                        <td style={{ padding: '8px' }}>{m.peso || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.porcentajeGrasa || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.porcentajeMusculo || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.pecho || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.cintura || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.vientreBajo || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.gluteos || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.biceps || '-'}</td>
                                        <td style={{ padding: '8px' }}>{m.cuadriceps || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: 'auto', paddingTop: '32px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', borderTop: '1px solid #e5e7eb' }}>
                        <p>Mr. Gym - Tu mejor versión</p>
                    </div>
                </div>
            </div>
        </div >
    )
}
