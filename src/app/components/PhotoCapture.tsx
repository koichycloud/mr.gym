'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X } from 'lucide-react'

// No external deps for camera to keep it simple and robust.

interface PhotoCaptureProps {
    currentPhoto?: string | null
    onPhotoCapture: (photoDataUrl: string | null) => void
}

export default function PhotoCapture({ currentPhoto, onPhotoCapture }: PhotoCaptureProps) {
    const [mode, setMode] = useState<'view' | 'camera'>('view')
    const [preview, setPreview] = useState<string | null>(currentPhoto || null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)

    // Sync preview with prop updates (e.g. when editing loads)
    useEffect(() => {
        if (currentPhoto !== undefined) {
            setPreview(currentPhoto)
        }
    }, [currentPhoto])

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
            })
            setStream(mediaStream)
            // Delay setting srcObject slightly to ensure ref is mounted
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream
                    videoRef.current.play()
                }
            }, 100)
            setMode('camera')
        } catch (err) {
            console.error("Error accessing camera:", err)
            alert("No se pudo acceder a la cámara. Verifique permisos o use la opción de 'Subir'.")
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
        setMode('view')
    }

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas')
            // Match video dimensions
            const video = videoRef.current
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            const ctx = canvas.getContext('2d')
            if (ctx) {
                // Flip horizontally (mirror)
                ctx.translate(canvas.width, 0)
                ctx.scale(-1, 1)

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                // Compress/Resize to max 500px width
                const MAX_WIDTH = 500
                const scale = Math.min(1, MAX_WIDTH / canvas.width)

                const resizeCanvas = document.createElement('canvas')
                resizeCanvas.width = canvas.width * scale
                resizeCanvas.height = canvas.height * scale

                const resizeCtx = resizeCanvas.getContext('2d')
                if (resizeCtx) {
                    resizeCtx.drawImage(canvas, 0, 0, resizeCanvas.width, resizeCanvas.height)

                    // Export as JPEG quality 0.7
                    const dataUrl = resizeCanvas.toDataURL('image/jpeg', 0.7)

                    setPreview(dataUrl)
                    onPhotoCapture(dataUrl)
                    stopCamera()
                }
            }
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const MAX_WIDTH = 500
                    const scale = Math.min(1, MAX_WIDTH / img.width)

                    canvas.width = img.width * scale
                    canvas.height = img.height * scale

                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

                    setPreview(dataUrl)
                    onPhotoCapture(dataUrl)
                }
                img.src = reader.result as string
            }
            reader.readAsDataURL(file)
        }
    }

    const clearPhoto = () => {
        if (confirm('¿Eliminar foto actual?')) {
            setPreview(null)
            onPhotoCapture(null)
        }
    }

    return (
        <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-base-300 rounded-2xl bg-base-100/50 w-full max-w-md mx-auto">
            <h3 className="font-bold text-lg opacity-70">Foto de Perfil</h3>

            {mode === 'camera' ? (
                <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary/20">
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8">
                        <button type="button" onClick={stopCamera} className="btn btn-circle btn-ghost text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm">
                            <X size={24} />
                        </button>
                        <button type="button" onClick={takePhoto} className="btn btn-circle btn-lg btn-white border-4 border-primary hover:scale-105 transition-transform shadow-lg">
                            <div className="w-16 h-16 bg-white rounded-full"></div>
                        </button>
                        <div className="w-12"></div> {/* Spacer for balance */}
                    </div>
                </div>
            ) : (
                <div className="relative group">
                    <div className={`w-48 h-48 rounded-full overflow-hidden border-8 ${preview ? 'border-primary shadow-xl' : 'border-base-200'} bg-base-200 flex items-center justify-center transition-all`}>
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Camera size={64} className="text-base-300" />
                        )}
                    </div>

                    {preview && (
                        <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute top-0 right-0 btn btn-circle btn-sm btn-error text-white shadow-lg transform translate-x-2 -translate-y-2 hover:scale-110 transition-transform"
                            title="Eliminar foto"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            {mode === 'view' && (
                <div className="flex gap-3 w-full justify-center mt-2">
                    <button type="button" onClick={startCamera} className="btn btn-primary shadow-lg hover:shadow-primary/30 transition-all gap-2 flex-1">
                        <Camera size={20} />
                        Cámara
                    </button>
                    <label className="btn btn-outline bg-base-100 shadow-sm hover:shadow-md transition-all gap-2 cursor-pointer flex-1">
                        <Upload size={20} />
                        Subir
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                </div>
            )}
        </div>
    )
}
