import { getSocioById } from '@/app/actions/socios'
import { notFound } from 'next/navigation'
import SocioDetailClient from './SocioDetailClient'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Suspense } from "react"

export default async function SocioDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const socio = await getSocioById(id)
    const session = await getServerSession(authOptions)

    if (!socio) {
        notFound()
    }

    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'
    const permissions = (session?.user?.permissions as string[]) || []

    return (
        <Suspense fallback={<div className="p-8 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>}>
            <SocioDetailClient socio={socio} permissions={permissions} isAdmin={isAdmin} />
        </Suspense>
    )
}

