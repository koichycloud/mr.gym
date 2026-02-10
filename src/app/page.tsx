import Link from 'next/link'
import { Plus, Users, Calendar, AlertTriangle, Upload } from 'lucide-react'
import { getSocios } from './actions/socios'
import { getExpiringSubscriptions, getExpiredSubscriptions } from './actions/suscripciones'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const expiring = await getExpiringSubscriptions()
  const expired = await getExpiredSubscriptions()
  const socios = await getSocios()

  return (
    <main className="min-h-screen bg-base-200">

      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Users className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Total Socios</div>
              <div className="stat-value text-primary">{socios.length}</div>
              <div className="stat-desc">Registrados en el sistema</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className={`stat ${expiring.length > 0 ? 'bg-warning/10' : ''}`}>
              <div className={`stat-figure ${expiring.length > 0 ? 'text-warning' : 'text-secondary'}`}>
                <AlertTriangle className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Vencimientos Próximos</div>
              <div className={`stat-value ${expiring.length > 0 ? 'text-warning' : 'text-secondary'}`}>
                {expiring.length}
              </div>
              <div className="stat-desc">En los próximos 10 días</div>
            </div>
          </div>
        </div>

        {/* Hero Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/socios/nuevo" className="card bg-primary text-primary-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center">
              <Plus size={48} />
              <h2 className="card-title text-2xl">Nuevo Socio</h2>
              <p>Registrar un miembro</p>
            </div>
          </Link>

          <Link href="/socios" className="card bg-secondary text-secondary-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center">
              <Users size={48} />
              <h2 className="card-title text-2xl">Ver Socios</h2>
              <p>Gestión de miembros</p>
            </div>
          </Link>

          <div className="card bg-accent text-accent-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center">
              <Calendar size={48} />
              <h2 className="card-title text-2xl">Suscripciones</h2>
              <p>Gestión de pagos</p>
            </div>
          </div>

          <Link href="/socios/importar" className="card bg-neutral text-neutral-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center">
              <Upload size={48} />
              <h2 className="card-title text-2xl">Importar Excel</h2>
              <p>Carga masiva de socios</p>
            </div>
          </Link>
        </div>

        {/* Alertas */}
        {expiring.length > 0 && (
          <div className="card bg-base-100 shadow-xl border-l-4 border-warning">
            <div className="card-body">
              <h2 className="card-title text-warning mb-4 flex items-center gap-2">
                <AlertTriangle />
                Atención: Suscripciones por Vencer
              </h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>Código</th>
                      <th>Teléfono</th>
                      <th>Vence</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiring.map(sub => (
                      <tr key={sub.id} className="hover">
                        <td className="font-bold">
                          <span className={`px-2 py-1 rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {sub.socio.nombres} {sub.socio.apellidos}
                          </span>
                        </td>
                        <td className="font-mono">{sub.socio.codigo}</td>
                        <td>{sub.socio.telefono || '-'}</td>
                        <td className="text-warning font-semibold">
                          {format(new Date(sub.fechaFin), 'dd/MM/yyyy')}
                        </td>
                        <td>
                          <div className="badge badge-warning gap-2">
                            Por Vencer
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Expired Subscriptions */}
        {expired.length > 0 && (
          <div className="card bg-base-100 shadow-xl border-l-4 border-error">
            <div className="card-body">
              <h2 className="card-title text-error mb-4 flex items-center gap-2">
                <AlertTriangle />
                Atención: Suscripciones Vencidas
              </h2>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>Código</th>
                      <th>Teléfono</th>
                      <th>Venció</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expired.map(sub => (
                      <tr key={sub.id} className="hover">
                        <td className="font-bold">
                          <span className={`px-2 py-1 rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {sub.socio.nombres} {sub.socio.apellidos}
                          </span>
                        </td>
                        <td className="font-mono">{sub.socio.codigo}</td>
                        <td>{sub.socio.telefono || '-'}</td>
                        <td className="text-error font-semibold">
                          {format(new Date(sub.fechaFin), 'dd/MM/yyyy')}
                        </td>
                        <td>
                          <div className="badge badge-error gap-2 text-white">
                            Vencida
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
