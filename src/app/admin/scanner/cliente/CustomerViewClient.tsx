'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, User } from 'lucide-react'

export default function CustomerViewClient() {
    const [lastScan, setLastScan] = useState<any>(null)
    const [showWelcome, setShowWelcome] = useState(false)

    useEffect(() => {
        const channel = new BroadcastChannel('scanner_channel')

        channel.onmessage = (event) => {
            if (event.data.type === 'SCAN_RESULT') {
                setLastScan(event.data.payload)
                setShowWelcome(true)

                // Auto hide after 5 seconds
                setTimeout(() => {
                    setShowWelcome(false)
                    // Optional: clear lastScan after animation
                }, 5000)
            }
        }

        return () => {
            channel.close()
        }
    }, [])

    if (!showWelcome) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center animate-fade-in" style={{ backgroundColor: '#3f2009' }}>
                <div className="max-w-4xl w-full">
                    <h1 className="text-[110px] font-black text-white mb-8 tracking-tighter uppercase drop-shadow-lg" style={{ WebkitTextStroke: '4px black', paintOrder: 'stroke fill' }}>
                        Mr. Gym
                    </h1>
                    <p className="text-[51px] font-light" style={{ color: '#cc99ff', opacity: 0.7 }}>
                        Bienvenido al mejor lugar para entrenar.
                    </p>
                    <div className="mt-16 animate-pulse">
                        <p className="text-[28px] text-white font-bold">Por favor, escanea tu código para ingresar 👋</p>
                    </div>
                </div>
            </div>
        )
    }

    const isSuccess = lastScan?.success
    const socio = lastScan?.socio

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 ${isSuccess ? 'bg-success' : 'bg-error'
            }`}>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-16 shadow-2xl max-w-5xl w-full border-4 border-white/20 animate-scale-in">

                {isSuccess ? (
                    <CheckCircle className="mx-auto text-white w-48 h-48 mb-8 drop-shadow-md" />
                ) : (
                    <XCircle className="mx-auto text-white w-48 h-48 mb-8 drop-shadow-md" />
                )}

                <h1 className="text-[6rem] font-black text-white leading-none mb-4 uppercase drop-shadow-md">
                    {isSuccess ? 'BIENVENIDO' : 'DENEGADO'}
                </h1>

                <h2 className="text-[4rem] font-bold text-white mb-8 drop-shadow-sm">
                    {socio?.nombres}
                </h2>

                {!isSuccess && (
                    <div className="bg-white/90 text-error rounded-xl p-8 text-4xl font-bold">
                        {lastScan?.message || "Consulte en recepción"}
                    </div>
                )}

                {isSuccess && socio?.diasVencimiento !== undefined && (
                    <div className="bg-white/20 text-white rounded-xl p-6 text-3xl font-mono inline-block mt-4">
                        Tu plan vence en {socio.diasVencimiento} días
                    </div>
                )}
            </div>
        </div>
    )
}
