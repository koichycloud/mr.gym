'use client'

import Link from 'next/link'
import { Home, Users, Upload } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { useSession, signOut } from "next-auth/react"

export default function Navbar() {
    const pathname = usePathname()
    const { data: session } = useSession()

    console.log("Navbar Session Debug:", session)
    console.log("User Role:", session?.user?.role)

    if (pathname === '/login') return null

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
                    </ul>
                </div>
                <Link href="/" className="btn btn-ghost text-xl font-black text-primary">Mr. GYM</Link>
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
                    {session?.user?.role === 'ADMIN' && (
                        <li>
                            <Link href="/users" className={isActive('/users')}>
                                <Users size={18} />
                                Usuarios
                            </Link>
                        </li>
                    )}
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
                            <li><button onClick={() => signOut()}>Cerrar Sesión</button></li>
                        </ul>
                    </div>
                ) : (
                    <Link href="/login" className="btn btn-primary btn-sm">Iniciar Sesión</Link>
                )}
            </div>
        </div>
    )
}
