import { getSocios } from '@/app/actions/socios'
import SociosListClient from './SociosListClient'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SociosPage() {
    const socios = await getSocios()
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    return <SociosListClient initialSocios={socios} isAdmin={isAdmin} />
}
