'use client'

import { useState } from 'react'
import { createUser } from '@/app/actions/user-actions'
import { SYSTEM_PERMISSIONS } from '@/lib/permissions'
import { Eye, EyeOff } from 'lucide-react'

export default function UserForm() {
    const [isOpen, setIsOpen] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'RECEPCION',
        permissions: [] as string[]
    })
    const [message, setMessage] = useState('')

    const togglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const res = await createUser({
            ...formData,
            role: formData.role as "ADMIN" | "RECEPCION" | "ENTRENADOR"
        })

        if (res.success) {
            setMessage('Usuario creado con éxito')
            setFormData({ username: '', password: '', role: 'RECEPCION', permissions: [] })
            setShowPassword(false)
            setTimeout(() => {
                setIsOpen(false)
                setMessage('')
                window.location.reload()
            }, 1000)
        } else {
            setMessage(res.error || 'Error al crear usuario')
        }
    }

    return (
        <div>
            <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
                + Nuevo Usuario
            </button>

            {isOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg">Crear Nuevo Usuario</h3>
                        <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Usuario</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Contraseña</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="input input-bordered w-full pr-10"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            minLength={6}
                                        />
                                        <button 
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Rol Principal</span>
                                    </label>
                                    <select
                                        className="select select-bordered"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="ADMIN">Administrador (Total)</option>
                                        <option value="RECEPCION">Recepción (Limitado)</option>
                                        <option value="ENTRENADOR">Entrenador</option>
                                    </select>
                                    <p className="text-[10px] opacity-50 mt-1">El rol ADMIN tiene todos los permisos por defecto.</p>
                                </div>

                                {message && <p className="text-sm text-info font-bold">{message}</p>}
                            </div>

                            <div className="bg-base-200 p-4 rounded-xl">
                                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider opacity-70">Permisos Específicos</h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {SYSTEM_PERMISSIONS.map((perm) => (
                                        <label key={perm.id} className="label cursor-pointer justify-start gap-3 p-2 hover:bg-base-300 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary checkbox-sm"
                                                checked={formData.permissions.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id)}
                                            />
                                            <div className="flex flex-col">
                                                <span className="label-text font-bold">{perm.label}</span>
                                                <span className="text-[10px] opacity-60 leading-tight">{perm.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-action col-span-full">
                                <button type="submit" className="btn btn-primary">Crear Usuario</button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setIsOpen(false)
                                        setMessage('')
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </dialog>
            )}
        </div>
    )
}
