import { getUsers } from '@/app/actions/user-actions'
import UserList from '@/components/users/UserList'
import UserForm from '@/components/users/UserForm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const session = await getServerSession(authOptions)

    // Protección de ruta: Solo ADMIN
    if (!session || session.user.role !== 'ADMIN') {
        redirect('/login')
    }

    const { success, data: users } = await getUsers()

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-primary">Gestión de Usuarios</h1>

            <div className="mb-8 p-4 bg-base-200 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-semibold">Usuarios del Sistema</h2>
                        <p className="text-gray-500 text-sm">Administra las cuentas de acceso al sistema</p>
                    </div>
                    <UserForm />
                </div>

                {success && users ? (
                    <UserList users={users} />
                ) : (
                    <div className="alert alert-error">
                        Error al cargar los usuarios.
                    </div>
                )}
            </div>
        </div>
    )
}
