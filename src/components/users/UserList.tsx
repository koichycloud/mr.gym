'use client'

import { useState } from 'react'
import { deleteUser, updateUserPassword } from '@/app/actions/user-actions'

export default function UserList({ users }: { users: any[] }) {
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [newPassword, setNewPassword] = useState('')
    const [message, setMessage] = useState('')

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            const res = await deleteUser(id)
            if (res.success) {
                alert('Usuario eliminado')
                window.location.reload()
            } else {
                alert(res.error)
            }
        }
    }

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return

        const res = await updateUserPassword(selectedUser.id, newPassword)
        if (res.success) {
            setMessage('Contraseña actualizada correctamente')
            setNewPassword('')
            setTimeout(() => {
                setSelectedUser(null)
                setMessage('')
            }, 1500)
        } else {
            setMessage(res.error || 'Error')
        }
    }

    return (
        <div className="overflow-x-auto">
            <table className="table w-full">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>{user.role}</td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="flex gap-2">
                                <button
                                    className="btn btn-xs btn-warning"
                                    onClick={() => setSelectedUser(user)}
                                >
                                    Cambiar Pass
                                </button>
                                <button
                                    className="btn btn-xs btn-error"
                                    onClick={() => handleDelete(user.id)}
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal de Cambio de Contraseña */}
            {selectedUser && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Cambiar Contraseña: {selectedUser.username}</h3>
                        <form onSubmit={handlePasswordUpdate} className="py-4 flex flex-col gap-4">
                            <input
                                type="password"
                                placeholder="Nueva Contraseña"
                                className="input input-bordered w-full"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                            {message && <p className="text-sm text-info">{message}</p>}
                            <div className="modal-action">
                                <button type="submit" className="btn btn-primary">Guardar</button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setSelectedUser(null)
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
