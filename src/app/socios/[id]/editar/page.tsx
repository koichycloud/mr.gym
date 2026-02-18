import { getSocioById, updateSocio } from '@/app/actions/socios'
import SocioForm from '@/app/socios/SocioForm'
import { notFound } from 'next/navigation'

export default async function EditarSocio({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ renew?: string }>
}) {
    const { id } = await params
    const { renew } = await searchParams
    const socio = await getSocioById(id)

    if (!socio) {
        notFound()
    }

    const handleUpdate = async (data: any) => {
        'use server'
        return await updateSocio(id, data)
    }

    return (
        <div className="min-h-screen bg-base-200 p-8">
            <div className="max-w-4xl mx-auto">
                <SocioForm
                    title="Editar Socio"
                    initialData={socio}
                    onSubmit={handleUpdate}
                    includeSubscription={!!renew}
                />
            </div>
        </div>
    )
}
