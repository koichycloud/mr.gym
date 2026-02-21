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

    // Draggable State - Init with 0 to avoid SSR window error
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

    // Check permission status on mount
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
    const [swActive, setSwActive] = useState(false)

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission)
        }
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    console.log('SW Registered', reg)
                    reg.update() // Try to update immediately
                    if (navigator.serviceWorker.controller) {
                        setSwActive(true)
                    }
                })
                .catch(err => console.error('SW Registration failed', err))

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log("SW Controller Changed!", navigator.serviceWorker.controller)
                setSwActive(true)
                toast.success("Service Worker activado y controlando.")
            })
        }
    }, [])

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            setNotificationPermission(permission)
            if (permission === 'granted') {
                toast.success("Notificaciones activadas")
                new Notification("Prueba", { body: "Las notificaciones están funcionando correctamente" })
            } else {
                toast.error("Permiso denegado para notificaciones")
            }
        }
    }

    // Set initial position on mount (client-side only)
    useEffect(() => {
        setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                })
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])

    useEffect(() => {
        channelRef.current = new BroadcastChannel('scanner_channel')
        return () => channelRef.current?.close()
    }, [])

    // Request Notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
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

            // System Notification (Always on Top)
            // System Notification (Always on Top) via Service Worker
            if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(validation.success ? '✅ Acceso PERMITIDO' : '❌ Acceso DENEGADO', {
                        body: `${validation.socio?.nombres || 'Desconocido'} - ${validation.message}`,
                        icon: validation.socio?.foto || '/icon.png',
                        silent: false,
                        vibrate: [200, 100, 200]
                    })
                })
            }

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
        <div className="min-h-screen bg-white p-4 flex flex-col items-center">
            <Toaster position="top-right" richColors />

            <div className="flex w-full justify-between items-center mb-8 max-w-4xl">
                <h1 className="text-3xl font-bold text-neutral-content ">Control de Acceso 📸</h1>
                <div className="flex gap-2">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-xs opacity-70">
                            Estado Notificaciones: <span className={`font-bold ${notificationPermission === 'granted' ? 'text-success' : 'text-warning'}`}>{notificationPermission}</span>
                        </span>
                        <div className="text-[10px] opacity-50 text-right">
                            SW: {swActive ? 'Activo ✅' : 'Inactivo ❌'}
                        </div>
                        {notificationPermission !== 'granted' && (
                            <button className="btn btn-info btn-xs animate-pulse mt-1" onClick={requestNotificationPermission}>
                                🔔 Activar
                            </button>
                        )}
                    </div>

                    <button className="btn btn-warning btn-sm" onClick={() => {
                        // 1. Trigger App Alert
                        setResult({
                            success: true,
                            message: "Acceso Simulado",
                            socio: {
                                nombres: "Usuario",
                                apellidos: "Prueba",
                                foto: "https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg",
                                estado: "ACTIVO",
                                diasVencimiento: 30
                            }
                        })

                        // 2. Trigger System Notification (Explicitly)
                        // 2. Trigger System Notification (Explicitly) via SW
                        // DIAGNOSTIC BLOCK

                        if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                            // Check controller
                            if (!navigator.serviceWorker.controller) {
                                toast.error("SW no controla la página. Se intentará usar registro directo.")
                            }

                            // Try to get registration directly first (faster than waiting for ready if already there)
                            navigator.serviceWorker.getRegistration().then(reg => {
                                if (!reg) {
                                    toast.error("No se encontró registro de SW.")
                                    return
                                }

                                console.log("SW Registration found:", reg)

                                // FORCE UPDATE
                                reg.update().catch(console.warn)

                                toast.promise(
                                    reg.showNotification("✅ Acceso Simulado", {
                                        body: "Usuario Prueba - ACTIVO (Diagnóstico)",
                                        silent: false,
                                        // Removed complex options that might cause hangs
                                        tag: 'test-notification-' + Date.now()
                                    }),
                                    {
                                        loading: 'Enviando notificación al sistema...',
                                        success: '¡Promesa resuelta! (Debería verse)',
                                        error: (err) => `Error al mostrar: ${err.message}`
                                    }
                                )
                            }).catch(err => {
                                console.error("GetRegistration Error", err)
                                toast.error("Error crítico SW: " + err.message)
                            })

                        } else {
                            toast.error(`No hay permiso o SW: ${Notification.permission}`)
                        }
                    }}>
                        🧪 Diagnóstico Notif
                    </button>
                    <Link href="/admin/scanner/cliente" target="_blank" className="btn btn-secondary btn-sm">
                        <Monitor size={18} />
                        Abrir Pantalla Cliente 🖥️
                    </Link>
                </div>
            </div>

            {/* Scanner Container */}
            {
                scanning && !result && (
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
                )
            }

            {/* Loading State */}
            {
                loading && (
                    <div className="flex flex-col items-center justify-center p-12">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <p className="mt-4 text-neutral-content">Validando...</p>
                    </div>
                )
            }

            {/* Draggable Larger Alert */}
            {
                result && (
                    <div
                        className={`fixed z-50 shadow-2xl cursor-move select-none rounded-2xl overflow-hidden flex items-center pr-6 pl-0 py-0 gap-4 border-4 ${result.success ? 'bg-black/90 border-success text-success' : 'bg-black/90 border-error text-error'} backdrop-blur-md`}
                        style={{
                            left: position.x,
                            top: position.y,
                            transform: 'translate(-50%, -50%)',
                            touchAction: 'none',
                            minWidth: '450px',
                            minHeight: '140px'
                        }}
                        onMouseDown={handleMouseDown}
                    >
                        {/* Drag Handle Area (Left Side) */}
                        <div className={`h-full self-stretch w-24 flex items-center justify-center ${result.success ? 'bg-success text-black' : 'bg-error text-white'}`}>
                            {result.success ? <CheckCircle size={48} /> : <XCircle size={48} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-center py-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="font-bold text-3xl leading-tight text-white">
                                    {result.socio?.nombres || result.message}
                                </h2>
                            </div>

                            <div className="text-lg font-mono opacity-90 flex gap-3 text-white/80">
                                <span className="font-bold px-2 py-1 bg-white/10 rounded">{result.socio?.estado || 'DESCONOCIDO'}</span>
                                {result.socio?.diasVencimiento !== undefined && (
                                    <span className="flex items-center">📅 {result.socio?.diasVencimiento} días</span>
                                )}
                            </div>
                        </div>

                        {/* Photo (Right Side) */}
                        {result.socio?.foto ? (
                            <div className="avatar mr-4">
                                <div className="w-24 h-24 rounded-full ring-4 ring-white/20 ring-offset-base-100 ring-offset-0">
                                    <img src={result.socio.foto} alt="avatar" className="object-cover" />
                                </div>
                            </div>
                        ) : (
                            <div className="avatar placeholder mr-4">
                                <div className="bg-neutral-focus text-neutral-content rounded-full w-24 h-24 flex items-center justify-center">
                                    <span className="text-4xl font-bold">{result.socio?.nombres?.[0] || '?'}</span>
                                </div>
                            </div>
                        )}

                        {/* Close/Countdown */}
                        <div
                            className="radial-progress text-lg font-bold text-white/60 absolute top-2 right-2"
                            style={{ "--value": (countdown / 5) * 100, "--size": "2rem" } as any}
                        >
                            {countdown}
                        </div>
                    </div>
                )
            }
        </div >
    )
}
