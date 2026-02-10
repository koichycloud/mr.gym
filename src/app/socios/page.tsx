import { getSocios } from '@/app/actions/socios'
import SociosListClient from './SociosListClient'

export const dynamic = 'force-dynamic'

export default async function SociosPage() {
    const socios = await getSocios()

    return <SociosListClient initialSocios={socios} />
}
