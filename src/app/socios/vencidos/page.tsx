import { getExpiredSubscriptionsDetailed } from '@/app/actions/suscripciones'
import VencidosListClient from './VencidosListClient'

export const dynamic = 'force-dynamic'

export default async function VencidosPage() {
    const suscripciones = await getExpiredSubscriptionsDetailed()
    return <VencidosListClient suscripciones={JSON.parse(JSON.stringify(suscripciones))} />
}
