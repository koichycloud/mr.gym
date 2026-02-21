import { getPagosDelDia, getResumenMensual } from '../actions/pagos'
import CajaClient from './CajaClient'

export const dynamic = 'force-dynamic'

export default async function CajaPage() {
    const { pagos, totalDia, desglose } = await getPagosDelDia()
    const resumenMensual = await getResumenMensual()

    return (
        <main className="min-h-screen bg-white">
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <CajaClient
                    pagosIniciales={pagos}
                    totalDiaInicial={totalDia}
                    desgloseInicial={desglose}
                    resumenMensual={resumenMensual}
                />
            </div>
        </main>
    )
}
