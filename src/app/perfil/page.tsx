import { requireAuth } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import PerfilClient from './PerfilClient'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
    const session = await requireAuth()

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            username: true,
            role: true,
            createdAt: true
        }
    })

    if (!user) {
        return <div className="p-8 text-center">Usuario no encontrado</div>
    }

    return <PerfilClient user={user} />
}
