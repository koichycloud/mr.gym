'use client'

import Link from 'next/link'
import { Home, Users, Upload, CalendarDays, DollarSign, ScanLine } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { useSession, signOut } from "next-auth/react"

export default function Navbar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    if (pathname === '/login' || pathname === '/admin/scanner/cliente') return null

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return 'active'
        if (path !== '/' && pathname.startsWith(path)) return 'active'
        return ''
    }

    return (
        <div className="navbar bg-base-100 shadow-sm border-b border-base-200">
            <div className="navbar-start">
                <div className="dropdown">
                    <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                        <li><Link href="/" className={isActive('/')}>Inicio</Link></li>
                        <li><Link href="/socios" className={isActive('/socios')}>Socios</Link></li>
                        <li><Link href="/asistencia" className={isActive('/asistencia')}>Asistencia</Link></li>
                        {session?.user?.role === 'ADMIN' && (
                            <li><Link href="/caja" className={isActive('/caja')}>Caja</Link></li>
                        )}
                        <li><Link href="/admin/scanner" className={isActive('/admin/scanner')}>Scanner</Link></li>
                        {session?.user?.role === 'ADMIN' && (
                            <li><Link href="/users" className={isActive('/users')}>Usuarios</Link></li>
                        )}
                    </ul>
                </div>
                <Link href="/" className="btn btn-ghost text-4xl font-black text-[#3f2009]" style={{ WebkitTextStroke: '4px black', paintOrder: 'stroke fill' }}>Mr. GYM</Link>
            </div>
            <div className="navbar-center hidden lg:flex">
                <ul className="menu menu-horizontal px-1 space-x-2">
                    <li>
                        <Link href="/" className={isActive('/')}>
                            <Home size={18} />
                            Inicio
                        </Link>
                    </li>
                    <li>
                        <Link href="/socios" className={isActive('/socios')}>
                            <Users size={18} />
                            Socios
                        </Link>
                    </li>
                    <li>
                        <Link href="/asistencia" className={isActive('/asistencia')}>
                            <CalendarDays size={18} />
                            Asistencia
                        </Link>
                    </li>
                    {session?.user?.role === 'ADMIN' && (
                        <li>
                            <Link href="/caja" className={isActive('/caja')}>
                                <DollarSign size={18} />
                                Caja
                            </Link>
                        </li>
                    )}
                    {session?.user?.role === 'ADMIN' && (
                        <li>
                            <Link href="/users" className={isActive('/users')}>
                                <Users size={18} />
                                Usuarios
                            </Link>
                        </li>
                    )}
                    <li>
                        <Link href="/admin/scanner" className={isActive('/admin/scanner')}>
                            <ScanLine size={18} />
                            Scanner
                        </Link>
                    </li>
                </ul>
            </div>
            <div className="navbar-end">
                {session?.user ? (
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-10">
                                <span className="text-xl">{session.user.name?.[0].toUpperCase()}</span>
                            </div>
                        </div>
                        <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                            <li><button onClick={() => signOut({ callbackUrl: '/login' })}>Cerrar Sesión</button></li>
                        </ul>
                    </div>
                ) : (
                    <Link href="/login" className="btn btn-primary btn-sm">Iniciar Sesión</Link>
                )}
            </div>
        </div>
    )
}

