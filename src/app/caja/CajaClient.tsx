'use client'

import { useState } from 'react'
import { registrarPago, getPagosPorRango } from '../actions/pagos'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, CreditCard, TrendingUp, Plus, Search, Banknote, Smartphone } from 'lucide-react'
import { Toaster, toast } from 'sonner'

type Pago = {
    id: string
    socioId: string | null
    suscripcionId: string | null
    monto: number
    metodoPago: string
    concepto: string
    descripcion: string | null
    fecha: Date
    socio: {
        codigo: string
        nombres: string | null
        apellidos: string | null
    } | null
}

type ResumenMensual = {
    totalMes: number
    totalTransacciones: number
    desglose: Record<string, number>
    porConcepto: Record<string, number>
}

type Props = {
    pagosIniciales: Pago[]
    totalDiaInicial: number
    desgloseInicial: Record<string, number>
    resumenMensual: ResumenMensual
}

const METODO_ICONS: Record<string, React.ReactNode> = {
    'EFECTIVO': <Banknote size={16} />,
    'TRANSFERENCIA': <CreditCard size={16} />,
    'YAPE': <Smartphone size={16} />,
    'PLIN': <Smartphone size={16} />,
}

const METODO_COLORS: Record<string, string> = {
    'EFECTIVO': 'badge-success',
    'TRANSFERENCIA': 'badge-info',
    'YAPE': 'badge-secondary',
    'PLIN': 'badge-accent',
}

