'use client'

import { useState, useMemo } from 'react'
import { X, Save } from 'lucide-react'
import { differenceInYears } from 'date-fns'

interface AddMedidaModalProps {
    onClose: () => void
    onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>
    fechaNacimiento: Date | string
}

export default function AddMedidaModal({ onClose, onSubmit, fechaNacimiento }: AddMedidaModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        peso: '',
        altura: '',
        porcentajeGrasa: '',
        porcentajeMusculo: '',
        cuello: '',
        hombros: '',
        pecho: '',
        biceps: '',
        antebrazos: '',
        cintura: '',
        vientreBajo: '',
        cadera: '',
        gluteos: '',
        muslos: '',
        cuadriceps: '',
        pantorrillas: ''
    })

    const edadCalculada = useMemo(() => {
        if (!fechaNacimiento || !formData.fecha) return ''
        return differenceInYears(new Date(formData.fecha), new Date(fechaNacimiento)).toString()
    }, [fechaNacimiento, formData.fecha])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        // Allow decimals
        if (name !== 'fecha' && value && !/^\d*\.?\d*$/.test(value)) return
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Convert to numbers
            const payload: any = {
                fecha: new Date(formData.fecha)
            }

            Object.keys(formData).forEach(key => {
                if (key !== 'fecha' && (formData as any)[key]) {
                    payload[key] = parseFloat((formData as any)[key])
                }
            })

            const result = await onSubmit(payload)
            if (result.success) {
                onClose()
            } else {
                setError(result.error || 'Error al guardar')
            }
        } catch (err) {
            setError('Error desconocido')
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        // Column 1
        [
            { name: 'peso', label: 'Peso (kg)' },
            { name: 'altura', label: 'Talla (cm)' },
            { name: 'edad', label: 'Edad', readOnly: true, value: edadCalculada },
            { name: 'porcentajeMusculo', label: '% Masa Corporal' },
            { name: 'porcentajeGrasa', label: '% Porcentaje de Grasa' },
        ],
        // Column 2
        [
            { name: 'cuello', label: 'Cuello (cm)' },
            { name: 'hombros', label: 'Hombros (cm)' },
            { name: 'pecho', label: 'Pecho (cm)' },
            { name: 'biceps', label: 'Bíceps (cm)' },
            { name: 'antebrazos', label: 'Antebrazos (cm)' },
        ],
        // Column 3
        [
            { name: 'cintura', label: 'Cintura (cm)' },
            { name: 'vientreBajo', label: 'Vientre Bajo (cm)' }, // New
            { name: 'gluteos', label: 'Glúteos (cm)' }, // Replaces Cadera in visuals? Or both? User removed Cadera from list.
            { name: 'cuadriceps', label: 'Cuádriceps (cm)' }, // Replaces Muslos logic?
            { name: 'pantorrillas', label: 'Pantorrillas (cm)' },
        ]
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="card bg-base-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="card-title text-xl">Registrar Medidas</h3>
                        <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="alert alert-error mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Fecha de Medición</span>
                            </label>
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha}
                                onChange={handleChange}
                                className="input input-bordered w-full"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {columns.map((col, idx) => (
                                <div key={idx} className="space-y-4">
                                    <h4 className="font-bold text-center border-b pb-1">Columna {idx + 1}</h4>
                                    {col.map(field => (
                                        <div key={field.name} className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs opacity-70">{field.label}</span>
                                            </label>
                                            <input
                                                type={field.name === 'edad' ? 'text' : 'text'}
                                                name={field.name}
                                                value={(field as any).value !== undefined ? (field as any).value : (formData as any)[field.name]}
                                                onChange={handleChange}
                                                readOnly={(field as any).readOnly}
                                                className={`input input-bordered input-sm w-full ${(field as any).readOnly ? 'bg-base-200 cursor-not-allowed' : ''}`}
                                                placeholder={field.name === 'edad' ? '' : '0.00'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="card-actions justify-end mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-ghost"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? <span className="loading loading-spinner"></span> : <Save size={18} className="mr-2" />}
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
