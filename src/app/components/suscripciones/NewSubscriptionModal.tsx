'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Wallet } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import { getPlanesActivos } from '@/app/actions/planes'

interface NewSubscriptionModalProps {
    socioId: string
    socioNombre: string
    socioCodigo: string
    onClose: () => void
    onSubmit: (data: any, pagoInfo?: any) => Promise<{ success: boolean; error?: string }>
}

export default function NewSubscriptionModal({ socioId, socioNombre, socioCodigo, onClose, onSubmit }: NewSubscriptionModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [planes, setPlanes] = useState<any[]>([])
    const [selectedPlanId, setSelectedPlanId] = useState<string>('')
    const registrarPago = true
    const [metodoPago, setMetodoPago] = useState('EFECTIVO')

    const [customMeses, setCustomMeses] = useState(1)
    const [customMonto, setCustomMonto] = useState(0)

    const [formData, setFormData] = useState<{
        fechaInicio: string
        nuevoCodigo: string
    }>({
        fechaInicio: new Date().toISOString().split('T')[0],
        nuevoCodigo: ''
    })

    const [fechaFin, setFechaFin] = useState('')
    const selectedPlan = planes.find(p => p.id === selectedPlanId)

    useEffect(() => {
        getPlanesActivos().then(data => {
            setPlanes(data)
            if (data.length > 0) {
                setSelectedPlanId(data[0].id)
            }
        })
    }, [])

    useEffect(() => {
        if (!formData.fechaInicio) return
        const start = new Date(formData.fechaInicio)
        if (isNaN(start.getTime())) return

        const meses = selectedPlan ? selectedPlan.meses : customMeses
        const end = addMonths(start, meses)
        if (isNaN(end.getTime())) return

        setFechaFin(format(end, 'yyyy-MM-dd'))
    }, [formData.fechaInicio, selectedPlan, customMeses])

    const formatCode = (val: string) => {
        return val.length > 6 ? val.slice(0, 6) : val
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            let formattedCode = formData.nuevoCodigo.trim()
            if (formattedCode !== '') {
                formattedCode = formattedCode.padStart(6, '0')
            }

            const meses = selectedPlan ? selectedPlan.meses : customMeses

            const subData = {
                socioId,
                planId: selectedPlan?.id,
                meses: meses,
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: new Date(fechaFin),
                nuevoCodigo: (formattedCode !== '' && formattedCode !== socioCodigo) ? formattedCode : undefined
            }

            let pagoInfo = undefined
            if (registrarPago) {
                pagoInfo = {
                    monto: selectedPlan ? selectedPlan.precio : customMonto,
                    metodoPago: metodoPago,
                    nombrePlan: selectedPlan ? selectedPlan.nombre : 'Personalizado'
                }
            }

            const result = await onSubmit(subData, pagoInfo)

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
                            <span className="label-text font-bold">Plan / Promoción</span>
                        </label>
                        {planes.length === 0 ? (
                            <div className="text-sm opacity-60 p-2 bg-base-200 rounded">Cargando planes...</div>
                        ) : (
                            <select 
                                className="select select-bordered select-primary w-full transition-transform active:scale-[0.98]"
                                value={selectedPlanId}
                                onChange={e => setSelectedPlanId(e.target.value)}
                                required
                            >
                                {planes.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} ({p.meses} {p.meses === 1 ? 'mes' : 'meses'}) - S/ {p.precio.toFixed(2)}
                                    </option>
                                ))}
                                <option value="custom">Personalizado (Manual)</option>
                            </select>
                        )}
                        {selectedPlan?.descripcion && (
                            <label className="label">
                                <span className="label-text-alt opacity-70">{selectedPlan.descripcion}</span>
                            </label>
                        )}
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold">Código de Renovación / Recibo</span>
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
                            onBlur={() => setFormData(prev => ({ ...prev, nuevoCodigo: prev.nuevoCodigo !== '' ? prev.nuevoCodigo.padStart(6, '0') : '' }))}
                            className="input input-bordered w-full"
                        />
                    </div>

                    {selectedPlanId === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg border border-base-300">
                             <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Meses</span>
                                </label>
                                <input
                                    type="number"
                                    value={customMeses}
                                    onChange={(e) => setCustomMeses(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="input input-bordered w-full"
                                    min="1"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold text-success">Monto S/</span>
                                </label>
                                <input
                                    type="number"
                                    value={customMonto}
                                    onChange={(e) => setCustomMonto(Math.max(0, parseFloat(e.target.value) || 0))}
                                    className="input input-bordered w-full font-bold text-success"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Fecha de Inicio</span>
                            </label>
                            <input
                                type="date"
                                value={formData.fechaInicio}
                                onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                                className="input input-bordered w-full"
                                max="9999-12-31"
                                required
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Fecha Fin</span>
                            </label>
                            <input
                                type="text"
                                value={fechaFin}
                                readOnly
                                className="input input-bordered w-full bg-base-200"
                            />
                        </div>
                    </div>

                    <div className="divider my-0"></div>

                    <div className="form-control">
                        <div className="bg-success/10 p-3 rounded-lg flex items-center gap-3 border border-success/20">
                            <Wallet className="text-success" size={20}/>
                            <div>
                                <span className="label-text font-bold block text-success">Ingreso a Caja</span>
                                <span className="text-xs opacity-70 text-success">Monto: S/ {(selectedPlan ? selectedPlan.precio : customMonto).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label"><span className="label-text font-bold opacity-80">Método de Pago</span></label>
                        <select 
                            className="select select-bordered select-primary w-full transition-transform active:scale-[0.98]"
                            value={metodoPago}
                            onChange={e => setMetodoPago(e.target.value)}
                        >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TRANSFERENCIA">Transferencia / Tarjeta</option>
                            <option value="YAPE">Yape</option>
                            <option value="PLIN">Plin</option>
                        </select>
                    </div>

                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || planes.length === 0}>
                            {loading ? <span className="loading loading-spinner"></span> : <Save size={20} className="mr-2" />}
                            Crear Suscripción
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
