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

const CustomTooltip = ({ active, payload, label, hoveredLine }: any) => {
    if (active && payload && payload.length) {
        // Find the hovered line in the active payload
        const activeItem = hoveredLine 
            ? payload.find((p: any) => p.dataKey === hoveredLine)
            : null

        if (!activeItem) return null

        return (
            <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xl font-sans text-xs flex flex-col gap-1">
                <p className="font-bold text-slate-400 mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeItem.color }}></span>
                    <span className="font-semibold text-slate-700">{activeItem.name}:</span>
                    <span className="font-mono font-bold text-slate-900">{activeItem.value}</span>
                </div>
            </div>
        )
    }
    return null
}

export default function MedidasChart({ data }: MedidasChartProps) {
    const [activeMetrics, setActiveMetrics] = useState<string[]>(['peso', 'porcentajeGrasa', 'porcentajeMusculo'])
    const [hoveredLine, setHoveredLine] = useState<string | null>(null)

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

    const handleMouseMove = (state: any) => {
        if (!state || !state.activePayload || state.activePayload.length === 0) {
            setHoveredLine(null)
            return
        }

        const chartY = state.chartY
        let closestKey: string | null = null
        let minDiff = Infinity

        state.activePayload.forEach((item: any) => {
            const itemY = item.coordinate !== undefined ? item.coordinate : item.cy
            if (itemY !== undefined && itemY !== null) {
                const diff = Math.abs(chartY - itemY)
                if (diff < minDiff) {
                    minDiff = diff
                    closestKey = item.dataKey
                }
            }
        })

        // If the closest line is within 60px vertically, focus on it
        if (minDiff < 60) {
            setHoveredLine(closestKey)
        } else {
            setHoveredLine(null)
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
                    <LineChart 
                        data={chartData} 
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoveredLine(null)}
                    >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="fechaFormatted" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                            content={<CustomTooltip hoveredLine={hoveredLine} />} 
                            trigger="hover" 
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => {
                            const isHovered = hoveredLine === m.key
                            const isAnyLineHovered = hoveredLine !== null
                            return (
                                <Line
                                    key={m.key}
                                    type="monotone"
                                    dataKey={m.key}
                                    stroke={m.color}
                                    name={m.label}
                                    strokeWidth={isHovered ? 3.5 : 1.5}
                                    opacity={isAnyLineHovered ? (isHovered ? 1 : 0.15) : 0.85}
                                    dot={{ r: isHovered ? 4 : 2 }}
                                    activeDot={{ r: 6 }}
                                    className="transition-all duration-200 cursor-pointer"
                                />
                            )
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
