'use client'

import { useState } from 'react'
import { createUser } from '@/app/actions/user-actions'

export default function UserForm() {
    const [isOpen, setIsOpen] = useState(false)
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'RECEPCION'
    })
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const res = await createUser({
            ...formData,
            role: formData.role as "ADMIN" | "RECEPCION"
        })

        if (res.success) {
            setMessage('Usuario creado con éxito')
            setFormData({ username: '', password: '', role: 'RECEPCION' })
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
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Crear Nuevo Usuario</h3>
                        <form onSubmit={handleSubmit} className="py-4 flex flex-col gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Usuario</span>
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
                                    <span className="label-text">Contraseña</span>
                                </label>
                                <input
                                    type="password"
                                    className="input input-bordered"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Rol</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="ADMIN">Administrador</option>
                                    <option value="RECEPCION">Recepción</option>
                                    <option value="ENTRENADOR">Entrenador</option>
                                </select>
                            </div>

                            {message && <p className="text-sm text-info">{message}</p>}

                            <div className="modal-action">
                                <button type="submit" className="btn btn-primary">Crear</button>
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
