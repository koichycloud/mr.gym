'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSocioById } from '@/app/actions/socios'
import { createSubscription, updateSubscription } from '@/app/actions/suscripciones'
import { getAsistenciasPorSocio } from '@/app/actions/asistencia-socio'
import { ArrowLeft, Edit, Plus, Calendar, Phone, CreditCard, User, MapPin, CalendarDays, TrendingUp, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import NewSubscriptionModal from '@/app/components/suscripciones/NewSubscriptionModal'
import EditSubscriptionModal from '@/app/components/suscripciones/EditSubscriptionModal'
import MedidasTab from '@/app/components/medidas/MedidasTab'
import { QRCodeSVG } from 'qrcode.react'

export default function SocioDetailClient({ socio }: { socio: any }) {
    const [showModal, setShowModal] = useState(false)
    const [editingSub, setEditingSub] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'general' | 'medidas' | 'carnet' | 'asistencias'>('general')
    const [asistenciasData, setAsistenciasData] = useState<any>(null)
    const [loadingAsistencias, setLoadingAsistencias] = useState(false)

    if (!socio) return <div>Cargando...</div>

    const latestSub = socio.suscripciones && socio.suscripciones.length > 0
        ? socio.suscripciones[0]
        : null

    const handleNewSubscription = async (data: any) => {
        return await createSubscription(data)
    }

    const handleEditSubscription = async (id: string, newDate: Date, meses: number) => {
        return await updateSubscription(id, newDate, meses)
    }

    // Load attendance data when tab is activated
    useEffect(() => {
        if (activeTab === 'asistencias' && !asistenciasData) {
            setLoadingAsistencias(true)
            getAsistenciasPorSocio(socio.id, 50).then(data => {
                setAsistenciasData(data)
                setLoadingAsistencias(false)
            })
        }
    }, [activeTab, socio.id, asistenciasData])

    return (
        <div className="min-h-screen bg-transparent p-4 md:p-8 pb-24 lg:pb-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-row items-center gap-3 w-full">
                        <Link href="/socios" className="btn btn-ghost btn-circle btn-sm md:btn-md shrink-0">
                            <ArrowLeft />
                        </Link>

                        {socio.fotoUrl ? (
                            <div className="avatar shrink-0 border-4 border-base-200 rounded-full shadow-lg">
                                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden">
                                    <img src={socio.fotoUrl} alt="Avatar de Socio" className="object-cover" />
                                </div>
                            </div>
                        ) : (
                            <div className="avatar placeholder shrink-0 shadow-lg border-2 border-base-200 rounded-full">
                                <div className="bg-neutral text-neutral-content rounded-full w-14 h-14 md:w-20 md:h-20 flex items-center justify-center">
                                    <span className="text-xl md:text-3xl font-bold">{socio.nombres?.[0] || 'S'}</span>
                                </div>
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg md:text-3xl font-bold leading-tight truncate whitespace-normal break-words">{socio.nombres} {socio.apellidos}</h1>
                            <p className="opacity-60 font-mono text-xs md:text-sm">{socio.codigo}</p>
                        </div>
                    </div>
                    <Link href={`/socios/${socio.id}/editar`} className="btn btn-outline btn-sm md:btn-md w-full md:w-auto shrink-0 mt-2 md:mt-0">
                        <Edit size={16} className="mr-2" />
                        Editar Perfil
                    </Link>
                </div>

                {/* Tabs */}
                <div className="w-full">
                    <div role="tablist" className="tabs tabs-boxed grid grid-cols-2 md:flex md:flex-wrap w-full gap-1 p-1">
                        <a
                            role="tab"
                            className={`tab h-auto py-2.5 text-xs md:text-sm font-medium rounded border border-transparent transition-all ${activeTab === 'general' ? 'tab-active !text-primary !border-primary/40 !bg-primary/10 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                            onClick={() => setActiveTab('general')}
                        >
                            General & Suscripciones
                        </a>
                        <a
                            role="tab"
                            className={`tab h-auto py-2.5 text-xs md:text-sm font-medium rounded border border-transparent transition-all ${activeTab === 'medidas' ? 'tab-active !text-primary !border-primary/40 !bg-primary/10 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                            onClick={() => setActiveTab('medidas')}
                        >
                            Datos Físicos
                        </a>
                        <a
                            role="tab"
                            className={`tab h-auto py-2.5 text-xs md:text-sm font-medium rounded border border-transparent transition-all ${activeTab === 'carnet' ? 'tab-active !text-primary !border-primary/40 !bg-primary/10 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                            onClick={() => setActiveTab('carnet')}
                        >
                            Carnet Digital
                        </a>
                        <a
                            role="tab"
                            className={`tab h-auto py-2.5 text-xs md:text-sm font-medium rounded border border-transparent transition-all ${activeTab === 'asistencias' ? 'tab-active !text-primary !border-primary/40 !bg-primary/10 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                            onClick={() => setActiveTab('asistencias')}
                        >
                            Asistencias
                        </a>
                    </div>
                </div>

                {activeTab === 'carnet' && (
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body items-center text-center">
                            <h2 className="card-title text-2xl mb-2">Carnet de Acceso</h2>
                            <div className="p-4 bg-white rounded-lg border-2 border-base-300" id="qr-code-container">
                                <QRCodeSVG
                                    value={socio.codigo}
                                    size={256}
                                    level="H"
                                    includeMargin
                                    id="socio-qr-svg"
                                />
                            </div>
                            <p className="mt-4 font-mono text-xl tracking-widest font-bold">{socio.codigo}</p>
                            <p className="text-sm opacity-60">Muestra este código en recepción para ingresar</p>

                            <div className="flex gap-2 mt-4">
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    const svg = document.getElementById("socio-qr-svg");
                                    if (svg) {
                                        const svgData = new XMLSerializer().serializeToString(svg);
                                        const canvas = document.createElement("canvas");
                                        const ctx = canvas.getContext("2d");
                                        const img = new Image();
                                        img.onload = () => {
                                            canvas.width = img.width;
                                            canvas.height = img.height;
                                            ctx?.drawImage(img, 0, 0);
                                            const pngFile = canvas.toDataURL("image/png");
                                            const downloadLink = document.createElement("a");
                                            downloadLink.download = `QR-${socio.nombres}-${socio.codigo}.png`;
                                            downloadLink.href = pngFile;
                                            downloadLink.click();
                                        };
                                        img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                    }
                                }}>
                                    Descargar QR ⬇️
                                </button>
                                <div className="flex flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    <p className="text-xs opacity-50 text-center font-semibold mb-1">Opciones de envío:</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <button className="btn btn-outline btn-sm" onClick={async () => {
                                            if (!socio.telefono) {
                                                alert("El socio no tiene un número de teléfono registrado.");
                                                return;
                                            }
                                            const phone = socio.telefono.replace(/\D/g, '');
                                            const text = `Hola ${socio.nombres}, aquí tienes tu código de acceso para Mr. Gym: ${socio.codigo}`;
                                            const targetUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

                                            try {
                                                const svg = document.getElementById("socio-qr-svg");
                                                if (svg) {
                                                    const svgData = new XMLSerializer().serializeToString(svg);
                                                    const canvas = document.createElement("canvas");
                                                    const ctx = canvas.getContext("2d");
                                                    const img = new Image();

                                                    await new Promise((resolve) => {
                                                        img.onload = async () => {
                                                            canvas.width = img.width;
                                                            canvas.height = img.height;

                                                            if (ctx) {
                                                                ctx.fillStyle = "#FFFFFF";
                                                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                                ctx.drawImage(img, 0, 0);
                                                            }

                                                            canvas.toBlob(async (blob) => {
                                                                if (blob) {
                                                                    try {
                                                                        const item = new ClipboardItem({ "image/png": blob });
                                                                        await navigator.clipboard.write([item]);
                                                                        alert("✅ Imagen QR copiada.\n\nSe abrirá el chat del socio.\nMantén presionado en el chat y selecciona PEGAR para enviar el código.");
                                                                    } catch (e) {
                                                                        console.error("No se pudo copiar", e);
                                                                    }
                                                                }
                                                                window.open(targetUrl, '_blank');
                                                                resolve(null);
                                                            }, 'image/png');
                                                        };
                                                        img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgData)));
                                                    });
                                                    return;
                                                }
                                            } catch (err) {
                                                console.error("Error al copiar QR:", err);
                                            }
                                            window.open(targetUrl, '_blank');
                                        }}>
                                            💬 Chat Directo (Pegar QR)
                                        </button>

                                        <button className="btn btn-primary btn-sm" onClick={async () => {
                                            const text = `Hola ${socio.nombres}, aquí tienes tu código de acceso para Mr. Gym: ${socio.codigo}`;

                                            try {
                                                const svg = document.getElementById("socio-qr-svg");
                                                if (svg) {
                                                    const svgData = new XMLSerializer().serializeToString(svg);
                                                    const canvas = document.createElement("canvas");
                                                    const ctx = canvas.getContext("2d");
                                                    const img = new Image();

                                                    await new Promise((resolve) => {
                                                        img.onload = async () => {
                                                            canvas.width = img.width;
                                                            canvas.height = img.height;

                                                            if (ctx) {
                                                                ctx.fillStyle = "#FFFFFF";
                                                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                                ctx.drawImage(img, 0, 0);
                                                            }

                                                            canvas.toBlob(async (blob) => {
                                                                if (!blob) {
                                                                    alert("Error al generar la imagen.");
                                                                    resolve(null);
                                                                    return;
                                                                }

                                                                const file = new File([blob], `QR-${socio.nombres}-${socio.codigo}.png`, { type: "image/png" });
                                                                const shareData = {
                                                                    title: 'Código QR de Acceso',
                                                                    text: text,
                                                                    files: [file]
                                                                };

                                                                if (navigator.canShare && navigator.canShare(shareData)) {
                                                                    try {
                                                                        await navigator.share(shareData);
                                                                    } catch (err: any) {
                                                                        console.log("Compartir cancelado o falló", err.message);
                                                                    }
                                                                } else {
                                                                    alert("Tu dispositivo no soporta compartir nativamente. Usa 'Chat Directo'.");
                                                                }
                                                                resolve(null);
                                                            }, 'image/png');
                                                        };
                                                        img.src = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgData)));
                                                    });
                                                    return;
                                                }
                                            } catch (err) {
                                                console.error("Error al compartir QR:", err);
                                            }
                                        }}>
                                            📤 Compartir (Menú)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 alert alert-info">
                                <MapPin size={24} />
                                <div>
                                    <h3 className="font-bold">Estado de Acceso</h3>
                                    <div className="text-sm">
                                        {latestSub?.estado === 'ACTIVA'
                                            ? <span className="text-success font-bold text-lg">HABILITADO ✅</span>
                                            : <span className="text-error font-bold text-lg">DENEGADO ❌</span>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'asistencias' && (
                    <div className="space-y-6">
                        {loadingAsistencias ? (
                            <div className="flex justify-center p-12">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                            </div>
                        ) : asistenciasData ? (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="stats shadow bg-base-100">
                                        <div className="stat">
                                            <div className="stat-figure text-primary">
                                                <CalendarDays className="inline-block w-8 h-8 stroke-current" />
                                            </div>
                                            <div className="stat-title">Total Asistencias</div>
                                            <div className="stat-value text-primary">{asistenciasData.stats.total}</div>
                                            <div className="stat-desc">Desde el registro</div>
                                        </div>
                                    </div>

                                    <div className="stats shadow bg-base-100">
                                        <div className="stat">
                                            <div className="stat-figure text-secondary">
                                                <Clock className="inline-block w-8 h-8 stroke-current" />
                                            </div>
                                            <div className="stat-title">Últimos 30 días</div>
                                            <div className="stat-value text-secondary">{asistenciasData.stats.ultimos30Dias}</div>
                                            <div className="stat-desc">Visitas recientes</div>
                                        </div>
                                    </div>

                                    <div className="stats shadow bg-base-100">
                                        <div className="stat">
                                            <div className="stat-figure text-accent">
                                                <Calendar className="inline-block w-8 h-8 stroke-current" />
                                            </div>
                                            <div className="stat-title">Este Mes</div>
                                            <div className="stat-value text-accent">{asistenciasData.stats.esteMes}</div>
                                            <div className="stat-desc">{format(new Date(), 'MMMM yyyy', { locale: es })}</div>
                                        </div>
                                    </div>

                                    <div className="stats shadow bg-base-100">
                                        <div className="stat">
                                            <div className="stat-figure text-success">
                                                <TrendingUp className="inline-block w-8 h-8 stroke-current" />
                                            </div>
                                            <div className="stat-title">Promedio Diario</div>
                                            <div className="stat-value text-success">{asistenciasData.stats.promedioDiario}</div>
                                            <div className="stat-desc">Últimos 30 días</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Attendance Table */}
                                <div className="card bg-base-100 shadow-xl">
                                    <div className="card-body">
                                        <h2 className="card-title">Historial de Asistencias (Últimas 50)</h2>
                                        {asistenciasData.asistencias.length === 0 ? (
                                            <div className="text-center py-12 text-base-content/50">
                                                <CalendarDays size={48} className="mx-auto mb-4 opacity-30" />
                                                <p className="text-lg">Sin registros de asistencia</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="table table-zebra">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Fecha</th>
                                                            <th>Hora</th>
                                                            <th>Tipo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {asistenciasData.asistencias.map((a: any, index: number) => (
                                                            <tr key={a.id} className="hover">
                                                                <td className="font-mono text-sm opacity-60">
                                                                    {asistenciasData.asistencias.length - index}
                                                                </td>
                                                                <td className="font-semibold">
                                                                    {format(new Date(a.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                                                                </td>
                                                                <td className="font-bold text-primary">
                                                                    {format(new Date(a.fecha), 'HH:mm:ss')}
                                                                </td>
                                                                <td>
                                                                    <div className="badge badge-success badge-sm">
                                                                        {a.tipo}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-lg opacity-50">Error cargando asistencias</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Personal Info & Renewal History */}
                        <div className="space-y-6">
                            {/* Info Card */}
                            <div className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h2 className="card-title mb-4 border-b pb-2">Información Personal</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="text-primary w-5 h-5" />
                                            <div>
                                                <p className="text-xs opacity-50">Documento</p>
                                                <p className="font-semibold">{socio.tipoDocumento} - {socio.numeroDocumento}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="text-primary w-5 h-5" />
                                            <div>
                                                <p className="text-xs opacity-50">Teléfono</p>
                                                <p className="font-semibold">{socio.telefono || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="text-primary w-5 h-5" />
                                            <div>
                                                <p className="text-xs opacity-50">Fecha de Nacimiento</p>
                                                <p className="font-semibold">{format(new Date(socio.fechaNacimiento), 'dd/MM/yyyy')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Renewal Codes History Card */}
                            <div className="card bg-base-100 shadow-xl overflow-hidden h-fit">
                                <div className="card-body p-0">
                                    <div className="p-4 bg-base-300 font-bold flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-primary" />
                                        <span className="text-sm">Códigos de Renovación</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {/* Desktop View */}
                                        <table className="hidden md:table table-compact table-zebra w-full text-[10px]">
                                            <thead>
                                                <tr>
                                                    <th>Fecha</th>
                                                    <th className="text-right">Código/Recibo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {socio.historialCodigos?.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td>{format(new Date(item.fechaCambio), 'dd/MM/yyyy')}</td>
                                                        <td className="font-mono text-right">{item.codigo}</td>
                                                    </tr>
                                                ))}
                                                {(!socio.historialCodigos || socio.historialCodigos.length === 0) && (
                                                    <tr>
                                                        <td colSpan={2} className="text-center py-4 opacity-50">
                                                            Sin renovación previa
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Mobile View */}
                                        <div className="md:hidden flex flex-col divide-y divide-base-200">
                                            {socio.historialCodigos?.map((item: any) => (
                                                <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                                                    <span className="opacity-70">{format(new Date(item.fechaCambio), 'dd/MM/yyyy')}</span>
                                                    <span className="font-mono font-bold text-primary">{item.codigo}</span>
                                                </div>
                                            ))}
                                            {(!socio.historialCodigos || socio.historialCodigos.length === 0) && (
                                                <div className="text-center py-4 opacity-50 text-sm">
                                                    Sin renovación previa
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Subscription Status & History */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className={`card shadow-xl ${latestSub?.estado === 'ACTIVA' ? 'bg-success/10 border-success' : 'bg-error/10 border-error'} border-l-4`}>
                                <div className="card-body flex-row justify-between items-center">
                                    <div>
                                        <h2 className={`text-xl font-bold ${latestSub?.estado === 'ACTIVA' ? 'text-success' : 'text-error'}`}>
                                            Estado de Suscripción: {latestSub?.estado || 'SIN SUSCRIPCIÓN'}
                                        </h2>
                                        {latestSub && (
                                            <p className="opacity-70">
                                                Vence el: <span className="font-bold">{format(new Date(latestSub.fechaFin), 'dd/MM/yyyy')}</span>
                                            </p>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                        <Plus className="mr-2" />
                                        Renovar / Nueva
                                    </button>
                                </div>
                            </div>

                            {/* History Table */}
                            <div className="card bg-base-100 shadow-xl overflow-hidden">
                                <div className="card-body p-0">
                                    <div className="p-4 bg-base-300 font-bold">Historial de Suscripciones</div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Inicio</th>
                                                    <th>Meses</th>
                                                    <th>Vencimiento</th>
                                                    <th>Código/Recibo</th>
                                                    <th>Estado</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {socio.suscripciones?.map((sub: any, index: number) => {
                                                    const historicalCodes = socio.historialCodigos || []
                                                    const displayCode = sub.codigo || (index === 0 ? socio.codigo : (historicalCodes[index - 1]?.codigo || socio.codigo))

                                                    return (
                                                        <tr key={sub.id}>
                                                            <td>{format(new Date(sub.fechaInicio), 'dd/MM/yyyy')}</td>
                                                            <td>{sub.meses}</td>
                                                            <td>{format(new Date(sub.fechaFin), 'dd/MM/yyyy')}</td>
                                                            <td className="font-mono text-xs text-primary">{displayCode}</td>
                                                            <td>
                                                                <div className={`badge ${sub.estado === 'ACTIVA' ? 'badge-success' : 'badge-ghost'}`}>
                                                                    {sub.estado}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-ghost btn-xs"
                                                                    onClick={() => setEditingSub(sub)}
                                                                    title="Editar fecha de inicio"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                                {(!socio.suscripciones || socio.suscripciones.length === 0) && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-4 opacity-50">No hay historial</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden grid grid-cols-1 gap-2 p-2">
                                        {socio.suscripciones?.map((sub: any, index: number) => {
                                            const historicalCodes = socio.historialCodigos || []
                                            const displayCode = sub.codigo || (index === 0 ? socio.codigo : (historicalCodes[index - 1]?.codigo || socio.codigo))

                                            return (
                                                <div key={sub.id} className="bg-base-200 border border-base-300 rounded-lg p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className={`badge badge-sm ${sub.estado === 'ACTIVA' ? 'badge-success' : 'badge-ghost'}`}>
                                                            {sub.estado}
                                                        </div>
                                                        <button
                                                            className="btn btn-ghost btn-xs text-primary"
                                                            onClick={() => setEditingSub(sub)}
                                                        >
                                                            <Edit size={14} className="mr-1" /> Editar
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="opacity-50 block">Inicio</span>
                                                            <span className="font-semibold">{format(new Date(sub.fechaInicio), 'dd/MM/yyyy')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-50 block">Vencimiento</span>
                                                            <span className="font-semibold">{format(new Date(sub.fechaFin), 'dd/MM/yyyy')}</span>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-50 block">Duración</span>
                                                            <span className="font-semibold">{sub.meses} {sub.meses === 1 ? 'mes' : 'meses'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-50 block">Código</span>
                                                            <span className="font-mono text-primary font-bold">{displayCode}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {(!socio.suscripciones || socio.suscripciones.length === 0) && (
                                            <div className="text-center py-4 opacity-50 text-sm">No hay historial</div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div >
                )}

                {activeTab === 'medidas' && (
                    <MedidasTab
                        socioId={socio.id}
                        fechaNacimiento={socio.fechaNacimiento}
                        sexo={socio.sexo}
                    />
                )}
            </div >

            {
                showModal && (
                    <NewSubscriptionModal
                        socioId={socio.id}
                        socioNombre={socio.nombres}
                        socioCodigo={socio.codigo}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleNewSubscription}
                    />
                )
            }

            {
                editingSub && (
                    <EditSubscriptionModal
                        subscription={editingSub}
                        onClose={() => setEditingSub(null)}
                        onSubmit={handleEditSubscription}
                    />
                )
            }
        </div >
    )
}
