'use client'

import { useState } from 'react'
import { getAsistenciasPorFecha } from '../actions/asistencia'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Clock, Users, TrendingUp, BarChart3 } from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

type Asistencia = {
    id: string
    socioId: string
    fecha: Date
    tipo: string
    socio: {
        codigo: string
        nombres: string | null
        apellidos: string | null
        sexo: string
    }
}

type Stats = {
    totalHoy: number
    horaPico: string
    promedioSemanal: number
    diasSemana: Record<string, number>
}

type Props = {
    asistenciasIniciales: Asistencia[]
    statsIniciales: Stats
}

const COLORES_BARRAS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#6366f1',
]

export default function AsistenciaClient({ asistenciasIniciales, statsIniciales }: Props) {
    const [asistencias, setAsistencias] = useState<Asistencia[]>(asistenciasIniciales)
    const [stats] = useState<Stats>(statsIniciales)
    const [fechaSeleccionada, setFechaSeleccionada] = useState(
        format(new Date(), 'yyyy-MM-dd')
    )
    const [loading, setLoading] = useState(false)

    const buscarPorFecha = async (fecha: string) => {
        setFechaSeleccionada(fecha)
        setLoading(true)
        try {
            const resultado = await getAsistenciasPorFecha(new Date(fecha + 'T00:00:00'))
            setAsistencias(resultado as Asistencia[])
        } catch (error) {
            console.error('Error buscando asistencias:', error)
        } finally {
            setLoading(false)
        }
    }

    const esHoy = fechaSeleccionada === format(new Date(), 'yyyy-MM-dd')

    // Prepare chart data from stats
    const datosGrafica = Object.entries(stats.diasSemana).map(([dia, total]) => ({
        dia: dia.charAt(0).toUpperCase() + dia.slice(1),
        asistencias: total
    }))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary flex items-center gap-2">
                        <CalendarDays size={32} />
                        Registro de Asistencia
                    </h1>
                    <p className="text-base-content/60 mt-1">
                        Control de ingresos al gimnasio
                    </p>
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-semibold">Filtrar por fecha</span>
                    </label>
                    <input
                        type="date"
                        className="input input-bordered input-primary"
                        value={fechaSeleccionada}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => buscarPorFecha(e.target.value)}
                    />
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stats shadow bg-base-100">
                    <div className="stat">
                        <div className="stat-figure text-primary">
                            <Users className="inline-block w-8 h-8 stroke-current" />
                        </div>
                        <div className="stat-title">
                            {esHoy ? 'Asistencias Hoy' : 'Asistencias'}
                        </div>
                        <div className="stat-value text-primary">
                            {esHoy ? stats.totalHoy : asistencias.length}
                        </div>
                        <div className="stat-desc">
                            {esHoy
                                ? format(new Date(), "EEEE d 'de' MMMM", { locale: es })
                                : format(new Date(fechaSeleccionada + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
                            }
                        </div>
                    </div>
                </div>

                <div className="stats shadow bg-base-100">
                    <div className="stat">
                        <div className="stat-figure text-secondary">
                            <Clock className="inline-block w-8 h-8 stroke-current" />
                        </div>
                        <div className="stat-title">Hora Pico (Hoy)</div>
                        <div className="stat-value text-secondary text-2xl">{stats.horaPico}</div>
                        <div className="stat-desc">Mayor concentración</div>
                    </div>
                </div>

                <div className="stats shadow bg-base-100">
                    <div className="stat">
                        <div className="stat-figure text-accent">
                            <TrendingUp className="inline-block w-8 h-8 stroke-current" />
                        </div>
                        <div className="stat-title">Promedio Semanal</div>
                        <div className="stat-value text-accent">{stats.promedioSemanal}</div>
                        <div className="stat-desc">Asistencias/día (últimos 7 días)</div>
                    </div>
                </div>
            </div>

            {/* Weekly Chart */}
            {datosGrafica.length > 0 && (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title flex items-center gap-2">
                            <BarChart3 size={22} className="text-primary" />
                            Asistencia Semanal
                        </h2>
                        <p className="text-sm text-base-content/50 -mt-1">Últimos 7 días</p>
                        <div className="w-full h-72 mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={datosGrafica} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="dia"
                                        tick={{ fontSize: 13, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                            fontWeight: 600
                                        }}
                                        formatter={(value: number | undefined) => [`${value ?? 0} asistencias`, 'Total']}
                                        cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                                    />
                                    <Bar
                                        dataKey="asistencias"
                                        radius={[8, 8, 0, 0]}
                                        maxBarSize={60}
                                    >
                                        {datosGrafica.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORES_BARRAS[index % COLORES_BARRAS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Table */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">
                        Registros del {esHoy ? 'día de hoy' : format(new Date(fechaSeleccionada + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })}
                    </h2>

                    {loading ? (
                        <div className="flex justify-center p-12">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    ) : asistencias.length === 0 ? (
                        <div className="text-center py-12 text-base-content/50">
                            <CalendarDays size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg">No hay registros para esta fecha</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Hora</th>
                                        <th>Código</th>
                                        <th>Socio</th>
                                        <th>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {asistencias.map((a, index) => (
                                        <tr key={a.id} className="hover">
                                            <td className="font-mono text-sm opacity-60">
                                                {asistencias.length - index}
                                            </td>
                                            <td className="font-bold text-primary">
                                                {format(new Date(a.fecha), 'HH:mm:ss')}
                                            </td>
                                            <td className="font-mono">{a.socio.codigo}</td>
                                            <td>
                                                <span className={`px-2 py-1 rounded text-sm font-semibold ${a.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {a.socio.nombres} {a.socio.apellidos}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="badge badge-success badge-sm">
                                                    {a.tipo}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

