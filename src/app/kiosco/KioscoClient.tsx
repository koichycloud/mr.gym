'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { validateKioskAccess, AccessResult } from '../actions/kiosco'
import { CheckCircle, XCircle, AlertTriangle, ScanLine, Dumbbell, DoorOpen, Clock } from 'lucide-react'

type KioskState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'SUCCESS_EXIT' | 'ERROR_NOT_FOUND' | 'ERROR_EXPIRED' | 'ERROR_PASSBACK' | 'SCREENSAVER'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutos
const DISPLAY_SECONDS = 5 // Segundos en pantalla antes de regresar a IDLE

export default function KioscoClient() {
    const [state, setState] = useState<KioskState>('IDLE')
    const [result, setResult] = useState<AccessResult | null>(null)
    const [currentInput, setCurrentInput] = useState('')
    const [timeLeft, setTimeLeft] = useState<number>(0)
    const [selectedMode, setSelectedMode] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA')
    
    const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    
    const isProcessingRef = useRef(false)
    const lastScanDataRef = useRef<{ code: string; time: number } | null>(null)

    const returnToIdle = useCallback(() => {
        setState('IDLE')
        setResult(null)
        setCurrentInput('')
        setTimeLeft(0)
        setSelectedMode('ENTRADA')
    }, [])

    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(() => {
            setState('SCREENSAVER')
        }, IDLE_TIMEOUT_MS)
    }, [])

    const startCountdown = useCallback(() => {
        if (resetTimeoutRef.current) clearInterval(resetTimeoutRef.current)
        setTimeLeft(DISPLAY_SECONDS)
        resetTimeoutRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (resetTimeoutRef.current) clearInterval(resetTimeoutRef.current)
                    returnToIdle()
                    resetIdleTimer()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [returnToIdle, resetIdleTimer])

    const handleScan = useCallback(async (scannedCode: string) => {
        const code = scannedCode.trim()
        if (!code) return

        const now = Date.now()
        const isSameCode = lastScanDataRef.current?.code === code
        const isRecent = lastScanDataRef.current && (now - lastScanDataRef.current.time) < 5000 // Anti-rebote 5 seg

        if (isSameCode && isRecent) {
            return
        }

        if (isProcessingRef.current) {
            return
        }

        isProcessingRef.current = true
        lastScanDataRef.current = { code, time: now }

        if (resetTimeoutRef.current) clearInterval(resetTimeoutRef.current)
        
        setState('LOADING')
        setTimeLeft(0)
        
        try {
            const scanResult = await validateKioskAccess(code, selectedMode)
            setResult(scanResult)

            if (scanResult.success) {
                if (scanResult.tipoAcceso === 'SALIDA') {
                    setState('SUCCESS_EXIT')
                } else {
                    setState('SUCCESS')
                }
            } else if (scanResult.reason === 'PASSBACK') {
                setState('ERROR_PASSBACK')
            } else if (scanResult.reason === 'EXPIRED') {
                setState('ERROR_EXPIRED')
            } else {
                setState('ERROR_NOT_FOUND')
            }

            startCountdown()

        } catch (error) {
            console.error("No se pudo conectar servidor", error)
            setResult({ success: false, message: 'Error de Conexión', reason: 'NOT_FOUND' })
            setState('ERROR_NOT_FOUND')
            startCountdown()
        } finally {
            isProcessingRef.current = false
        }
    }, [startCountdown, selectedMode])

    useEffect(() => {
        resetIdleTimer()

        const handleInteraction = () => {
            setState(prev => prev === 'SCREENSAVER' ? 'IDLE' : prev)
            resetIdleTimer()
        }

        window.addEventListener('mousemove', handleInteraction)
        window.addEventListener('touchstart', handleInteraction)
        window.addEventListener('click', handleInteraction)

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            window.removeEventListener('mousemove', handleInteraction)
            window.removeEventListener('touchstart', handleInteraction)
            window.removeEventListener('click', handleInteraction)
        }
    }, [resetIdleTimer])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            resetIdleTimer()
            setState(prev => prev === 'SCREENSAVER' ? 'IDLE' : prev)

            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') return

            if (e.key === 'Enter') {
                e.preventDefault() 
                if (currentInput.length > 0) {
                    handleScan(currentInput)
                    setCurrentInput('') 
                }
            } else {
                if (e.key.length === 1) {
                    setCurrentInput(prev => prev + e.key)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [currentInput, handleScan, resetIdleTimer])

    const renderPhotoCircle = (colorClass: string) => (
        <div className={`w-[26rem] h-[26rem] rounded-full flex items-center justify-center overflow-hidden border-8 shadow-[0_0_60px_currentColor] mb-10 bg-black/40 ${colorClass}`}>
            <img 
                src={result?.socio?.fotoUrl || '/icons/icon-512x512.png'} 
                alt="Foto" 
                className={`w-full h-full ${result?.socio?.fotoUrl ? 'object-cover' : 'object-contain p-6'}`} 
            />
        </div>
    )

    const renderScreensaver = () => (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden z-[100] animate-in fade-in duration-1000">
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slowFloat {
                    0%, 100% { transform: translateY(0) rotate(-10deg); }
                    50% { transform: translateY(-40px) rotate(10deg); }
                }
                @keyframes logoFloat {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
                    50% { transform: translateY(-30px) scale(1.03); opacity: 0.35; }
                }
            `}} />
            {/* Logo flotante de fondo en el screensaver */}
            <img
                src="/mr_gym_logo.png"
                alt=""
                style={{ animation: 'logoFloat 10s ease-in-out infinite', mixBlendMode: 'screen' }}
                className="absolute w-[75vmin] h-[75vmin] object-contain pointer-events-none"
            />
            <div style={{ animation: 'slowFloat 8s ease-in-out infinite' }} className="flex flex-col items-center relative z-10">
                <Dumbbell size={380} strokeWidth={1} className="text-primary opacity-20 mb-16 drop-shadow-[0_0_80px_rgba(255,255,255,0.1)]" />
                <h2 className="text-4xl text-white/30 font-light tracking-[0.4em] uppercase text-center mb-6">
                    Mr. Gym
                </h2>
                <div className="animate-pulse bg-primary/20 text-primary px-8 py-3 rounded-full border border-primary/30">
                    <p className="text-xl tracking-widest font-bold uppercase">Escanea para continuar</p>
                </div>
            </div>
        </div>
    )

    const renderContent = () => {

        if (state === 'LOADING') {
            return (
                <div className="flex flex-col items-center justify-center animate-pulse text-base-content">
                    <Dumbbell size={180} className="mb-8 animate-spin" style={{ animationDuration: '3s' }} />
                    <h1 className="text-6xl font-black tracking-tight">Procesando...</h1>
                </div>
            )
        }

        if (state === 'SUCCESS' && result?.socio) {
            return (
                <div className="flex flex-col items-center justify-center text-green-500 text-center animate-in zoom-in duration-300">
                    {renderPhotoCircle('border-green-500/50 text-green-500')}
                    <h1 className="text-[6rem] leading-none font-black text-green-400 mb-6 drop-shadow-md tracking-tighter">
                        ¡BIENVENIDO!
                    </h1>
                    <h2 className="text-[4.5rem] leading-tight font-bold text-white mb-6">
                        {result.socio.nombres}<br />{result.socio.apellidos}
                    </h2>
                    {result.socio.diasVencimiento !== undefined && result.socio.diasVencimiento <= 5 && (
                        <div className="mt-8 bg-black/30 backdrop-blur-md px-12 py-6 rounded-full border-2 border-orange-500/50 flex items-center gap-6">
                            <AlertTriangle size={64} className="text-orange-400" />
                            <p className="text-4xl text-orange-400 font-bold tracking-wide">
                                Te quedan <span className="text-white text-5xl mx-2 font-black">{result.socio.diasVencimiento}</span> días
                            </p>
                        </div>
                    )}
                </div>
            )
        }

        if (state === 'SUCCESS_EXIT' && result?.socio) {
            return (
                <div className="flex flex-col items-center justify-center text-blue-500 text-center animate-in slide-in-from-top duration-300">
                    {renderPhotoCircle('border-blue-500/50 text-blue-500')}
                    <h1 className="text-[5.5rem] leading-none font-black text-blue-400 mb-4 drop-shadow-md tracking-tighter uppercase px-4">
                        ¡BUEN ENTRENAMIENTO!
                    </h1>
                    <h2 className="text-[4rem] leading-tight font-bold text-white mb-4">
                        {result.socio.nombres}
                    </h2>
                    <div className="mt-8 bg-black/30 px-12 py-6 rounded-full border-2 border-blue-500/50 flex items-center gap-6">
                        <DoorOpen size={64} className="text-blue-400" />
                        <p className="text-4xl text-blue-300 font-bold tracking-wide uppercase">
                            HASTA PRONTO
                        </p>
                    </div>
                </div>
            )
        }

        if (state === 'ERROR_PASSBACK' && result?.socio) {
            return (
                <div className="flex flex-col items-center justify-center text-yellow-500 text-center animate-in wobble duration-300 px-8">
                    {renderPhotoCircle('border-yellow-500/50 text-yellow-500 grayscale opacity-80')}
                    <h1 className="text-[5.5rem] leading-none font-black text-yellow-500 mb-2 drop-shadow-md">
                        ¡ESPERA!
                    </h1>
                    <h2 className="text-[3rem] font-bold text-white mb-2 leading-tight">
                        {result.socio.nombres}
                    </h2>
                    <div className="bg-black/60 px-8 py-6 rounded-[2rem] border-4 border-yellow-500/30 flex flex-col items-center mt-4">
                        <Clock size={60} className="text-yellow-400 mb-2" />
                        <p className="text-3xl text-yellow-300 font-medium tracking-wide">
                            {result.message}
                        </p>
                        <p className="text-xl text-white/50 font-medium mt-2">
                            Por seguridad, usa tu código 15 minutos después.
                        </p>
                    </div>
                </div>
            )
        }

        if (state === 'ERROR_EXPIRED' && result?.socio) {
            return (
                <div className="flex flex-col items-center justify-center text-red-500 text-center animate-in slide-in-from-bottom flex-1 px-8">
                    {renderPhotoCircle('border-red-500/50 text-red-500')}
                    <h1 className="text-[6.5rem] leading-none font-black text-red-500 mb-6 drop-shadow-md">
                        ¡VENCIDO!
                    </h1>
                    <h2 className="text-[4rem] font-bold text-white mb-4 leading-tight">
                        {result.socio.nombres} {result.socio.apellidos}
                    </h2>
                    <p className="text-4xl text-red-300 mt-4 font-medium tracking-wide bg-black/40 px-10 py-5 rounded-3xl">
                        Acércate a recepción para renovar.<br />
                        <span className="font-bold block mt-2 text-red-400">Venció hace {result.socio.diasVencimiento} días</span>
                    </p>
                </div>
            )
        }

        if (state === 'ERROR_NOT_FOUND') {
            return (
                <div className="flex flex-col items-center justify-center text-orange-500 text-center animate-in fade-in slide-in-from-top-10 px-8">
                    <XCircle size={220} className="mb-12 drop-shadow-[0_0_40px_rgba(249,115,22,0.4)]" />
                    <h1 className="text-[6.5rem] leading-none font-black text-orange-500 drop-shadow-md mb-8">
                        DENEGADO
                    </h1>
                    <p className="text-5xl font-semibold text-orange-100 bg-black/40 px-10 py-6 rounded-3xl tracking-wide max-w-4xl leading-tight">
                        {result?.message || 'Código no reconocido o invalido.'}
                    </p>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center justify-center text-center opacity-90 transition-opacity hover:opacity-100 w-full max-w-6xl mx-auto px-8 animate-in fade-in duration-500">
                <h1 className="text-5xl font-semibold text-white/50 tracking-widest uppercase mb-12">
                    Selecciona tu Acción
                </h1>
                
                <div className="flex gap-[80px] w-full max-w-5xl justify-center mb-16">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedMode('ENTRADA'); resetIdleTimer(); }}
                        className={`flex-1 py-16 rounded-[4rem] border-8 transition-all duration-300 transform cursor-pointer pointer-events-auto ${selectedMode === 'ENTRADA' ? 'bg-zinc-900/90 backdrop-blur-xl border-green-500 scale-105 shadow-[0_0_80px_rgba(34,197,94,0.6)]' : 'bg-zinc-900/60 backdrop-blur-md border-green-900/80 scale-95 opacity-90 hover:opacity-100 hover:border-green-700'}`}
                    >
                        <h2 className={`text-7xl font-black tracking-widest ${selectedMode === 'ENTRADA' ? 'text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'text-green-700'}`}>ENTRADA</h2>
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedMode('SALIDA'); resetIdleTimer(); }}
                        className={`flex-1 py-16 rounded-[4rem] border-8 transition-all duration-300 transform cursor-pointer pointer-events-auto ${selectedMode === 'SALIDA' ? 'bg-zinc-900/90 backdrop-blur-xl border-blue-500 scale-105 shadow-[0_0_80px_rgba(59,130,246,0.6)]' : 'bg-zinc-900/60 backdrop-blur-md border-blue-900/80 scale-95 opacity-90 hover:opacity-100 hover:border-blue-700'}`}
                    >
                        <h2 className={`text-7xl font-black tracking-widest ${selectedMode === 'SALIDA' ? 'text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'text-blue-700'}`}>SALIDA</h2>
                    </button>
                </div>

                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
                    <ScanLine size={120} className="text-white/60 relative drop-shadow-2xl" />
                </div>
                <p className="text-5xl font-bold text-white tracking-[0.2em] bg-black/50 px-16 py-8 rounded-full border border-white/10 uppercase drop-shadow-lg">
                    Escanea tu Código
                </p>
            </div>
        )
    }

    const getBgColor = () => {
        if (state === 'SUCCESS') return 'bg-gradient-to-b from-green-950 via-green-900 to-black'
        if (state === 'SUCCESS_EXIT') return 'bg-gradient-to-b from-blue-950 via-indigo-950 to-black'
        if (state === 'ERROR_EXPIRED') return 'bg-gradient-to-b from-red-950 via-red-900 to-black'
        if (state === 'ERROR_NOT_FOUND') return 'bg-gradient-to-b from-orange-950 via-orange-900 to-black'
        if (state === 'ERROR_PASSBACK') return 'bg-gradient-to-b from-yellow-950 via-yellow-900 to-black'
        if (state === 'SCREENSAVER') return 'bg-black'
        return 'bg-gradient-to-br from-[#4a2e15] via-[#241306] to-[#0a0502]'
    }

    return (
        <div className={`min-h-screen w-full relative flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000 select-none ${getBgColor()}`}>
            
            {/* Marca de agua logo IDLE — mix-blend-mode screen elimina el fondo gris del PNG */}
            {state === 'IDLE' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
                    <img 
                        src="/mr_gym_logo.png" 
                        alt="" 
                        style={{ mixBlendMode: 'screen', opacity: 0.55 }}
                        className="w-[90vmin] h-[90vmin] max-w-[900px] max-h-[900px] object-contain drop-shadow-[0_0_120px_rgba(255,165,0,0.4)]" 
                    />
                </div>
            )}

            {/* Screensaver a nivel raíz con fixed para cubrir pantalla completa */}
            {state === 'SCREENSAVER' && renderScreensaver()}

            {/* Contenido principal en capa superior */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center">
                
                {/* Countdown helper para el siguiente en la fila */}
                {timeLeft > 0 && state !== 'IDLE' && state !== 'SCREENSAVER' && state !== 'LOADING' && (
                    <div className="absolute top-10 right-10 bg-black/40 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/10 flex items-center gap-4 text-white/50 z-50 animate-in fade-in slide-in-from-top-4">
                        <span className="text-2xl font-medium tracking-wide uppercase">Cerrando en</span>
                        <span className="text-5xl font-black font-mono w-10 text-center">{timeLeft}</span>
                    </div>
                )}

                {renderContent()}
                
                <div className="fixed bottom-4 right-4 text-white/5 text-[10px] z-50">
                    Modo Kiosco Activo
                </div>
            </div>
        </div>
    )
}
