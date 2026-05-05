import { getSocios } from '@/app/actions/socios'
import SociosListClient from './SociosListClient'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SociosPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; q?: string; filter?: string }>
}) {
    const { page, q, filter } = await searchParams
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    const filterType = (filter === 'expiring' || filter === 'vencidos') ? filter : 'all'

    const { socios, totalCount, totalPages } = await getSocios({
        search: q || '',
        filterType,
        page: parseInt(page || '1'),
    })

    return (
        <SociosListClient
            initialSocios={socios}
            isAdmin={isAdmin}
            totalCount={totalCount}
            totalPages={totalPages}
            currentPage={parseInt(page || '1')}
            currentSearch={q || ''}
            currentFilter={filterType}
        />
    )
}
