'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface EditSubscriptionModalProps {
    subscription: {
        id: string
        fechaInicio: string | Date
        meses: number
    }
    onClose: () => void
    onSubmit: (id: string, newDate: Date, meses: number) => Promise<{ success: boolean; error?: string }>
}

export default function EditSubscriptionModal({ subscription, onClose, onSubmit }: EditSubscriptionModalProps) {
    const [date, setDate] = useState(format(new Date(subscription.fechaInicio), 'yyyy-MM-dd'))
    const [meses, setMeses] = useState(subscription.meses)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const newDate = new Date(date)
            // Fix timezone offset issue by setting time to noon or handling timezone explicitly if needed
            // For simplicity in this app, we assume local date.
            // Adjust to ensure we don't shift day due to UTC conversion if simplistic
            const adjustedDate = new Date(newDate.valueOf() + newDate.getTimezoneOffset() * 60000)

            const result = await onSubmit(subscription.id, adjustedDate, Number(meses))
            if (result.success) {
                onClose()
            } else {
                setError(result.error || 'Error al actualizar')
            }
        } catch (err) {
            setError('Ocurrió un error inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Editar Suscripción</h3>

                {error && (
                    <div className="alert alert-error my-4 text-sm py-2">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="form-control w-full">
                        <label className="label">
                            <span className="label-text">Fecha de Inicio</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-control w-full">
                        <label className="label">
                            <span className="label-text">Duración (Meses)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={meses}
                            onChange={(e) => setMeses(Number(e.target.value))}
                            min="1"
                            max="36"
                            required
                        />
                        <label className="label">
                            <span className="label-text-alt text-warning">
                                Nota: La fecha de vencimiento se recalculará automáticamente.
                            </span>
                        </label>
                    </div>

                    <div className="modal-action">
                        <button type="button" className="btn" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
