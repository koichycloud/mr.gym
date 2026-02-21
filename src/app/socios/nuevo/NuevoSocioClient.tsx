'use client'

import { createSocio } from '@/app/actions/socios'
import SocioForm from '@/app/socios/SocioForm'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NuevoSocioClientProps {
    nextCode: string
}

export default function NuevoSocioClient({ nextCode }: NuevoSocioClientProps) {
    const router = useRouter()

    const handleCreate = async (data: any) => {
        return await createSocio(data)
    }

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="btn btn-ghost btn-circle">
                        <ArrowLeft />
                    </button>
                    <h1 className="text-3xl font-bold text-primary">Nuevo Socio</h1>
                </div>

                <SocioForm
                    title="Datos del Socio"
                    onSubmit={handleCreate}
                    includeSubscription={true}
                    initialData={{
                        codigo: nextCode,
                        nombres: '',
                        apellidos: '',
                        tipoDocumento: 'DNI',
                        numeroDocumento: '',
                        fechaNacimiento: new Date(),
                        telefono: ''
                    }}
                />
            </div>
        </div>
    )
}
