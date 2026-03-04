'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Lock, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/app/components/ThemeProvider'

interface PerfilClientProps {
    user: {
        id: string
        username: string
        role: string
        createdAt: Date
    }
}

export default function PerfilClient({ user }: PerfilClientProps) {
    const router = useRouter()
    const { theme, toggleTheme } = useTheme()

    const [password, setPassword] = useState('')

    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage({ text: '', type: '' })

        try {
            const res = await fetch('/api/users/perfil', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: password || undefined
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
                    <p className="opacity-80">Configura tu cuenta</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    {message.text && (
                        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg mb-6 text-white`}>
                            <span>{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Theme Toggle */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold text-base flex items-center gap-2">
                                    {theme === 'dark' ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
                                    Apariencia
                                </span>
                            </label>
                            <div className="flex items-center gap-4 bg-base-200/50 p-4 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => theme !== 'dark' && toggleTheme()}
                                    className={`flex-1 btn btn-sm gap-2 ${theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    <Moon size={16} />
                                    Oscuro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => theme !== 'light' && toggleTheme()}
                                    className={`flex-1 btn btn-sm gap-2 ${theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
                                >
                                    <Sun size={16} />
                                    Claro
                                </button>
                            </div>
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
