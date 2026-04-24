import { getExpiringSubscriptionsDetailed } from '@/app/actions/suscripciones'
import PorVencerListClient from './PorVencerListClient'

export const dynamic = 'force-dynamic'

export default async function PorVencerPage() {
    const suscripciones = await getExpiringSubscriptionsDetailed()
    return <PorVencerListClient suscripciones={JSON.parse(JSON.stringify(suscripciones))} />
}
