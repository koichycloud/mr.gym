import Link from 'next/link'
import { Plus, Users, Calendar, AlertTriangle, Upload, CalendarDays, DollarSign, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { getSocios } from './actions/socios'
import { getExpiringSubscriptions, getExpiredSubscriptions } from './actions/suscripciones'
import { contarAsistenciasHoy } from './actions/asistencia'
import { getTotalIngresosHoy } from './actions/pagos'
import { format } from 'date-fns'

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pageExp?: string }>
}) {
  const session = await getServerSession(authOptions)
  const allExpiring = await getExpiringSubscriptions()
  const expired = await getExpiredSubscriptions()
  const socios = await getSocios()
  const asistenciasHoy = await contarAsistenciasHoy()
  const ingresosHoy = await getTotalIngresosHoy()

  const { pageExp } = await searchParams
  const currentExpPage = parseInt(pageExp || '1')
  const EXP_PAGE_SIZE = 10
  const totalExpPages = Math.ceil(allExpiring.length / EXP_PAGE_SIZE)
  const expiring = allExpiring.slice((currentExpPage - 1) * EXP_PAGE_SIZE, currentExpPage * EXP_PAGE_SIZE)

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN'
  const permissions = (session?.user?.permissions as string[]) || []
  const hasCajaPerm = isAdmin || permissions.includes('CAJA_VER')

  return (
    <main className="min-h-screen bg-transparent pb-12">

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

        {/* Dynamic Navigation Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Link href="/socios" className="stats shadow-lg bg-base-100 hover:ring-2 hover:ring-primary transition-all group overflow-hidden border border-base-200">
            <div className="stat relative">
              <div className="stat-figure text-primary group-hover:scale-110 transition-transform">
                <Users className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title font-bold">Total Socios</div>
              <div className="stat-value text-primary">{socios.length}</div>
              <div className="stat-desc flex items-center gap-1">Gestionar lista <ChevronRight size={12}/></div>
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary group-hover:w-full transition-all duration-300"></div>
            </div>
          </Link>

          <Link href="/socios/por-vencer" className="stats shadow-lg bg-base-100 hover:ring-2 hover:ring-warning transition-all group overflow-hidden border border-base-200">
            <div className={`stat relative ${allExpiring.length > 0 ? 'bg-warning/5' : ''}`}>
              <div className="stat-figure text-warning group-hover:scale-110 transition-transform">
                <AlertTriangle className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title font-bold">Por Vencer</div>
              <div className="stat-value text-warning">{allExpiring.length}</div>
              <div className="stat-desc flex items-center gap-1">Próximos 10 días <ChevronRight size={12}/></div>
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-warning group-hover:w-full transition-all duration-300"></div>
            </div>
          </Link>

          <Link href="/asistencia" className="stats shadow-lg bg-base-100 hover:ring-2 hover:ring-accent transition-all group overflow-hidden border border-base-200">
            <div className="stat relative">
              <div className="stat-figure text-accent group-hover:scale-110 transition-transform">
                <CalendarDays className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title font-bold">Asistencias Hoy</div>
              <div className="stat-value text-accent">{asistenciasHoy}</div>
              <div className="stat-desc flex items-center gap-1">Ver ingresos <ChevronRight size={12}/></div>
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-accent group-hover:w-full transition-all duration-300"></div>
            </div>
          </Link>

          {hasCajaPerm ? (
            <Link href="/caja" className="stats shadow-lg bg-base-100 hover:ring-2 hover:ring-success transition-all group overflow-hidden border border-base-200">
              <div className="stat relative">
                <div className="stat-figure text-success group-hover:scale-110 transition-transform">
                  <DollarSign className="inline-block w-8 h-8 stroke-current" />
                </div>
                <div className="stat-title font-bold">Ingresos Hoy</div>
                <div className="stat-value text-success text-2xl">S/ {ingresosHoy.toFixed(2)}</div>
                <div className="stat-desc flex items-center gap-1">Detalle de caja <ChevronRight size={12}/></div>
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-success group-hover:w-full transition-all duration-300"></div>
              </div>
            </Link>
          ) : (
             <div className="stats shadow-lg bg-base-100 opacity-50 border border-base-200">
                <div className="stat">
                    <div className="stat-figure text-gray-500">
                        <DollarSign className="inline-block w-8 h-8" />
                    </div>
                    <div className="stat-title">Ingresos Hoy</div>
                    <div className="stat-value text-xl">Acceso Restringido</div>
                </div>
             </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-base-100 p-4 rounded-2xl shadow-md border border-base-200">
            <div className="flex items-center gap-4">
                <div className="bg-primary/20 p-3 rounded-xl text-primary">
                    <Plus size={24} />
                </div>
                <div>
                    <h3 className="font-bold">Acciones Rápidas</h3>
                    <p className="text-xs opacity-60">Registros y gestión de datos</p>
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Link href="/socios/nuevo" className="btn btn-primary btn-sm md:btn-md flex-1 md:flex-none">
                    <Plus size={18} /> Nuevo Socio
                </Link>
                <Link href="/socios/importar" className="btn btn-outline btn-sm md:btn-md flex-1 md:flex-none">
                    <Upload size={18} /> Importar Datos
                </Link>
            </div>
        </div>

        {/* Alertas: Por Vencer con Paginación */}
        {allExpiring.length > 0 && (
          <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
            <div className="card-body p-0">
              <div className="bg-warning/10 p-4 border-b border-warning/20 flex items-center justify-between">
                <h2 className="card-title text-warning text-sm md:text-base flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Suscripciones por Vencer
                  <div className="badge badge-warning text-warning-content font-bold">{allExpiring.length}</div>
                </h2>
                <Link href="/socios/por-vencer" className="btn btn-xs btn-warning">Ver todos</Link>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-sm">
                  <thead className="bg-base-200/50">
                    <tr>
                      <th className="pl-6 py-4 text-[10px] uppercase opacity-60">Socio</th>
                      <th className="text-center text-[10px] uppercase opacity-60">Sexo</th>
                      <th className="text-[10px] uppercase opacity-60">Código</th>
                      <th className="text-[10px] uppercase opacity-60">Vence</th>
                      <th className="text-[10px] uppercase opacity-60">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiring.map(sub => (
                      <tr key={sub.id} className="hover:bg-base-200/30 transition-colors">
                        <td className="pl-6 py-4">
                          <span className="font-bold text-sm">{sub.socio.nombres} {sub.socio.apellidos}</span>
                        </td>
                        <td className="text-center">
                          <div translate="no" className={`notranslate w-5 h-5 mx-auto flex items-center justify-center text-[9px] font-bold rounded ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {sub.socio.sexo === 'F' ? 'F' : 'M'}
                          </div>
                        </td>
                        <td className="font-mono text-xs font-bold text-primary">{sub.socio.codigo}</td>
                        <td className="text-warning font-bold text-xs">
                          {format(new Date(sub.fechaFin), 'dd/MM/yyyy')}
                        </td>
                        <td>
                            <Link href={`/socios/${sub.socio.id}`} className="btn btn-ghost btn-xs btn-circle text-primary">
                                <Eye size={14} />
                            </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 divide-y divide-base-200 md:hidden">
                {expiring.map(sub => (
                  <Link key={sub.id} href={`/socios/${sub.socio.id}`} className="p-4 flex justify-between items-center hover:bg-base-200/50">
                    <div className="flex items-center gap-3">
                        <div translate="no" className={`notranslate w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full ${sub.socio.sexo === 'F' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                            {sub.socio.sexo === 'F' ? 'F' : 'M'}
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-tight">{sub.socio.nombres} {sub.socio.apellidos}</p>
                            <p className="text-[10px] opacity-60 font-mono text-primary font-bold">{sub.socio.codigo}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-warning font-bold text-xs block">{format(new Date(sub.fechaFin), 'dd/MM/yyyy')}</span>
                        <span className="text-[9px] opacity-50 uppercase">Vence</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination Controls for Expiring */}
              {totalExpPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 bg-base-200/20 border-t border-base-200">
                    <Link 
                        href={`/?pageExp=${currentExpPage - 1}`}
                        className={`btn btn-xs btn-outline ${currentExpPage <= 1 ? 'btn-disabled' : ''}`}
                    >
                        <ChevronLeft size={14} />
                    </Link>
                    <span className="text-[10px] font-bold opacity-60 uppercase">Página {currentExpPage} de {totalExpPages}</span>
                    <Link 
                        href={`/?pageExp=${currentExpPage + 1}`}
                        className={`btn btn-xs btn-outline ${currentExpPage >= totalExpPages ? 'btn-disabled' : ''}`}
                    >
                        <ChevronRight size={14} />
                    </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expired Subscriptions Summary */}
        {expired.length > 0 && (
          <div className="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
            <div className="card-body p-0">
               <div className="bg-error/10 p-4 border-b border-error/20 flex items-center justify-between">
                <h2 className="card-title text-error text-sm md:text-base flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Suscripciones Vencidas
                  <div className="badge badge-error text-white font-bold">{expired.length}</div>
                </h2>
                <Link href="/socios/vencidos" className="btn btn-xs btn-error text-white">Ver todos</Link>
              </div>

              <div className="p-4 md:p-6 text-center">
                <p className="text-sm opacity-70 mb-4">Hay {expired.length} socios con membresías caducadas que requieren renovación.</p>
                <Link href="/socios/vencidos" className="btn btn-outline btn-error btn-sm w-full md:w-auto">
                    Gestionar Vencidos →
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
