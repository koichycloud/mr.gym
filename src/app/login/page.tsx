'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const res = await signIn('credentials', {
            username,
            password,
            redirect: false,
        })

        if (res?.error) {
            setError(`Error: ${res.error} (Intenta refrescar la página)`)
            setLoading(false)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <div className="card w-full max-w-sm shadow-2xl bg-base-100">
                <div className="card-body">
                    <div className="text-center mb-4">
                        <h2 className="card-title justify-center text-5xl font-bold text-[#3f2009]" style={{ WebkitTextStroke: '4px black', paintOrder: 'stroke fill' }}>Mr. Gym</h2>
                        <p className="text-sm text-white font-semibold">Bienvenido al mejor lugar para entrenar.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-[#1ABC9C] font-bold">Usuario</span>
                            </label>
                            <input
                                type="text"
                                placeholder="usuario"
                                className="input input-bordered !bg-black !text-white placeholder-gray-500 w-full"
                                style={{ backgroundColor: 'black', color: 'white' }}
                                value={username}
                                onChange={(e) => setUsername(e.target.value.trim())}
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck="false"
                                required
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-[#1ABC9C] font-bold">Contraseña</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="contraseña"
                                    className="input input-bordered !bg-black !text-white placeholder-gray-500 w-full pr-10"
                                    style={{ backgroundColor: 'black', color: 'white' }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value.trim())}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-error mt-4 text-sm py-2">
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-control mt-6">
                            <button
                                className={`btn bg-white text-black hover:bg-gray-200 border-none w-full font-bold text-lg ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
