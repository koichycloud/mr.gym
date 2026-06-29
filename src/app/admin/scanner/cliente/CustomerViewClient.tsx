'use client'

import { useEffect, useState, useRef } from 'react'
import { CheckCircle, XCircle, User } from 'lucide-react'
import { validateAccess, AccessResult } from '@/app/actions/access'

let globalAudioCtx: any = null;

const initAudio = () => {
  if (globalAudioCtx) return;
  try {
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
      const buffer = globalAudioCtx.createBuffer(1, 1, 22050);
      const source = globalAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(globalAudioCtx.destination);
      source.start(0);
    }
  } catch (e) {
    console.error("AudioContext initialization failed", e);
  }
};

const playWarningSound = () => {
  try {
    initAudio();
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    const ctx = globalAudioCtx;
    
    const playTone = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    playTone(ctx.currentTime, 130, 0.25);
    playTone(ctx.currentTime + 0.3, 110, 0.35);
  } catch (err) {
    console.error("Failed to play warning sound", err);
  }
};

export default function CustomerViewClient() {
    const [lastScan, setLastScan] = useState<AccessResult | null>(null)
    const [showWelcome, setShowWelcome] = useState(false)
    const [loading, setLoading] = useState(false)

    // Audio unlock listener
    useEffect(() => {
        const handleUnlock = () => {
            initAudio();
            if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
                globalAudioCtx.resume();
            }
        };
        window.addEventListener('click', handleUnlock);
        window.addEventListener('touchstart', handleUnlock);
        return () => {
            window.removeEventListener('click', handleUnlock);
            window.removeEventListener('touchstart', handleUnlock);
        };
    }, []);

    // Auto-hide scanner effect
    useEffect(() => {
        let timer: NodeJS.Timeout
        if (showWelcome) {
            timer = setTimeout(() => {
                setShowWelcome(false)
                setLastScan(null)
            }, 5000)
        }
        return () => clearTimeout(timer)
    }, [showWelcome])

    // Global keyboard listener for hardware scanners
    useEffect(() => {
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = async (e: KeyboardEvent) => {
            // Do not listen to inputs if we're focused on an actual input element (unlikely on this screen, but good practice)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const currentTime = Date.now();

            // hardware scanners type very fast. Reset buffer if typing is too slow.
            if (currentTime - lastKeyTime > 50) {
                barcodeBuffer = '';
            }

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 0) {
                    // Prevent default to stop scrolling
                    e.preventDefault();

                    const codeToScan = barcodeBuffer;
                    barcodeBuffer = '';

                    // Don't scan if currently loading
                    if (loading) return;

                    setLoading(true);
                    try {
                        const validation = await validateAccess(codeToScan)
                        setLastScan(validation)
                        setShowWelcome(true)
                        if (!validation.success) {
                            playWarningSound();
                        }
                    } catch (error) {
                        console.error('Error validating access:', error)
                    } finally {
                        setLoading(false);
                    }
                }
            } else if (e.key.length === 1) {
                e.preventDefault();
                barcodeBuffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [loading]);

    // Backward compatibility: Still listen to BroadcastChannel if admin is using the other screen
    useEffect(() => {
        const channel = new BroadcastChannel('scanner_channel')

        channel.onmessage = (event) => {
            if (event.data.type === 'SCAN_RESULT') {
                const validation = event.data.payload;
                setLastScan(validation)
                setShowWelcome(true)
                if (!validation.success) {
                    playWarningSound();
                }
            }
        }

        return () => {
            channel.close()
        }
    }, [])

    if (!showWelcome && !loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center animate-fade-in relative overflow-hidden bg-black">
                {/* Background Image */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 blur-sm flex justify-center items-center"
                    style={{
                        backgroundImage: "url('/gym_background.png')",
                        transform: "scale(1.05)"
                    }}
                />

                <div className="max-w-4xl w-full z-10 flex flex-col items-center">
                    <img src="/icons/icon-512x512.png" alt="Mr. Gym Logo" className="w-[300px] h-[300px] mb-8 object-contain drop-shadow-2xl" />
                    <h1 className="text-[110px] font-black text-white mb-4 tracking-tighter uppercase drop-shadow-lg" style={{ WebkitTextStroke: '4px black', paintOrder: 'stroke fill' }}>
                        Mr. Gym
                    </h1>
                    <p className="text-[51px] font-light text-white/90 drop-shadow-lg">
                        Bienvenido al mejor lugar para entrenar.
                    </p>
                    <div className="mt-16 bg-black/50 px-8 py-4 rounded-full border border-white/20 backdrop-blur-md flex flex-col items-center gap-2">
                        <p className="text-[28px] text-white font-bold animate-pulse">Por favor, escanea tu código para ingresar 👋</p>
                        <p className="text-[14px] text-white/50">🔔 Toca la pantalla una vez para habilitar el sonido de alertas de vencimiento.</p>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-black">
                <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 blur-md" style={{ backgroundImage: "url('/gym_background.png')", transform: "scale(1.05)" }} />
                <span className="loading loading-spinner text-white z-10" style={{ width: '5rem', height: '5rem' }}></span>
                <p className="text-white text-2xl mt-8 font-bold animate-pulse z-10">Procesando código...</p>
            </div>
        )
    }

    const isSuccess = lastScan?.success
    const socio = lastScan?.socio

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 ${isSuccess ? 'bg-success' : 'bg-error'
            }`}>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-16 shadow-2xl max-w-5xl w-full border-4 border-white/20 animate-scale-in">

                {socio?.fotoUrl ? (
                    <div className="relative mx-auto mb-8 w-64 h-64">
                        <img
                            src={socio.fotoUrl}
                            alt={socio.nombres}
                            className={`w-full h-full object-cover rounded-full border-8 shadow-2xl ${isSuccess ? 'border-success' : 'border-error'}`}
                        />
                        {/* Status Icon Indicator Overlay */}
                        <div className={`absolute bottom-0 right-4 p-2 rounded-full border-4 border-white ${isSuccess ? 'bg-success' : 'bg-error'}`}>
                            {isSuccess ?
                                <CheckCircle className="text-white w-12 h-12" /> :
                                <XCircle className="text-white w-12 h-12" />
                            }
                        </div>
                    </div>
                ) : (
                    isSuccess ? (
                        <CheckCircle className="mx-auto text-white w-48 h-48 mb-8 drop-shadow-md" />
                    ) : (
                        <XCircle className="mx-auto text-white w-48 h-48 mb-8 drop-shadow-md" />
                    )
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
