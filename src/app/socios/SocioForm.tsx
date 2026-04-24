'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Calendar } from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { checkSocioExists } from '@/app/actions/socios'
import { getPlanesActivos } from '@/app/actions/planes'
import PhotoCapture from '@/app/components/PhotoCapture'
import { Wallet } from 'lucide-react'

interface SocioFormProps {
    initialData?: {
        id?: string
        codigo: string
        nombres?: string | null
        apellidos?: string | null
        tipoDocumento: string
        numeroDocumento: string
        fechaNacimiento: Date
        sexo?: string
        telefono?: string | null
        fotoUrl?: string | null
    }
    onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>
    title: string
    includeSubscription?: boolean
}

export default function SocioForm({ initialData, onSubmit, title, includeSubscription = false }: SocioFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [documentoError, setDocumentoError] = useState<string | null>(null)
    const [existingSocio, setExistingSocio] = useState<any | null>(null)

    // Lock state
    // If we have initialData (editing), we are already verified/unlocked.
    // If new (no initialData or empty id), we start locked.
    const [dniVerified, setDniVerified] = useState(!!initialData?.id)
    const [isChecking, setIsChecking] = useState(false)

    const [formData, setFormData] = useState({
        codigo: initialData?.codigo || '',
        nombres: initialData?.nombres || '',
        apellidos: initialData?.apellidos || '',
        tipoDocumento: initialData?.tipoDocumento || 'DNI',
        numeroDocumento: initialData?.numeroDocumento || '',
        fechaNacimiento: initialData?.fechaNacimiento
            ? format(new Date(initialData.fechaNacimiento), 'yyyy-MM-dd')
            : '',
        sexo: initialData?.sexo || 'M',
        telefono: initialData?.telefono || '',
        fotoUrl: initialData?.fotoUrl || null
    })

    // Subscription State
    const [subscriptionData, setSubscriptionData] = useState<{
        meses: string | number
        monto: string | number
        fechaInicio: string
        metodoPago: string
    }>({
        meses: 1,
        monto: 0,
        fechaInicio: new Date().toISOString().split('T')[0],
        metodoPago: 'EFECTIVO'
    })
    const [fechaFin, setFechaFin] = useState('')
    const [planes, setPlanes] = useState<any[]>([])
    const [selectedPlanId, setSelectedPlanId] = useState<string>('custom')

    // Load available plans
    useEffect(() => {
        getPlanesActivos().then(data => {
            setPlanes(data)
        })
    }, [])

    const selectedPlan = planes.find(p => p.id === selectedPlanId)

    // Calculate End Date whenever start date or months change
    useEffect(() => {
        if (includeSubscription && subscriptionData.fechaInicio) {
            const start = new Date(subscriptionData.fechaInicio)
            if (isNaN(start.getTime())) return

            let meses = 1
            if (selectedPlanId === 'custom') {
                meses = Number(subscriptionData.meses) || 1
            } else if (selectedPlan) {
                meses = selectedPlan.meses
            }

            const end = addMonths(start, meses)
            if (isNaN(end.getTime())) return

            setFechaFin(format(end, 'dd/MM/yyyy'))
        }
    }, [subscriptionData.fechaInicio, subscriptionData.meses, selectedPlanId, selectedPlan, includeSubscription])

    // Automatic Verification Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            // If we have initialData (editing), we allow checking 
            // but we'll ignore the result if it's the exact same socio id.
            // if (initialData?.id) return // REMOVED

            if (!formData.numeroDocumento) return

            // If DNI, wait for 8 digits.
            if (formData.tipoDocumento === 'DNI' && formData.numeroDocumento.length !== 8) {
                return
            }
            // If CE, wait for at least 4?
            if (formData.tipoDocumento !== 'DNI' && formData.numeroDocumento.length < 4) {
                return
            }

            // Skip if already verified and unchanged (handled by handleChange resetting verified)
            if (dniVerified) return

            setIsChecking(true)
            setDocumentoError(null)

            try {
                const s = await checkSocioExists(formData.tipoDocumento, formData.numeroDocumento)

                if (s && s.id !== initialData?.id) {
                    setDocumentoError(`El socio ya está registrado.`)
                    setExistingSocio(s)
                } else {
                    // Not found or belongs to same user -> Unlock
                    setDniVerified(true)
                }
            } catch (err) {
                console.error(err)
                setDocumentoError("Error validando documento")
            } finally {
                setIsChecking(false)
            }
        }, 500) // 500ms debounce

        return () => clearTimeout(timer)
    }, [formData.numeroDocumento, formData.tipoDocumento, dniVerified, router, initialData])

    const handleReset = () => {
        setDniVerified(false)
        setFormData(prev => ({
            ...prev,
            nombres: '',
            apellidos: '',
            numeroDocumento: '',
            telefono: '',
            fotoUrl: null
        }))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        // Validation logic for Document Number
        if (name === 'numeroDocumento') {
            // Reset verification if DNI changes after being verified (optional, but safer)
            if (dniVerified) setDniVerified(false)
            setExistingSocio(null)
            setDocumentoError(null)

            if (formData.tipoDocumento === 'DNI') {
                if (!/^\d*$/.test(value)) return // Only numbers
                if (value.length > 8) return // Max 8
            } else {
                if (value.length > 12) return // Max 12
            }
        }

        if (name === 'telefono' && value.length > 12) return

        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubscriptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        if (name === 'planId') {
            setSelectedPlanId(value)
            return
        }

        if (name === 'meses') {
            if (value === '0') return // Block 0 input
            if (value.length > 2) return
            if (Number(value) < 0) return
        }

        if (name === 'monto') {
            if (Number(value) < 0) return
        }

        setSubscriptionData(prev => ({ ...prev, [name]: value }))
    }

    const handleMetodoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSubscriptionData(prev => ({ ...prev, metodoPago: e.target.value }))
    }

    const handleCodeBlur = () => {
        if (formData.codigo) {
            setFormData(prev => ({
                ...prev,
                codigo: prev.codigo.padStart(6, '0')
            }))
        }
    }



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Pre-submit validation
        if (formData.tipoDocumento === 'DNI' && formData.numeroDocumento.length !== 8) {
            setError('El DNI debe tener exactamente 8 dígitos')
            setLoading(false)
            return
        }

        try {
            const payload = {
                ...formData,
                fechaNacimiento: new Date(formData.fechaNacimiento),
                ...(includeSubscription ? {
                    suscripcion: {
                        meses: selectedPlanId === 'custom' ? Number(subscriptionData.meses) : selectedPlan!.meses,
                        planId: selectedPlanId === 'custom' ? undefined : selectedPlanId,
                        monto: selectedPlanId === 'custom' ? Number(subscriptionData.monto) : undefined,
                        fechaInicio: new Date(subscriptionData.fechaInicio),
                        metodoPago: subscriptionData.metodoPago
                    }
                } : {})
            }

            const result = await onSubmit(payload)

            if (result.success) {
                router.push('/socios')
                router.refresh()
            } else {
                setError(result.error || 'Ocurrió un error')
            }
        } catch (err) {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
            <div className="card-body">
                <h2 className="card-title text-2xl mb-6">{title}</h2>

                {error && (
                    <div className="alert alert-error mb-6">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">

                    {/* Camera Module */}
                    <fieldset disabled={!dniVerified && !initialData?.id} className={`w-full lg:w-1/3 flex-shrink-0 flex flex-col items-center ${(!dniVerified && !initialData?.id) ? 'opacity-50' : ''}`}>
                        <PhotoCapture
                            currentPhoto={formData.fotoUrl}
                            onPhotoCapture={(photo) => setFormData(prev => ({ ...prev, fotoUrl: photo }))}
                        />
                    </fieldset>

                    {/* Form Fields */}
                    <div className="w-full lg:w-2/3 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Código</span>
                                </label>
                                <input
                                    type="text"
                                    name="codigo"
                                    value={formData.codigo}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            handleChange(e)
                                        }
                                    }}
                                    onBlur={handleCodeBlur}
                                    className="input input-bordered w-full"
                                    required
                                    disabled={!dniVerified && !initialData?.id} // Allow editing code if verifying? No, user requested lock.
                                // Actually user said "subsequent boxes". Code is usually auto-generated or manual. 
                                // Let's keep code editable or at least visible. 
                                // The request says: "text boxes AFTER document number must be blocked". 
                                // Code is usually BEFORE or separate. Let's leave code enabled or read-only based on verified.
                                // If we follow strict "after document number", code is usually first. 
                                // But typically you verify DNI first before assigning code.
                                // Let's disable code too if it's new.
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Tipo Documento</span>
                                </label>
                                <select
                                    name="tipoDocumento"
                                    value={formData.tipoDocumento}
                                    onChange={handleChange}
                                    className="select select-bordered select-primary w-full transition-transform active:scale-[0.98]"
                                    disabled={dniVerified && !initialData?.id}
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="CE">Carnet de Extranjería</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Número Documento</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="numeroDocumento"
                                    value={formData.numeroDocumento}
                                    onChange={handleChange}
                                    className={`input input-bordered w-full ${documentoError ? 'input-error' : ''} ${isChecking ? 'pr-10' : ''}`}
                                    placeholder={formData.tipoDocumento === 'DNI' ? '8 dígitos' : 'Máx. 12 caracteres'}
                                    required
                                // Lock DNI ONLY after verified to prevent accidental changes? 
                                // No, user needs to be able to correct it.
                                // If they change it, verified becomes false (via handleChange), locking the rest.
                                // So we don't disable it.
                                />
                                {isChecking && (
                                    <div className="absolute right-3 top-3">
                                        <span className="loading loading-spinner loading-xs text-primary"></span>
                                    </div>
                                )}
                                {dniVerified && !initialData?.id && (
                                    <div className="absolute right-3 top-3">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="btn btn-xs btn-ghost text-success p-0 hover:bg-transparent cursor-default"
                                            title="Verificado"
                                        >
                                            ✓
                                        </button>
                                    </div>
                                )}
                            </div>
                            {documentoError && (
                                <div className="flex items-center justify-between gap-4 mt-1">
                                    <span className="text-error text-sm font-bold">{documentoError}</span>
                                    {existingSocio && (
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/socios/${existingSocio.id}/editar?renew=true`)}
                                            className="btn btn-xs btn-outline btn-error"
                                        >
                                            Renovar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fields blocked until verified */}
                        <fieldset disabled={!dniVerified} className={`space-y-4 ${!dniVerified ? 'opacity-50' : ''}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Nombres (Opcional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="nombres"
                                        value={formData.nombres}
                                        onChange={handleChange}
                                        className="input input-bordered w-full"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Apellidos (Opcional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="apellidos"
                                        value={formData.apellidos}
                                        onChange={handleChange}
                                        className="input input-bordered w-full"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Fecha de Nacimiento</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            name="fechaNacimiento"
                                            value={formData.fechaNacimiento}
                                            onChange={handleChange}
                                            className="input input-bordered w-full"
                                            max="9999-12-31"
                                            required={dniVerified}
                                        />
                                        <div className="absolute right-10 top-3 text-xs opacity-40 pointer-events-none">
                                            dd/mm/aaaa
                                        </div>
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Sexo</span>
                                    </label>
                                    <select
                                        name="sexo"
                                        value={formData.sexo || 'M'}
                                        onChange={handleChange}
                                        className="select select-bordered select-primary w-full transition-transform active:scale-[0.98]"
                                    >
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Teléfono</span>
                                </label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="input input-bordered w-full"
                                />
                            </div>

                            {includeSubscription && (
                                <div className="bg-base-200 p-4 rounded-xl mt-6">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Suscripción Inicial
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Plan / Promoción</span>
                                            </label>
                                            <select
                                                name="planId"
                                                value={selectedPlanId}
                                                onChange={handleSubscriptionChange}
                                                className="select select-bordered select-primary w-full transition-transform active:scale-[0.98]"
                                            >
                                                <option value="custom">Personalizado (Ingreso manual)</option>
                                                {planes.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre} ({p.meses} {p.meses === 1 ? 'mes' : 'meses'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold">Fecha de Inicio</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    name="fechaInicio"
                                                    value={subscriptionData.fechaInicio}
                                                    onChange={handleSubscriptionChange}
                                                    className="input input-bordered w-full"
                                                    max="9999-12-31"
                                                    required={includeSubscription && dniVerified}
                                                />
                                                <div className="absolute right-10 top-3 text-xs opacity-40 pointer-events-none">
                                                    dd/mm/aaaa
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                        {selectedPlanId === 'custom' && (
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-bold">Meses</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    name="meses"
                                                    value={subscriptionData.meses}
                                                    onChange={handleSubscriptionChange}
                                                    min="1"
                                                    max="24"
                                                    className="input input-bordered w-full font-bold text-lg"
                                                    required={selectedPlanId === 'custom' && includeSubscription && dniVerified}
                                                />
                                            </div>
                                        )}
                                        
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold text-gray-500">Vence el</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={fechaFin}
                                                readOnly
                                                className="input input-bordered w-full bg-base-300 text-gray-500 font-mono"
                                            />
                                        </div>

                                        <div className="form-control col-span-1 md:col-span-1">
                                             <label className="label">
                                                <span className="label-text font-bold text-success">Precio a Cobrar</span>
                                            </label>
                                            {selectedPlanId === 'custom' ? (
                                                <div className="relative">
                                                    <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-success" />
                                                    <input
                                                        type="number"
                                                        name="monto"
                                                        value={subscriptionData.monto}
                                                        onChange={handleSubscriptionChange}
                                                        className="input input-bordered w-full pl-10 font-bold text-success"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="input input-bordered bg-success/10 flex items-center gap-2 font-bold text-success">
                                                    <Wallet size={16} />
                                                    S/ {selectedPlan?.precio.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold text-success flex items-center gap-2">
                                                    <Wallet size={16} /> Método de Pago
                                                </span>
                                            </label>
                                            <select
                                                name="metodoPago"
                                                value={subscriptionData.metodoPago}
                                                onChange={handleMetodoChange}
                                                className="select select-bordered select-primary w-full select-sm font-bold transition-transform active:scale-[0.98]"
                                            >
                                                <option value="EFECTIVO">Efectivo</option>
                                                <option value="TRANSFERENCIA">Transferencia / Tarjeta</option>
                                                <option value="YAPE">Yape</option>
                                                <option value="PLIN">Plin</option>
                                            </select>
                                        </div>
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-bold text-success">Monto a Registrar en Caja</span>
                                            </label>
                                            <div className="text-2xl font-black text-success">
                                                S/ {selectedPlanId === 'custom' ? Number(subscriptionData.monto).toFixed(2) : selectedPlan?.precio.toFixed(2)}
                                            </div>
                                            {selectedPlanId === 'custom' && (
                                                <span className="text-[10px] opacity-60 italic text-success">Nota: Este monto se ingresará automáticamente a la caja al guardar.</span>
                                            )}
                                        </div>
                                    </div>

                                    {selectedPlan?.descripcion && (
                                        <div className="text-xs opacity-70 mt-2 p-2 bg-base-300/50 rounded">
                                            <strong>Descripción:</strong> {selectedPlan.descripcion}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="card-actions justify-end mt-8">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="btn btn-ghost"
                                    disabled={loading}
                                >
                                    <X size={20} className="mr-2" />
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading || !dniVerified}
                                >
                                    {loading ? (
                                        <span className="loading loading-spinner"></span>
                                    ) : (
                                        <Save size={20} className="mr-2" />
                                    )}
                                    Guardar
                                </button>
                            </div>
                        </fieldset>
                    </div>
                </form>
            </div >
        </div >
    )
}
