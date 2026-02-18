import Link from 'next/link'
import { Plus, Users, Calendar, AlertTriangle, Upload, CalendarDays, DollarSign } from 'lucide-react'
import { getSocios } from './actions/socios'
import { getExpiringSubscriptions, getExpiredSubscriptions } from './actions/suscripciones'
import { contarAsistenciasHoy } from './actions/asistencia'
import { getTotalIngresosHoy } from './actions/pagos'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const expiring = await getExpiringSubscriptions()
  const expired = await getExpiredSubscriptions()
  const socios = await getSocios()
  const asistenciasHoy = await contarAsistenciasHoy()
  const ingresosHoy = await getTotalIngresosHoy()

  return (
    <main className="min-h-screen bg-white">

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Users className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Total Socios</div>
              <div className="stat-value text-primary">{socios.length}</div>
              <div className="stat-desc">Registrados</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className={`stat ${expiring.length > 0 ? 'bg-warning/10' : ''}`}>
              <div className={`stat-figure ${expiring.length > 0 ? 'text-warning' : 'text-secondary'}`}>
                <AlertTriangle className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Por Vencer</div>
              <div className={`stat-value ${expiring.length > 0 ? 'text-warning' : 'text-secondary'}`}>
                {expiring.length}
              </div>
              <div className="stat-desc">Próximos 10 días</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-accent">
                <CalendarDays className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Asistencias Hoy</div>
              <div className="stat-value text-accent">{asistenciasHoy}</div>
              <div className="stat-desc">Ingresos registrados</div>
            </div>
          </div>

          <div className="stats shadow bg-base-100">
            <div className="stat">
              <div className="stat-figure text-success">
                <DollarSign className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Ingresos Hoy</div>
              <div className="stat-value text-success text-2xl">S/ {ingresosHoy.toFixed(2)}</div>
              <div className="stat-desc">Caja del día</div>
            </div>
          </div>
        </div>

        {/* Hero Shortcuts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/socios/nuevo" className="card card-compact bg-primary text-primary-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center py-6">
              <Plus size={32} />
              <h2 className="card-title text-lg">Nuevo Socio</h2>
              <p className="text-xs opacity-90">Registrar miembro</p>
            </div>
          </Link>

          <Link href="/socios" className="card card-compact bg-secondary text-secondary-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center py-6">
              <Users size={32} />
              <h2 className="card-title text-lg">Ver Socios</h2>
              <p className="text-xs opacity-90">Gestión miembros</p>
            </div>
          </Link>

          <div className="card card-compact bg-accent text-accent-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center py-6">
              <Calendar size={32} />
              <h2 className="card-title text-lg">Suscripciones</h2>
              <p className="text-xs opacity-90">Gestión pagos</p>
            </div>
          </div>

          <Link href="/socios/importar" className="card card-compact bg-neutral text-neutral-content hover:scale-105 transition-transform duration-200 shadow-xl cursor-pointer">
            <div className="card-body items-center text-center py-6">
              <Upload size={32} />
              <h2 className="card-title text-lg">Importar</h2>
              <p className="text-xs opacity-90">Carga masiva</p>
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
                      <th className="w-10 text-center">Sexo</th>
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
                          <span>{sub.socio.nombres} {sub.socio.apellidos}</span>
                        </td>
                        <td className="text-center">
                          <div className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {sub.socio.sexo === 'F' ? 'F' : 'M'}
                          </div>
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
                      <th className="w-10 text-center">Sexo</th>
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
                          <span>{sub.socio.nombres} {sub.socio.apellidos}</span>
                        </td>
                        <td className="text-center">
                          <div className={`w-6 h-6 mx-auto flex items-center justify-center text-[10px] font-bold rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {sub.socio.sexo === 'F' ? 'F' : 'M'}
                          </div>
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
