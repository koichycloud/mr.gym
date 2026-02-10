import { getNextCode } from '@/app/actions/socios'
import NuevoSocioClient from './NuevoSocioClient'

export const dynamic = 'force-dynamic'

export default async function NuevoSocioPage() {
    const nextCode = await getNextCode()

    return <NuevoSocioClient nextCode={nextCode} />
}
