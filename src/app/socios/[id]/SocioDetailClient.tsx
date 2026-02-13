'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSocioById } from '@/app/actions/socios'
import { createSubscription, updateSubscription } from '@/app/actions/suscripciones'
import { ArrowLeft, Edit, Plus, Calendar, Phone, CreditCard, User, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import NewSubscriptionModal from '@/app/components/suscripciones/NewSubscriptionModal'
import EditSubscriptionModal from '@/app/components/suscripciones/EditSubscriptionModal'
import MedidasTab from '@/app/components/medidas/MedidasTab'
import { QRCodeSVG } from 'qrcode.react'

export default function SocioDetailClient({ socio }: { socio: any }) {
    const [showModal, setShowModal] = useState(false)
    const [editingSub, setEditingSub] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'general' | 'medidas' | 'carnet'>('general')

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

    return (
        <div className="min-h-screen bg-base-200 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/socios" className="btn btn-ghost btn-circle">
                            <ArrowLeft />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{socio.nombres} {socio.apellidos}</h1>
                            <p className="opacity-60 font-mono">{socio.codigo}</p>
                        </div>
                    </div>
                    <Link href={`/socios/${socio.id}/editar`} className="btn btn-outline">
                        <Edit size={20} className="mr-2" />
                        Editar Perfil
                    </Link>

                </div>

                {/* Tabs */}
                <div role="tablist" className="tabs tabs-boxed">
                    <a
                        role="tab"
                        className={`tab ${activeTab === 'general' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General & Suscripciones
                    </a>
                    <a
                        role="tab"
                        className={`tab ${activeTab === 'medidas' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('medidas')}
                    >
                        Datos Físicos
                    </a>
                    <a
                        role="tab"
                        className={`tab ${activeTab === 'carnet' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('carnet')}
                    >
                        Carnet Digital
                    </a>
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
                                <button className="btn btn-outline btn-sm" onClick={() => {
                                    const text = `Hola ${socio.nombres}, aquí tienes tu código de acceso para Mr. Gym: ${socio.codigo}`;
                                    window.open(`https://wa.me/${socio.telefono}?text=${encodeURIComponent(text)}`, '_blank');
                                }}>
                                    Enviar por WhatsApp 💬
                                </button>
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

                {activeTab === 'general' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

                        {/* Subscription Status Card */}
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
                                    <div className="overflow-x-auto">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Inicio</th>
                                                    <th>Meses</th>
                                                    <th>Vencimiento</th>
                                                    <th>Estado</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {socio.suscripciones?.map((sub: any) => (
                                                    <tr key={sub.id}>
                                                        <td>{format(new Date(sub.fechaInicio), 'dd/MM/yyyy')}</td>
                                                        <td>{sub.meses}</td>
                                                        <td>{format(new Date(sub.fechaFin), 'dd/MM/yyyy')}</td>
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
                                                ))}
                                                {(!socio.suscripciones || socio.suscripciones.length === 0) && (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-4 opacity-50">No hay historial</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <MedidasTab
                        socioId={socio.id}
                        fechaNacimiento={socio.fechaNacimiento}
                        sexo={socio.sexo}
                    />
                )}
            </div>

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