export default function CajaClient({ pagosIniciales, totalDiaInicial, desgloseInicial, resumenMensual }: Props) {
    const [pagos, setPagos] = useState<Pago[]>(pagosIniciales)
    const [totalDia, setTotalDia] = useState(totalDiaInicial)
    const [desglose, setDesglose] = useState(desgloseInicial)
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [buscando, setBuscando] = useState(false)

    // Form states
    const [monto, setMonto] = useState('')
    const [metodoPago, setMetodoPago] = useState('EFECTIVO')
    const [concepto, setConcepto] = useState('OTRO')
    const [descripcion, setDescripcion] = useState('')

    // Date range search
    const [fechaDesde, setFechaDesde] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [fechaHasta, setFechaHasta] = useState(format(new Date(), 'yyyy-MM-dd'))

    const handleRegistrarPago = async () => {
        if (!monto || parseFloat(monto) <= 0) {
            toast.error('El monto debe ser mayor a 0')
            return
        }

        setLoading(true)
        try {
            const result = await registrarPago({
                monto: parseFloat(monto),
                metodoPago: metodoPago as 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN',
                concepto: concepto as 'SUSCRIPCION' | 'PRODUCTO' | 'OTRO',
                descripcion: descripcion || undefined,
            })

            if (result.success) {
                toast.success('Pago registrado correctamente')
                setShowModal(false)
                setMonto('')
                setDescripcion('')
                // Refresh
                window.location.reload()
            } else {
                toast.error(result.error || 'Error al registrar pago')
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setLoading(false)
        }
    }

    const buscarPorRango = async () => {
        setBuscando(true)
        try {
            const result = await getPagosPorRango(
                new Date(fechaDesde + 'T00:00:00'),
                new Date(fechaHasta + 'T23:59:59')
            )
            setPagos(result.pagos as Pago[])
            setTotalDia(result.total)
            setDesglose(result.desglose)
        } catch (error) {
            toast.error('Error buscando pagos')
        } finally {
            setBuscando(false)
        }
    }

    return (
        <div className="space-y-6">
            <Toaster position="top-right" richColors />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary flex items-center gap-2">
                        <DollarSign size={32} />
                        Gestión de Caja
                    </h1>
                    <p className="text-base-content/60 mt-1">
                        Control de ingresos y pagos
                    </p>
                </div>

                <button
                    className="btn btn-primary gap-2"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={20} />
                    Registrar Ingreso
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="stats shadow bg-base-100">
                    <div className="stat">
                        <div className="stat-figure text-success">
                            <DollarSign className="inline-block w-8 h-8" />
                        </div>
                        <div className="stat-title">Total del Día</div>
                        <div className="stat-value text-success text-2xl">S/ {totalDia.toFixed(2)}</div>
                    </div>
                </div>

                {Object.entries(desglose).map(([metodo, total]) => (
                    <div key={metodo} className="stats shadow bg-base-100">
                        <div className="stat">
                            <div className="stat-figure text-base-content/40">
                                {METODO_ICONS[metodo]}
                            </div>
                            <div className="stat-title">{metodo}</div>
                            <div className="stat-value text-xl">S/ {(total as number).toFixed(2)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Monthly Summary */}
            <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
                <div className="card-body">
                    <h2 className="card-title flex items-center gap-2">
                        <TrendingUp size={24} />
                        Resumen del Mes
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div>
                            <p className="text-sm opacity-70">Total del Mes</p>
                            <p className="text-2xl font-black">S/ {resumenMensual.totalMes.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm opacity-70">Transacciones</p>
                            <p className="text-2xl font-black">{resumenMensual.totalTransacciones}</p>
                        </div>
                        {Object.entries(resumenMensual.desglose).map(([metodo, total]) => (
                            <div key={metodo}>
                                <p className="text-sm opacity-70">{metodo}</p>
                                <p className="text-xl font-bold">S/ {(total as number).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="card bg-base-100 shadow">
                <div className="card-body py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="form-control">
                            <label className="label"><span className="label-text">Desde</span></label>
                            <input
                                type="date"
                                className="input input-bordered input-sm"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label"><span className="label-text">Hasta</span></label>
                            <input
                                type="date"
                                className="input input-bordered input-sm"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn btn-outline btn-sm gap-2"
                            onClick={buscarPorRango}
                            disabled={buscando}
                        >
                            {buscando ? <span className="loading loading-spinner loading-xs"></span> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">Movimientos</h2>

                    {pagos.length === 0 ? (
                        <div className="text-center py-12 text-base-content/50">
                            <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg">No hay movimientos registrados</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>Hora</th>
                                        <th>Socio</th>
                                        <th>Concepto</th>
                                        <th>Método</th>
                                        <th>Descripción</th>
                                        <th className="text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagos.map((p) => (
                                        <tr key={p.id} className="hover">
                                            <td className="font-mono text-sm">
                                                {format(new Date(p.fecha), 'dd/MM HH:mm')}
                                            </td>
                                            <td>
                                                {p.socio
                                                    ? `${p.socio.nombres || ''} ${p.socio.apellidos || ''}`
                                                    : <span className="opacity-50">-</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="badge badge-ghost badge-sm">{p.concepto}</div>
                                            </td>
                                            <td>
                                                <div className={`badge ${METODO_COLORS[p.metodoPago] || 'badge-ghost'} badge-sm gap-1`}>
                                                    {METODO_ICONS[p.metodoPago]}
                                                    {p.metodoPago}
                                                </div>
                                            </td>
                                            <td className="text-sm opacity-70 max-w-[200px] truncate">
                                                {p.descripcion || '-'}
                                            </td>
                                            <td className="text-right font-bold text-success">
                                                S/ {p.monto.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={5} className="text-right font-bold">TOTAL:</td>
                                        <td className="text-right font-black text-success text-lg">
                                            S/ {totalDia.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Register Payment Modal */}
            {showModal && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Registrar Ingreso Manual</h3>

                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Monto (S/)</span></label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    className="input input-bordered"
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text">Método de Pago</span></label>
                                <select
                                    className="select select-bordered"
                                    value={metodoPago}
                                    onChange={(e) => setMetodoPago(e.target.value)}
                                >
                                    <option value="EFECTIVO">💵 Efectivo</option>
                                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                                    <option value="YAPE">📱 Yape</option>
                                    <option value="PLIN">📱 Plin</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text">Concepto</span></label>
                                <select
                                    className="select select-bordered"
                                    value={concepto}
                                    onChange={(e) => setConcepto(e.target.value)}
                                >
                                    <option value="SUSCRIPCION">Suscripción</option>
                                    <option value="PRODUCTO">Producto</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label"><span className="label-text">Descripción (Opcional)</span></label>
                                <input
                                    type="text"
                                    placeholder="Ej: Agua, proteína, etc."
                                    className="input input-bordered"
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="modal-action">
                            <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRegistrarPago}
                                disabled={loading}
                            >
                                {loading && <span className="loading loading-spinner loading-xs"></span>}
                                Registrar
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop" onClick={() => setShowModal(false)}></div>
                </div>
            )}
        </div>
    )
}
