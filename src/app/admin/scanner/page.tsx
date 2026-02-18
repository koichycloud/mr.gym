'use client'

import { useState, useEffect, useRef } from 'react'
import QRCodeScanner from '@/app/components/scanner/QRCodeScanner'
import { validateAccess, AccessResult } from '@/app/actions/access'
import { CheckCircle, XCircle, User, AlertTriangle, Monitor } from 'lucide-react'
import Link from 'next/link'
import { Toaster, toast } from 'sonner' // Import sonner

export default function ScannerPage() {
    const [scanning, setScanning] = useState(true)
    const [result, setResult] = useState<AccessResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(5)
    const [handsFree, setHandsFree] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Broadcast Channel Ref
    const channelRef = useRef<BroadcastChannel | null>(null)

    useEffect(() => {
        channelRef.current = new BroadcastChannel('scanner_channel')
        return () => channelRef.current?.close()
    }, [])

    const handleScan = async (decodedText: string) => {
        if (loading) return // Don't block if scanning=false (manual input needs to work)

        // If coming from camera, stop it. If manual, just process.
        if (scanning) setScanning(false)

        setLoading(true)

        try {
            const validation = await validateAccess(decodedText)
            setResult(validation)
            setCountdown(5) // Reset countdown

            // Broadcast to Customer Screen
            channelRef.current?.postMessage({
                type: 'SCAN_RESULT',
                payload: validation
            })

            // Show Toast on Admin Screen
            if (validation.success) {
                toast.success(`Acceso Permitido: ${validation.socio?.nombres}`, {
                    duration: 4000,
                    style: { background: '#dcfce7', color: '#166534', fontSize: '1.2rem' }
                })
            } else {
                toast.error(`DENEGADO: ${validation.message}`, {
                    duration: 5000,
                    style: { background: '#fee2e2', color: '#991b1b', fontSize: '1.2rem' }
                })
            }

        } catch (error) {
            console.error("Scan error", error)
            toast.error("Error al validar código")
        } finally {
            setLoading(false)
        }
    }

    const resetScanner = () => {
        setResult(null)
        setScanning(true)
        // Refocus for hands-free
        if (handsFree) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }

    // Keep focus in hands-free mode
    useEffect(() => {
        if (handsFree && !result) {
            const interval = setInterval(() => {
                if (document.activeElement !== inputRef.current) {
                    inputRef.current?.focus()
                }
            }, 2000) // Check every 2s just in case
            return () => clearInterval(interval)
        }
    }, [handsFree, result])

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
            <Toaster position="top-right" richColors />

            <div className="flex w-full justify-between items-center mb-8 max-w-4xl">
                <h1 className="text-3xl font-bold text-neutral-content ">Control de Acceso 📸</h1>
                <Link href="/admin/scanner/cliente" target="_blank" className="btn btn-secondary btn-sm">
                    <Monitor size={18} />
                    Abrir Pantalla Cliente 🖥️
                </Link>
            </div>

            {/* Scanner Container */}
            {scanning && !result && (
                <div className="flex flex-col gap-6 w-full max-w-sm items-center">
                    {/* Camera Scanner */}
                    <div className="w-full bg-base-100 rounded-xl overflow-hidden shadow-2xl relative">
                        <QRCodeScanner
                            fps={10}
                            qrbox={250}
                            disableFlip={false}
                            qrCodeSuccessCallback={handleScan}
                            verbose={false}
                        />
                        <div className="p-4 text-center">
                            <p className="animate-pulse text-sm">Apunte la cámara al código QR</p>
                        </div>
                    </div>

                    <div className="divider">O USA LECTOR USB / TECLADO</div>

                    {/* Manual / USB Input */}
                    <div className="w-full flex flex-col gap-2">
                        <div className="form-control bg-base-200 rounded-lg px-4 py-2">
                            <label className="label cursor-pointer">
                                <span className="label-text font-bold">Modo "Manos Libres" (Kiosco) ⚡</span>
                                <input type="checkbox" className="toggle toggle-primary" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} />
                            </label>
                            <span className="text-xs px-1 opacity-70">
                                Mantiene el foco en el campo para escanear sin tocar el mouse.
                            </span>
                        </div>

                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={handsFree ? "LISTO PARA ESCANEAR... (MODO AUTO)" : "Haz clic y escanea con pistola USB..."}
                            className={`input input-bordered w-full text-center text-lg shadow-lg focus:input-primary ${handsFree ? 'input-primary ring-2 ring-primary/50' : ''}`}
                            autoFocus
                            onBlur={() => {
                                if (handsFree) {
                                    // Force refocus
                                    setTimeout(() => inputRef.current?.focus(), 100)
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleScan(e.currentTarget.value)
                                    e.currentTarget.value = ''
                                }
                            }}
                        />
                        <p className="text-xs text-center mt-2 opacity-60">
                            Funciona con lectores de código de barras/QR USB (Pistola o Mesa)
                        </p>
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
