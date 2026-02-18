import { getAsistenciasHoy, getEstadisticasAsistencia } from '../actions/asistencia'
import AsistenciaClient from './AsistenciaClient'

export const dynamic = 'force-dynamic'

export default async function AsistenciaPage() {
    const asistencias = await getAsistenciasHoy()
    const stats = await getEstadisticasAsistencia()

    return (
        <main className="min-h-screen bg-base-200">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <AsistenciaClient
                    asistenciasIniciales={asistencias}
                    statsIniciales={stats}
                />
            </div>
        </main>
    )
}
