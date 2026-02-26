'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Save, User, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'

interface PerfilClientProps {
    user: {
        id: string
        username: string
        fullName: string | null
        fotoUrl: string | null
        role: string
        createdAt: Date
    }
}

export default function PerfilClient({ user }: PerfilClientProps) {
    const router = useRouter()

    const [fullName, setFullName] = useState(user.fullName || '')
    const [password, setPassword] = useState('')
    const [fotoUrl, setFotoUrl] = useState<string | null>(user.fotoUrl)

    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                // Resize for avatar
                const MAX_WIDTH = 300
                const scale = Math.min(1, MAX_WIDTH / img.width)

                canvas.width = img.width * scale
                canvas.height = img.height * scale

                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

                // Compress
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
                setFotoUrl(dataUrl)
            }
            img.src = reader.result as string
        }
        reader.readAsDataURL(file)
    }

    const clearPhoto = () => {
        setFotoUrl(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage({ text: '', type: '' })

        try {
            const res = await fetch('/api/users/perfil', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName,
                    password: password || undefined,
                    fotoUrl
                })
            })

            const data = await res.json()

            if (res.ok) {
                setMessage({ text: 'Perfil actualizado correctamente.', type: 'success' })
                setPassword('') // Clear password field
                router.refresh() // Refresh layout to show new avatar/name
            } else {
                setMessage({ text: data.error || 'Error al guardar.', type: 'error' })
            }
        } catch (error) {
            setMessage({ text: 'Error de conexión.', type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="container mx-auto p-4 max-w-2xl min-h-[calc(100vh-5rem)] flex items-center justify-center">
            <div className="bg-base-100/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-base-200 w-full animate-fade-in">

                <div className="bg-gradient-to-r from-primary to-accent p-8 text-primary-content text-center relative">
                    <Link href="/" className="absolute top-4 left-4 btn btn-circle btn-ghost text-white hover:bg-white/20">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-black font-heading mb-2">Mi Perfil</h1>
                    <p className="opacity-80">Configura tu imagen y datos de personal</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8">

                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center justify-center -mt-20 mb-8 relative z-10">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-8 border-base-100 bg-base-200 flex items-center justify-center shadow-xl">
                                {fotoUrl ? (
                                    <img src={fotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={64} className="text-base-300" />
                                )}
                            </div>

                            <label className="absolute bottom-0 right-0 btn btn-circle btn-primary shadow-lg cursor-pointer transform translate-x-1 -translate-y-1 hover:scale-110 transition-transform">
                                <Camera size={18} />
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>

                            {fotoUrl && (
                                <button
                                    type="button"
                                    onClick={clearPhoto}
                                    className="absolute top-0 right-0 btn btn-circle btn-xs btn-error text-white shadow-lg transform -translate-x-1 translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Quitar foto"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="mt-4 text-center">
                            <span className="badge badge-primary badge-outline text-sm font-bold shadow-sm">
                                {user.username}
                            </span>
                            <div className="text-xs opacity-50 mt-1 uppercase tracking-widest font-bold">
                                {user.role}
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg mb-6 text-white`}>
                            <span>{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Full Name */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold text-base flex items-center gap-2">
                                    <User size={16} className="text-primary" /> Nombre Público
                                </span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ej: Maria Lopez"
                                className="input input-bordered input-lg w-full bg-base-200/50 focus:bg-base-100 transition-colors"
                            />
                            <label className="label">
                                <span className="label-text-alt opacity-60">Este nombre será visible en el sistema (ej. Navbar)</span>
                            </label>
                        </div>

                        {/* Password */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold text-base flex items-center gap-2">
                                    <Lock size={16} className="text-primary" /> Cambiar Contraseña
                                </span>
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className="input input-bordered input-lg w-full bg-base-200/50 focus:bg-base-100 transition-colors"
                            />
                            <label className="label">
                                <span className="label-text-alt opacity-60">Déjalo en blanco si no deseas cambiar tu contraseña actual.</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-10">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn btn-primary btn-block btn-lg shadow-xl hover:shadow-primary/30 transition-shadow text-white gap-2"
                        >
                            {isSaving ? (
                                <span className="loading loading-spinner"></span>
                            ) : (
                                <Save size={24} />
                            )}
                            Guardar Cambios
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}
