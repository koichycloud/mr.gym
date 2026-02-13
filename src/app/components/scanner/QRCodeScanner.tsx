import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { useEffect, useRef, useState } from "react"

interface QRCodeScannerProps {
    fps?: number
    qrbox?: number
    aspectRatio?: number
    disableFlip?: boolean
    verbose?: boolean
    qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void
    qrCodeErrorCallback?: (errorMessage: string) => void
}

const qrcodeRegionId = "html5qr-code-full-region"

export default function QRCodeScanner(props: QRCodeScannerProps) {
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const isProcessingRef = useRef(false) // Lock to prevent concurrent start/stop
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true

        // Initialization
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(qrcodeRegionId)
        }

        const startScanning = async () => {
            // If locked or component unmounted, stop
            if (!scannerRef.current || isProcessingRef.current || !mountedRef.current) return

            isProcessingRef.current = true // Lock

            try {
                const devices = await Html5Qrcode.getCameras()
                if (devices && devices.length) {
                    await scannerRef.current.start(
                        { facingMode: "environment" },
                        {
                            fps: props.fps || 10,
                            qrbox: props.qrbox || 250,
                            aspectRatio: props.aspectRatio || 1.0,
                        },
                        (decodedText, decodedResult) => {
                            if (mountedRef.current) {
                                props.qrCodeSuccessCallback(decodedText, decodedResult)
                            }
                        },
                        (errorMessage) => {
                            // ignore
                        }
                    )
                    if (mountedRef.current) {
                        setIsScanning(true)
                        setCameraError(null)
                    }
                } else {
                    if (mountedRef.current) setCameraError("No se detectaron cámaras.")
                }
            } catch (err: any) {
                console.error("Error starting scanner", err)
                // Ignore the specific "transition" error as it usually means it's working
                if (mountedRef.current && !err.toString().includes("already under transition")) {
                    setCameraError("Error al iniciar cámara. Recarga la página.")
                }
            } finally {
                isProcessingRef.current = false // Unlock
            }
        }

        startScanning()

        return () => {
            mountedRef.current = false
            const cleanup = async () => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    try {
                        await scannerRef.current.stop()
                        scannerRef.current.clear()
                    } catch (err) {
                        console.warn("Failed to stop scanner", err)
                    }
                }
            }
            cleanup()
        }
    }, [])

    return (
        <div className="w-full max-w-md mx-auto relative bg-black rounded-box overflow-hidden" style={{ minHeight: '300px' }}>
            <div id={qrcodeRegionId} className="w-full h-full" />

            {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            )}

            {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-error p-4 text-center">
                    <p>{cameraError}</p>
                    {typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
                        <p className="text-xs mt-2 text-white">Prueba en localhost o HTTPS.</p>
                    )}
                </div>
            )}
        </div>
    )
}
