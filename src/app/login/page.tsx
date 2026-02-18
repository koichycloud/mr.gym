'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
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
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-[#1ABC9C] font-bold">Contraseña</span>
                            </label>
                            <input
                                type="password"
                                placeholder="contraseña"
                                className="input input-bordered !bg-black !text-white placeholder-gray-500 w-full"
                                style={{ backgroundColor: 'black', color: 'white' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
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
