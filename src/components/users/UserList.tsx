'use client'

import { useState } from 'react'
import { deleteUser, updateUser } from '@/app/actions/user-actions'
import { SYSTEM_PERMISSIONS } from '@/lib/permissions'
import { Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'

export default function UserList({ users }: { users: any[] }) {
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [editData, setEditData] = useState({
        username: '',
        password: '',
        role: '',
        permissions: [] as string[]
    })
    const [message, setMessage] = useState('')

    const handleEditClick = (user: any) => {
        setSelectedUser(user)
        setShowPassword(false)
        setEditData({
            username: user.username,
            password: '',
            role: user.role,
            permissions: (user.permissions as string[]) || []
        })
    }

    const togglePermission = (permId: string) => {
        setEditData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }))
    }

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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return

        const res = await updateUser(selectedUser.id, {
            ...editData,
            role: editData.role as "ADMIN" | "RECEPCION" | "ENTRENADOR"
        })

        if (res.success) {
            setMessage('Usuario actualizado correctamente')
            setTimeout(() => {
                setSelectedUser(null)
                setMessage('')
                window.location.reload()
            }, 1000)
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
                        <th>Permisos</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td className="font-bold">{user.username}</td>
                            <td>
                                <div className={`badge ${user.role === 'ADMIN' ? 'badge-primary' : 'badge-ghost'}`}>
                                    {user.role}
                                </div>
                            </td>
                            <td>
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                    {((user.permissions as string[]) || []).map(p => (
                                        <span key={p} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded uppercase">
                                            {p.replace('_', ' ')}
                                        </span>
                                    ))}
                                    {(!user.permissions || user.permissions.length === 0) && user.role !== 'ADMIN' && (
                                        <span className="text-[10px] opacity-40">Sin permisos extra</span>
                                    )}
                                    {user.role === 'ADMIN' && (
                                        <span className="text-[10px] text-primary font-bold">ACCESO TOTAL</span>
                                    )}
                                </div>
                            </td>
                            <td className="text-sm opacity-60">{format(new Date(user.createdAt), 'dd/MM/yyyy')}</td>
                            <td className="flex gap-2">
                                <button
                                    className="btn btn-xs btn-outline btn-primary"
                                    onClick={() => handleEditClick(user)}
                                >
                                    Editar
                                </button>
                                <button
                                    className="btn btn-xs btn-ghost text-error"
                                    onClick={() => handleDelete(user.id)}
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal de Edición de Usuario */}
            {selectedUser && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg">Editar Usuario: {selectedUser.username}</h3>
                        <form onSubmit={handleUpdate} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Nombre de Usuario</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={editData.username}
                                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-semibold">Nueva Contraseña (opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Dejar vacío para no cambiar"
                                            className="input input-bordered w-full pr-10"
                                            value={editData.password}
                                            onChange={(e) => setEditData({ ...editData, password: e.target.value })}
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
                                        <span className="label-text">Rol</span>
                                    </label>
                                    <select
                                        className="select select-bordered"
                                        value={editData.role}
                                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                    >
                                        <option value="ADMIN">Administrador</option>
                                        <option value="RECEPCION">Recepción</option>
                                        <option value="ENTRENADOR">Entrenador</option>
                                    </select>
                                </div>
                                {message && <p className="text-sm text-info font-bold">{message}</p>}
                            </div>

                            <div className="bg-base-200 p-4 rounded-xl">
                                <h4 className="font-bold mb-4 text-sm uppercase tracking-wider opacity-70">Privilegios Individuales</h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {SYSTEM_PERMISSIONS.map((perm) => (
                                        <label key={perm.id} className="label cursor-pointer justify-start gap-3 p-2 hover:bg-base-300 rounded-lg transition-colors">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary checkbox-sm"
                                                checked={editData.permissions.includes(perm.id)}
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
                                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
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
