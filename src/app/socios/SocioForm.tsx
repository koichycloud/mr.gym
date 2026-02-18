'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Calendar } from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { checkSocioExists } from '@/app/actions/socios'

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
        telefono: initialData?.telefono || ''
    })

    // Subscription State
    const [subscriptionData, setSubscriptionData] = useState<{
        meses: string | number
        fechaInicio: string
    }>({
        meses: 1,
        fechaInicio: new Date().toISOString().split('T')[0]
    })
    const [fechaFin, setFechaFin] = useState('')

    // Calculate End Date whenever start date or months change
    useEffect(() => {
        if (includeSubscription && subscriptionData.fechaInicio && subscriptionData.meses) {
            const start = new Date(subscriptionData.fechaInicio)
            if (isNaN(start.getTime())) return

            const end = addMonths(start, Number(subscriptionData.meses))
            if (isNaN(end.getTime())) return

            setFechaFin(format(end, 'yyyy-MM-dd'))
        }
    }, [subscriptionData.fechaInicio, subscriptionData.meses, includeSubscription])

    // Debounced Document Validation
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!formData.numeroDocumento) {
                setDocumentoError(null)
                return
            }

            // Skip check if editing same user
            if (initialData && initialData.numeroDocumento === formData.numeroDocumento) {
                setDocumentoError(null)
                return
            }

            // For DNI, only check if length is 8. For others, maybe check if length > 4?
            if (formData.tipoDocumento === 'DNI' && formData.numeroDocumento.length !== 8) {
                setDocumentoError(null) // Wait for complete input
                return
            }

            const s = await checkSocioExists(formData.tipoDocumento, formData.numeroDocumento)
            if (s) {
                setDocumentoError(`El ${formData.tipoDocumento} ${formData.numeroDocumento} ya está registrado.`)
                setExistingSocio(s)
            } else {
                setDocumentoError(null)
                setExistingSocio(null)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [formData.numeroDocumento, formData.tipoDocumento, initialData])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        // Validation logic for Document Number
        if (name === 'numeroDocumento') {
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

    const handleSubscriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target

        if (name === 'meses') {
            if (value === '0') return // Block 0 input
            if (value.length > 2) return
        }

        setSubscriptionData(prev => ({ ...prev, [name]: value }))
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
                        meses: Number(subscriptionData.meses),
                        fechaInicio: new Date(subscriptionData.fechaInicio)
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
        <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
            <div className="card-body">
                <h2 className="card-title text-2xl mb-6">{title}</h2>

                {error && (
                    <div className="alert alert-error mb-6">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                                className="select select-bordered w-full"
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
                        <input
                            type="text"
                            name="numeroDocumento"
                            value={formData.numeroDocumento}
                            onChange={handleChange}
                            className="input input-bordered w-full"
                            placeholder={formData.tipoDocumento === 'DNI' ? '8 dígitos' : 'Máx. 12 caracteres'}
                            required
                        />
                        {documentoError && (
                            <div className="flex items-center justify-between gap-4 mt-1">
                                <span className="text-error text-sm font-bold">{documentoError}</span>
                                {existingSocio && (
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/socios/${existingSocio.id}/editar?renew=true`)}
                                        className="btn btn-xs btn-outline btn-error"
                                    >
                                        Ir a Renovación
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

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
                                    required
                                    disabled
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Sexo</span>
                                </label>
                                <select
                                    name="sexo"
                                    value={formData.sexo || 'M'}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                >
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-control mt-4">
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
                    </div>

                    {includeSubscription && (
                        <div className="bg-base-200 p-4 rounded-xl mt-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Suscripción Inicial
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Fecha Inicio</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="fechaInicio"
                                        value={subscriptionData.fechaInicio}
                                        onChange={handleSubscriptionChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-gray-500">Vence el</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fechaFin}
                                        readOnly
                                        className="input input-bordered w-full bg-base-300 text-gray-500"
                                    />
                                </div>
                            </div>
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
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading loading-spinner"></span>
                            ) : (
                                <Save size={20} className="mr-2" />
                            )}
                            Guardar
                        </button>
                    </div>
                </form>
            </div >
        </div >
    )
}
