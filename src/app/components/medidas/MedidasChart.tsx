'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns'

interface MedidasChartProps {
    data: any[]
}

export default function MedidasChart({ data }: MedidasChartProps) {
    if (!data || data.length === 0) {
        return <div className="text-center p-10 opacity-50">No hay suficientes datos para la gráfica</div>
    }

    // Format Data for Chart
    const chartData = data.map(m => ({
        ...m,
        fechaFormatted: format(new Date(m.fecha), 'dd/MM/yy'),
    }))

    return (
        <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fechaFormatted" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {/* Main lines */}
                    <Line type="monotone" dataKey="peso" stroke="#8884d8" name="Peso (kg)" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="porcentajeGrasa" stroke="#82ca9d" name="% Grasa" />
                    <Line type="monotone" dataKey="porcentajeMusculo" stroke="#ffc658" name="% Musculo" />
                    {/* Muscle groups - hidden by default unless we toggle? For now show all or split? 
                        Let's show Peso and Grasa as main ones. 
                    */}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
