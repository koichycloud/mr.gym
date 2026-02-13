'use client'

import { useState, useEffect } from 'react'
import QRCodeScanner from '@/app/components/scanner/QRCodeScanner'
import { validateAccess, AccessResult } from '@/app/actions/access'
import { CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react'

export default function ScannerPage() {
    const [scanning, setScanning] = useState(true)
    const [result, setResult] = useState<AccessResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(5)

    const handleScan = async (decodedText: string) => {
        if (loading || !scanning) return

        setScanning(false) // Stop scanning momentarily
        setLoading(true)

        try {
            const validation = await validateAccess(decodedText)
            setResult(validation)
            setCountdown(5) // Reset countdown
        } catch (error) {
            console.error("Scan error", error)
        } finally {
            setLoading(false)
        }
    }

    const resetScanner = () => {
        setResult(null)
        setScanning(true)
    }

    // Auto-reset effect
    useEffect(() => {
        let timer: NodeJS.Timeout
        let interval: NodeJS.Timeout

        if (result) {
            timer = setTimeout(() => {
                resetScanner()
            }, 5000)

            interval = setInterval(() => {
                setCountdown((prev) => Math.max(0, prev - 1))
            }, 1000)
        }

        return () => {
            clearTimeout(timer)
            clearInterval(interval)
        }
    }, [result])

    return (
        <div className="min-h-screen bg-neutral p-4 flex flex-col items-center">
            <h1 className="text-3xl font-bold text-neutral-content mb-8 mt-4">Control de Acceso 📸</h1>

            {/* Scanner Container */}
            {scanning && !result && (
                <div className="w-full max-w-sm bg-base-100 rounded-xl overflow-hidden shadow-2xl relative">
                    <QRCodeScanner
                        fps={10}
                        qrbox={250}
                        disableFlip={false}
                        qrCodeSuccessCallback={handleScan}
                        verbose={false}
                    />
                    <div className="p-4 text-center">
                        <p className="animate-pulse">Esperando código QR...</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center p-12">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-neutral-content">Validando...</p>
                </div>
            )}

            {/* Result Card */}
            {result && (
                <div className={`card w-full max-w-sm shadow-2xl ${result.success ? 'bg-success text-success-content' : 'bg-error text-error-content'
                    }`}>
                    <div className="card-body items-center text-center">
                        {result.success ? (
                            <CheckCircle size={80} className="mb-2" />
                        ) : (
                            <XCircle size={80} className="mb-2" />
                        )}

                        <h2 className="card-title text-3xl font-black">{result.message}</h2>

                        {result.socio && (
                            <div className="mt-4 p-4 bg-white/20 rounded-lg w-full">
                                <div className="avatar placeholder mb-2">
                                    <div className="bg-neutral-focus text-neutral-content rounded-full w-16">
                                        <span className="text-3xl">{result.socio.nombres[0]}</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold">{result.socio.nombres} {result.socio.apellidos}</h3>
                                <p className="uppercase font-mono opacity-80">{result.socio.estado}</p>

                                {result.socio.diasVencimiento !== undefined && (
                                    <div className="mt-2 text-sm font-bold">
                                        {result.success
                                            ? `Vence en ${result.socio.diasVencimiento} días`
                                            : `Vencido hace ${result.socio.diasVencimiento} días`
                                        }
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="card-actions justify-end mt-6 w-full flex-col gap-2">
                            <progress className="progress progress-primary w-full" value={countdown} max="5"></progress>
                            <p className="text-xs text-center opacity-70">Siguiente escaneo en {countdown}s...</p>

                            <button className="btn btn-block btn-outline border-2 border-white/40 text-white hover:bg-white hover:text-black" onClick={resetScanner}>
                                Escanear Siguiente (Ahora)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
