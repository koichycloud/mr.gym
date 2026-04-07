import { getPlanesActivos, getTodosPlanes } from '@/app/actions/planes'
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import CrearPlanModal from '@/app/components/planes/CrearPlanModal'

export default async function PlanesPage() {
    const planes = await getTodosPlanes()

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Planes y Promociones</h1>
                    <p className="opacity-70 mt-1">Configura las suscripciones, precios y promociones que aparecerán en caja.</p>
                </div>
                <CrearPlanModal />
            </div>

            <div className="card bg-base-100 shadow-xl border-t border-base-200">
                <div className="card-body p-0 overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Nombre / Promoción</th>
                                <th>Meses</th>
                                <th>Precio (S/)</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planes.map(plan => (
                                <tr key={plan.id}>
                                    <td className="font-bold">
                                        {plan.nombre}
                                        {plan.descripcion && <span className="block text-xs font-normal opacity-60 mt-1">{plan.descripcion}</span>}
                                    </td>
                                    <td>{plan.meses}</td>
                                    <td className="font-semibold text-success">S/ {plan.precio.toFixed(2)}</td>
                                    <td>
                                        {plan.activo ? (
                                            <div className="badge badge-success gap-2 text-white"><CheckCircle size={14}/> Activo</div>
                                        ) : (
                                            <div className="badge badge-error gap-2 text-white"><XCircle size={14}/> Oculto</div>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <CrearPlanModal 
                                            planAEditar={{
                                                id: plan.id,
                                                nombre: plan.nombre,
                                                descripcion: plan.descripcion || '',
                                                meses: plan.meses,
                                                precio: plan.precio,
                                                activo: plan.activo
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {planes.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-6 opacity-60">
                                        No hay planes registrados. Añade uno para comenzar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
