'use client'

import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns'

interface MedidasChartProps {
    data: any[]
}

const METRICS = [
    { key: 'peso', label: 'Peso (kg)', color: '#8884d8' },
    { key: 'porcentajeGrasa', label: '% Grasa', color: '#82ca9d' },
    { key: 'porcentajeMusculo', label: '% Músculo', color: '#ffc658' },
    { key: 'cuello', label: 'Cuello (cm)', color: '#ff8042' },
    { key: 'hombros', label: 'Hombros (cm)', color: '#00c49f' },
    { key: 'pecho', label: 'Pecho (cm)', color: '#0088fe' },
    { key: 'biceps', label: 'Bíceps (cm)', color: '#ffbb28' },
    { key: 'antebrazos', label: 'Antebrazos (cm)', color: '#d0ed57' },
    { key: 'cintura', label: 'Cintura (cm)', color: '#a4de6c' },
    { key: 'vientreBajo', label: 'Vientre Bajo (cm)', color: '#83a6ed' },
    { key: 'gluteos', label: 'Glúteos (cm)', color: '#8dd1e1' },
    { key: 'cuadriceps', label: 'Cuádriceps (cm)', color: '#e84393' },
    { key: 'pantorrillas', label: 'Pantorrillas (cm)', color: '#6c5ce7' },
]

export default function MedidasChart({ data }: MedidasChartProps) {
    const [activeMetrics, setActiveMetrics] = useState<string[]>(['peso', 'porcentajeGrasa', 'porcentajeMusculo'])

    if (!data || data.length === 0) {
        return <div className="text-center p-10 opacity-50">No hay suficientes datos para la gráfica</div>
    }

    // Format Data for Chart
    const chartData = data.map(m => ({
        ...m,
        fechaFormatted: format(new Date(m.fecha), 'dd/MM/yy'),
    }))

    const toggleMetric = (key: string) => {
        if (activeMetrics.includes(key)) {
            if (activeMetrics.length > 1) {
                setActiveMetrics(activeMetrics.filter(k => k !== key))
            }
        } else {
            setActiveMetrics([...activeMetrics, key])
        }
    }

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Interactive Selector Chips */}
            <div className="flex flex-wrap gap-1.5 justify-center bg-base-200/50 p-3 rounded-xl border border-base-200 max-h-[140px] overflow-y-auto">
                {METRICS.map(m => {
                    const isActive = activeMetrics.includes(m.key)
                    return (
                        <button
                            key={m.key}
                            onClick={() => toggleMetric(m.key)}
                            className={`btn btn-xs rounded-full border-none transition-all duration-200 text-[10px] h-6 px-3 ${
                                isActive 
                                    ? 'text-white font-bold shadow-sm' 
                                    : 'bg-base-100 text-base-content/60 hover:bg-base-300'
                            }`}
                            style={isActive ? { backgroundColor: m.color } : {}}
                        >
                            {m.label}
                        </button>
                    )
                })}
            </div>

            {/* Line Chart */}
            <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="fechaFormatted" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => (
                            <Line
                                key={m.key}
                                type="monotone"
                                dataKey={m.key}
                                stroke={m.color}
                                name={m.label}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
