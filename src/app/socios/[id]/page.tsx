import { getSocioById } from '@/app/actions/socios'
import { notFound } from 'next/navigation'
import SocioDetailClient from './SocioDetailClient'

export default async function SocioDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const socio = await getSocioById(id)

    if (!socio) {
        notFound()
    }

    return <SocioDetailClient socio={socio} />
}
