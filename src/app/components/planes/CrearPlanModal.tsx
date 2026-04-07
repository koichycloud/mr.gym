'use client'

import { useState } from 'react'
import { Plus, Save, Edit } from 'lucide-react'
import { createPlan, updatePlan } from '@/app/actions/planes'

interface CrearPlanModalProps {
    planAEditar?: {
        id: string
        nombre: string
        descripcion: string
        meses: number
        precio: number
        activo: boolean
    }
}

export default function CrearPlanModal({ planAEditar }: CrearPlanModalProps) {
    const isEditing = !!planAEditar
    const modalId = isEditing ? `modal-plan-${planAEditar.id}` : 'modal-plan-nuevo'
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        nombre: planAEditar?.nombre || '',
        descripcion: planAEditar?.descripcion || '',
        meses: planAEditar?.meses || 1,
        precio: planAEditar?.precio || 0,
        activo: planAEditar ? planAEditar.activo : true
    })

    const handleOpen = () => {
        const modal = document.getElementById(modalId) as HTMLDialogElement
        if (modal) modal.showModal()
    }

    const handleClose = () => {
        const modal = document.getElementById(modalId) as HTMLDialogElement
        if (modal) modal.close()
        setError(null)
        if (!isEditing) {
            setFormData({ nombre: '', descripcion: '', meses: 1, precio: 0, activo: true })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const dataToSave = {
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                meses: Number(formData.meses),
                precio: Number(formData.precio),
                activo: formData.activo
            }

            const res = isEditing 
                ? await updatePlan(planAEditar.id, dataToSave)
                : await createPlan(dataToSave)

            if (res.success) {
                handleClose()
            } else {
                setError(res.error || 'Error al guardar el plan')
            }
        } catch (err) {
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {isEditing ? (
                <button className="btn btn-ghost btn-sm text-primary" onClick={handleOpen}>
                    <Edit size={16} className="mr-1"/> Editar
                </button>
            ) : (
                <button className="btn btn-primary" onClick={handleOpen}>
                    <Plus size={18} className="mr-2"/> Nuevo Plan
                </button>
            )}

            <dialog id={modalId} className="modal text-left">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">{isEditing ? 'Editar Plan o Promoción' : 'Crear Nuevo Plan'}</h3>
                    
                    {error && (
                        <div className="alert alert-error mb-4 py-2 text-sm">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label"><span className="label-text font-bold">Nombre del Plan</span></label>
                            <input 
                                type="text" 
                                className="input input-bordered w-full" 
                                placeholder="Ej. Promoción Verano"
                                value={formData.nombre}
                                onChange={e => setFormData({...formData, nombre: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text font-bold">Duración (Meses)</span></label>
                                <input 
                                    type="number" 
                                    className="input input-bordered w-full" 
                                    min="1" max="60"
                                    value={formData.meses}
                                    onChange={e => setFormData({...formData, meses: Number(e.target.value)})}
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text font-bold">Precio Total (S/)</span></label>
                                <input 
                                    type="number" 
                                    className="input input-bordered w-full" 
                                    min="0" step="0.50"
                                    value={formData.precio}
                                    onChange={e => setFormData({...formData, precio: Number(e.target.value)})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text font-bold">Descripción (Opcional)</span></label>
                            <textarea 
                                className="textarea textarea-bordered w-full h-20" 
                                placeholder="Detalles de la promoción..."
                                value={formData.descripcion}
                                onChange={e => setFormData({...formData, descripcion: e.target.value})}
                            />
                        </div>

                        <div className="form-control">
                            <label className="cursor-pointer label justify-start gap-4">
                                <input 
                                    type="checkbox" 
                                    className="toggle toggle-success" 
                                    checked={formData.activo}
                                    onChange={e => setFormData({...formData, activo: e.target.checked})}
                                />
                                <span className="label-text font-bold">Plan Activo (Visible al renovar)</span>
                            </label>
                        </div>

                        <div className="modal-action">
                            <button type="button" className="btn btn-ghost" onClick={handleClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <span className="loading loading-spinner"></span> : <Save size={18} className="mr-2"/>}
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            </dialog>
        </>
    )
}
