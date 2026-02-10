'use client'

import { useState, useEffect } from 'react'
import { getMedidasBySocio, createMedida, deleteMedida } from '@/app/actions/medidas'
import { Plus, Trash, Activity } from 'lucide-react'
import { format } from 'date-fns'
import AddMedidaModal from './AddMedidaModal'
import MedidasChart from './MedidasChart'
import BodyVisualizer from './BodyVisualizer'

export default function MedidasTab({ socioId, fechaNacimiento, sexo = 'M' }: { socioId: string, fechaNacimiento: Date | string, sexo?: string }) {
    const [medidas, setMedidas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [viewMode, setViewMode] = useState<'visual' | 'table'>('table')
    const [selectedMedidaIndex, setSelectedMedidaIndex] = useState(0)
    // Actually getMedidasBySocio sorts asc (oldest first). We usually want latest.
    // Let's check getMedidasBySocio sort order.


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

    if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner"></span></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-base-100 p-4 rounded-xl shadow">
                <div className="flex items-center gap-4">
                    <Activity className="text-primary w-6 h-6" />
                    <h3 className="text-xl font-bold">Evolución Física</h3>
                </div>
                <div className="flex gap-2">
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
                        {/* Chart Section (Top/Left - Smaller) */}
                        <div className="w-full xl:w-[35%] min-h-[400px]">
                            <h4 className="font-bold text-center mb-4 opacity-70">Tendencias</h4>
                            <MedidasChart data={medidas} />
                        </div>

                        {/* Divider */}
                        <div className="divider xl:divider-horizontal"></div>

                        {/* Visualizer Section (Bottom/Right - Larger) */}
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
        </div >
    )
}
