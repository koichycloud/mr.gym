'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Users, Upload, CalendarDays, DollarSign, ScanLine, Menu, FileText, UserCog, LogOut, AlertTriangle } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { useSession, signOut } from "next-auth/react"

export default function Navbar() {
    const pathname = usePathname()
    const { data: session, status } = useSession()

    useEffect(() => {
        if (session?.user?.id) {
            fetch(`/api/users/${session.user.id}`)
                .then(res => res.json())
                .then(data => {
                    // Do nothing for now
                })
                .catch(err => console.error("Could not fetch user profile", err))
        }
    }, [session?.user?.id])

    if (pathname === '/login' || pathname === '/admin/scanner/cliente') return null

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return 'active text-primary'
        if (path !== '/' && pathname.startsWith(path)) return 'active text-primary'
        return 'text-base-content/70 hover:text-base-content'
    }

    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN';

    return (
        <>
            {/* TOP NAVBAR (Desktop & Mobile Header) */}
            <div className="navbar bg-base-100 shadow-sm border-b border-base-200">
                <div className="navbar-start">
                    <Link href="/" className="btn btn-ghost text-4xl font-black text-[#3f2009]" style={{ WebkitTextStroke: '4px black', paintOrder: 'stroke fill' }}>Mr. GYM</Link>
                </div>

                {/* Desktop Navigation Links */}
                <div className="navbar-center hidden lg:flex">
                    <ul className="menu menu-horizontal px-1 space-x-2">
                        <li>
                            <Link href="/" className={isActive('/')}>
                                <Home size={18} /> Inicio
                            </Link>
                        </li>
                        <li>
                            <Link href="/socios" className={isActive('/socios')}>
                                <Users size={18} /> Socios
                            </Link>
                        </li>
                        <li>
                            <Link href="/asistencia" className={isActive('/asistencia')}>
                                <CalendarDays size={18} /> Asistencia
                            </Link>
                        </li>
                        <li>
                            <Link href="/socios/vencidos" className={isActive('/socios/vencidos')}>
                                <AlertTriangle size={18} /> Vencidos
                            </Link>
                        </li>
                        {isAdmin && (
                            <li>
                                <Link href="/caja" className={isActive('/caja')}>
                                    <DollarSign size={18} /> Caja
                                </Link>
                            </li>
                        )}
                        {isAdmin && (
                            <>
                                <li>
                                    <Link href="/users" className={isActive('/users')}>
                                        <Users size={18} /> Usuarios
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/bitacora" className={isActive('/admin/bitacora')}>
                                        <FileText size={18} /> Bitácora
                                    </Link>
                                </li>
                            </>
                        )}
                        <li>
                            <Link href="/admin/scanner" className={isActive('/admin/scanner')}>
                                <ScanLine size={18} /> Scanner
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="navbar-end">
                    {session?.user ? (
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                                <div className="bg-neutral text-neutral-content rounded-full w-10 overflow-hidden">
                                    <span className="text-xl flex h-full items-center justify-center">
                                        {session.user.name?.[0].toUpperCase() || "U"}
                                    </span>
                                </div>
                            </div>
                            <ul tabIndex={0} onClick={() => { const el = document.activeElement as HTMLElement; if(el) el.blur(); }} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
                                <li className="menu-title px-4 py-2 border-b border-base-200 mb-2">
                                    <span className="font-bold text-base-content block truncate">{session.user.name}</span>
                                    <span className="text-[10px] uppercase opacity-60 mt-0.5 block">{session.user.role}</span>
                                </li>
                                <li><Link href="/perfil" className="justify-between">Mi Perfil <span className="badge badge-sm badge-primary">Nuevo</span></Link></li>
                                <li><button onClick={() => signOut({ callbackUrl: '/login' })} className="text-error mt-2">Cerrar Sesión</button></li>
                            </ul>
                        </div>
                    ) : (
                        <Link href="/login" className="btn btn-primary btn-sm">Iniciar Sesión</Link>
                    )}
                </div>
            </div>

            {/* BOTTOM NAVIGATION BAR (Mobile Only) */}
            {session?.user && (
                <div className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-base-200 bg-base-100 z-50"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <div className="flex flex-row items-stretch justify-around w-full h-16">

                        <Link href="/" className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors ${pathname === '/' ? 'text-primary' : 'text-base-content/60 hover:text-base-content'}`}>
                            <Home size={22} />
                            <span>Inicio</span>
                        </Link>

                        <Link href="/socios" className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors ${pathname.startsWith('/socios') ? 'text-primary' : 'text-base-content/60 hover:text-base-content'}`}>
                            <Users size={22} />
                            <span>Socios</span>
                        </Link>

                        <Link href="/asistencia" className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors ${pathname.startsWith('/asistencia') ? 'text-primary' : 'text-base-content/60 hover:text-base-content'}`}>
                            <CalendarDays size={22} />
                            <span>Asistencia</span>
                        </Link>

                        <Link href="/admin/scanner" className={`flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors ${pathname.startsWith('/admin/scanner') ? 'text-primary' : 'text-base-content/60 hover:text-base-content'}`}>
                            <ScanLine size={22} />
                            <span>Scanner</span>
                        </Link>

                        {/* Botón "Más" */}
                        <div className={`dropdown dropdown-top dropdown-end flex-1`}>
                            <div tabIndex={0} role="button"
                                className={`flex flex-col items-center justify-center w-full h-16 gap-1 text-[10px] font-medium transition-colors cursor-pointer ${pathname.startsWith('/caja') || pathname.startsWith('/users') || pathname.startsWith('/admin/bitacora') || pathname.startsWith('/socios/vencidos') ? 'text-primary' : 'text-base-content/60 hover:text-base-content'}`}>
                                <Menu size={22} />
                                <span>Más</span>
                            </div>
                            <ul tabIndex={0} onClick={() => { const el = document.activeElement as HTMLElement; if(el) el.blur(); }} className="dropdown-content z-[100] menu p-2 shadow bg-base-100 rounded-box w-52 mb-2 border border-base-200">
                                <li><Link href="/socios/vencidos"><AlertTriangle size={16} /> Vencidos</Link></li>
                                {isAdmin && (
                                    <>
                                        <li><Link href="/caja"><DollarSign size={16} /> Caja</Link></li>
                                        <li><Link href="/users"><UserCog size={16} /> Usuarios</Link></li>
                                        <li><Link href="/admin/bitacora"><FileText size={16} /> Bitácora</Link></li>
                                        <div className="divider my-0"></div>
                                    </>
                                )}
                                <li><Link href="/perfil"><UserCog size={16} /> Mi Perfil</Link></li>
                                <li><button onClick={() => signOut({ callbackUrl: '/login' })} className="text-error"><LogOut size={16} /> Cerrar Sesión</button></li>
                            </ul>
                        </div>

                    </div>
                </div>
            )}
        </>
    )
}

