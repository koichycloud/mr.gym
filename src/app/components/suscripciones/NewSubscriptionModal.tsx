'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Calendar, Save } from 'lucide-react'
import { addMonths, format } from 'date-fns'

interface NewSubscriptionModalProps {
    socioId: string
    socioNombre: string
    socioCodigo: string
    onClose: () => void
    onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>
}

export default function NewSubscriptionModal({ socioId, socioNombre, socioCodigo, onClose, onSubmit }: NewSubscriptionModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<{
        meses: string | number
        fechaInicio: string
        nuevoCodigo: string
    }>({
        meses: 1,
        fechaInicio: new Date().toISOString().split('T')[0],
        nuevoCodigo: socioCodigo
    })

    const [fechaFin, setFechaFin] = useState('')

    useEffect(() => {
        if (!formData.fechaInicio) return
        const start = new Date(formData.fechaInicio)
        if (isNaN(start.getTime())) return // Invalid start date

        const end = addMonths(start, Number(formData.meses) || 0)
        if (isNaN(end.getTime())) return // Invalid end date check

        setFechaFin(format(end, 'yyyy-MM-dd'))
    }, [formData.fechaInicio, formData.meses])

    const formatCode = (val: string) => {
        return val.length > 6 ? val.slice(0, 6) : val
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const formattedCode = formData.nuevoCodigo.padStart(6, '0') // Ensure padding logic here too

            const result = await onSubmit({
                socioId,
                meses: Number(formData.meses),
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: new Date(fechaFin),
                nuevoCodigo: formattedCode !== socioCodigo ? formattedCode : undefined
            })

            if (result.success) {
                onClose()
                router.refresh()
            } else {
                setError(result.error || 'Error al crear suscripción')
            }
        } catch (err) {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">Nueva Suscripción para {socioNombre}</h3>

                {error && (
                    <div className="alert alert-error mb-4">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Código (Opcional cambio)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nuevoCodigo}
                            onChange={(e) => {
                                const val = e.target.value
                                if (/^\d*$/.test(val)) {
                                    setFormData(prev => ({ ...prev, nuevoCodigo: formatCode(val) }))
                                }
                            }}
                            onBlur={() => setFormData(prev => ({ ...prev, nuevoCodigo: prev.nuevoCodigo.padStart(6, '0') }))}
                            className="input input-bordered w-full"
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Meses</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="36"
                            value={formData.meses}
                            onChange={(e) => {
                                const val = e.target.value
                                if (val === '0') return // Block 0
                                if (val.length > 2) return
                                setFormData(prev => ({ ...prev, meses: val }))
                            }}
                            className="input input-bordered w-full"
                            required
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Fecha de Inicio</span>
                        </label>
                        <input
                            type="date"
                            value={formData.fechaInicio}
                            onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                            className="input input-bordered w-full"
                            required
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Fecha de Vencimiento</span>
                        </label>
                        <input
                            type="text"
                            value={fechaFin}
                            readOnly
                            className="input input-bordered w-full bg-base-200"
                        />
                        <label className="label">
                            <span className="label-text-alt text-info">Calculado automáticamente</span>
                        </label>
                    </div>

                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="loading loading-spinner"></span> : <Save size={20} className="mr-2" />}
                            Crear Suscripción
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
