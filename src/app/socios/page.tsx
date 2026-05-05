import { getSociosPaginated } from '@/app/actions/socios'
import SociosListClient from './SociosListClient'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SociosPage({ searchParams }: { searchParams: { page?: string, q?: string, filter?: string } }) {
    const page = parseInt(searchParams.page || '1')
    const query = searchParams.q || ''
    const filterType = searchParams.filter || 'all'

    const { socios, totalCount } = await getSociosPaginated(page, 20, query, filterType)
    
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    return <SociosListClient initialSocios={socios} totalCount={totalCount} currentPage={page} initialQuery={query} initialFilter={filterType} isAdmin={isAdmin} />
}
