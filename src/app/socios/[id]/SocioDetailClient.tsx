'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSocioById, logQRSent, annulSocio, reactivateSocio } from '@/app/actions/socios'
import { createSubscription, updateSubscription, deleteSubscription } from '@/app/actions/suscripciones'
import { getAsistenciasPorSocio } from '@/app/actions/asistencia-socio'
import { ArrowLeft, Edit, Plus, Calendar, Phone, CreditCard, User, MapPin, CalendarDays, TrendingUp, Clock, Download, MessageCircle, Share2, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import NewSubscriptionModal from '@/app/components/suscripciones/NewSubscriptionModal'
import EditSubscriptionModal from '@/app/components/suscripciones/EditSubscriptionModal'
import MedidasTab from '@/app/components/medidas/MedidasTab'
import { QRCodeSVG } from 'qrcode.react'
import { useRouter } from 'next/navigation'
import { registrarPago } from '@/app/actions/pagos'

/** Draws the full branded carnet onto a canvas and returns a Blob.
 *  Uses Blob URL (not btoa) to avoid charset encoding issues with accented names.
 */
async function generateCarnetBlob(
    svgId: string,
    codigo: string,
    nombre: string
): Promise<Blob | null> {
    const svgEl = document.getElementById(svgId) as SVGSVGElement | null
    if (!svgEl) return null

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    return new Promise((resolve) => {
        const qrImg = new Image()
        qrImg.onload = () => {
            const SCALE = 3
            const QR = 252 * SCALE
            const PAD = 16 * SCALE
            const HDR = 64 * SCALE
            const FTR = 60 * SCALE
            const W = QR + PAD * 2
            const H = HDR + QR + PAD * 2 + FTR

            const canvas = document.createElement('canvas')
            canvas.width = W
            canvas.height = H
            const ctx = canvas.getContext('2d')!

            // White base
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, W, H)

            // Header gradient
            const grad = ctx.createLinearGradient(0, 0, W, HDR)
            grad.addColorStop(0, '#4f46e5')
            grad.addColorStop(1, '#7c3aed')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, W, HDR)

            // Header text
            const txtX = PAD + 12 * SCALE
            ctx.fillStyle = '#ffffff'
            ctx.font = `900 ${18 * SCALE}px Arial, sans-serif`
            ctx.textBaseline = 'middle'
            ctx.fillText('MR. GYM', txtX, HDR * 0.38)
            ctx.font = `600 ${9 * SCALE}px Arial, sans-serif`
            ctx.fillStyle = 'rgba(255,255,255,0.75)'
            ctx.fillText('CARNET DE ACCESO', txtX, HDR * 0.72)

            // QR image (clean, on white)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, HDR, W, QR + PAD * 2)
            ctx.drawImage(qrImg, PAD, HDR + PAD, QR, QR)

            // Footer background
            ctx.fillStyle = '#f3f3ff'
            ctx.fillRect(0, HDR + QR + PAD * 2, W, FTR)

            // Footer border line
            ctx.strokeStyle = '#d0d0ee'
            ctx.lineWidth = SCALE
            ctx.beginPath()
            ctx.moveTo(0, HDR + QR + PAD * 2)
            ctx.lineTo(W, HDR + QR + PAD * 2)
            ctx.stroke()

            // Footer code
            ctx.fillStyle = '#4f46e5'
            ctx.font = `900 ${20 * SCALE}px monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(codigo, W / 2, HDR + QR + PAD * 2 + FTR * 0.35)

            // Footer name
            ctx.fillStyle = '#444444'
            ctx.font = `600 ${10 * SCALE}px Arial, sans-serif`
            ctx.fillText(nombre, W / 2, HDR + QR + PAD * 2 + FTR * 0.72)

            URL.revokeObjectURL(svgUrl)
            canvas.toBlob((blob) => resolve(blob), 'image/png')
        }
        qrImg.onerror = () => { URL.revokeObjectURL(svgUrl); resolve(null) }
        qrImg.src = svgUrl
    })
}

const safeFormatDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    if (d.getUTCHours() === 0) {
        d.setUTCHours(12);
    }
    return format(d, 'dd/MM/yyyy');
}

export default function SocioDetailClient({ socio, permissions = [], isAdmin = false }: { socio: any, permissions?: string[], isAdmin?: boolean }) {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [editingSub, setEditingSub] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'general' | 'medidas' | 'carnet' | 'asistencias'>('general')
    const [asistenciasData, setAsistenciasData] = useState<any>(null)
    const [loadingAsistencias, setLoadingAsistencias] = useState(false)
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
    const [asistenciasLimit, setAsistenciasLimit] = useState<number>(50)
    const [generatingAttendancePdf, setGeneratingAttendancePdf] = useState(false)

    // Delete subscription state
    const [deletingSubId, setDeletingSubId] = useState<string | null>(null)

    // Annulment states
    const [showAnnulModal, setShowAnnulModal] = useState(false)
    const [annulReason, setAnnulReason] = useState('')
    const [annulling, setAnnulling] = useState(false)

    if (!socio) return <div>Cargando...</div>

    const latestSub = socio.suscripciones && socio.suscripciones.length > 0
        ? socio.suscripciones[0]
        : null

    const handleNewSubscription = async (data: any, pagoInfo?: any) => {
        return await createSubscription(data, pagoInfo)
    }

    const handleEditSubscription = async (id: string, newDate: Date, meses: number) => {
        return await updateSubscription(id, newDate, meses)
    }

    const handleDeleteSub = async (subId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta renovación? Se borrará permanentemente el pago asociado y el código snapshot erróneo del historial.')) return
        setDeletingSubId(subId)
        try {
            const res = await deleteSubscription(subId)
            if (res.success) {
                alert('Renovación eliminada exitosamente.')
                router.refresh()
            } else {
                alert(res.error || 'Error al eliminar la renovación.')
            }
        } catch (err: any) {
            alert(err.message || 'Ocurrió un error inesperado.')
        } finally {
            setDeletingSubId(null)
        }
    }

    const handleAnnulSocio = async () => {
        if (!annulReason.trim()) return
        setAnnulling(true)
        try {
            const res = await annulSocio(socio.id, annulReason)
            if (res.success) {
                alert('Registro anulado exitosamente.')
                setShowAnnulModal(false)
                setAnnulReason('')
                router.refresh()
            } else {
                alert(res.error || 'Error al anular el registro.')
            }
        } catch (err: any) {
            alert(err.message || 'Ocurrió un error inesperado.')
        } finally {
            setAnnulling(false)
        }
    }

    const [reactivating, setReactivating] = useState(false)
    const handleReactivateSocio = async () => {
        if (!confirm('¿Estás seguro de que deseas reactivar a este socio? Se quitará la anulación y podrá volver a acceder si su membresía está activa.')) return
        setReactivating(true)
        try {
            const res = await reactivateSocio(socio.id)
            if (res.success) {
                alert('Socio reactivado exitosamente.')
                router.refresh()
            } else {
                alert(res.error || 'Error al reactivar al socio.')
            }
        } catch (err: any) {
            alert(err.message || 'Ocurrió un error inesperado.')
        } finally {
            setReactivating(false)
        }
    }

    const [showAbonoModal, setShowAbonoModal] = useState(false)
    const [abonoSub, setAbonoSub] = useState<any | null>(null)
    const [abonoMonto, setAbonoMonto] = useState('')
    const [abonoMetodo, setAbonoMetodo] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN'>('EFECTIVO')
    const [abonoDescripcion, setAbonoDescripcion] = useState('')
    const [savingAbono, setSavingAbono] = useState(false)

    const handleOpenAbono = (sub: any, pending: number) => {
        setAbonoSub(sub)
        setAbonoMonto(pending.toFixed(2))
        setAbonoMetodo('EFECTIVO')
        setAbonoDescripcion(`Abono a membresía plan: ${sub.plan?.nombre || 'General'}`)
        setShowAbonoModal(true)
    }

    const handleSaveAbono = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!abonoSub) return
        const val = parseFloat(abonoMonto)
        if (isNaN(val) || val <= 0) {
            alert('Por favor ingrese un monto válido mayor a 0.')
            return
        }

        setSavingAbono(true)
        try {
            const res = await registrarPago({
                socioId: socio.id,
                suscripcionId: abonoSub.id,
                monto: val,
                metodoPago: abonoMetodo,
                concepto: 'SUSCRIPCION',
                descripcion: abonoDescripcion
            })

            if (res.success) {
                alert('Abono registrado exitosamente.')
                setShowAbonoModal(false)
                setAbonoSub(null)
                router.refresh()
            } else {
                alert(res.error || 'Error al registrar abono.')
            }
        } catch (err: any) {
            alert(err.message || 'Ocurrió un error inesperado.')
        } finally {
            setSavingAbono(false)
        }
    }

    const handleExportAttendancePDF = async () => {
        setGeneratingAttendancePdf(true)
        try {
            const allData = await getAsistenciasPorSocio(socio.id, -1)
            if (!allData || !allData.asistencias || allData.asistencias.length === 0) {
                alert('No hay registros de asistencia para exportar')
                return
            }

            const { generatePDFReport } = await import('@/lib/pdf-utils')

            const columns = ['#', 'Fecha', 'Hora', 'Tipo de Acceso']
            const rows = allData.asistencias.map((a: any, idx: number) => [
                String(allData.asistencias.length - idx),
                format(new Date(a.fecha), 'dd/MM/yyyy'),
                format(new Date(a.fecha), 'hh:mm:ss a'),
                a.tipo
            ])

            generatePDFReport({
                title: 'Reporte de Asistencias',
                subtitle: `Socio: ${socio.nombres} ${socio.apellidos} | Código: ${socio.codigo}`,
                columns,
                rows,
                fileName: `asistencias_${socio.codigo}_${socio.nombres.replace(/\s+/g, '_')}`
            })

        } catch (error) {
            console.error('Error generating attendance PDF:', error)
            alert('Ocurrió un error al generar el reporte PDF')
        } finally {
            setGeneratingAttendancePdf(false)
        }
    }

    // Load attendance data when tab is activated or limit changes
    useEffect(() => {
        if (activeTab === 'asistencias') {
            setLoadingAsistencias(true)
            getAsistenciasPorSocio(socio.id, asistenciasLimit).then(data => {
                setAsistenciasData(data)
                setLoadingAsistencias(false)
            })
        }
    }, [activeTab, socio.id, asistenciasLimit])

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
                            <div 
                                className="avatar shrink-0 border-4 border-base-200 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setViewingPhoto(socio.fotoUrl)}
                            >
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
                            <h1 className="text-lg md:text-3xl font-bold leading-tight truncate whitespace-normal break-words flex items-center gap-2">
                                {socio.nombres} {socio.apellidos}
                                {socio.estado === 'ANULADO' && (
                                    <span className="badge badge-error text-white font-bold animate-pulse text-xs md:text-sm p-3">ANULADO</span>
                                )}
                            </h1>
                            <p className="opacity-60 font-mono text-xs md:text-sm">{socio.codigo}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0 w-full md:w-auto">
                        <Link href={`/socios/${socio.id}/editar`} className="btn btn-outline btn-sm md:btn-md shrink-0">
                            <Edit size={16} className="mr-2" />
                            Editar Perfil
                        </Link>
                        {socio.estado !== 'ANULADO' && (isAdmin || permissions.includes('SOCIOS_EDITAR')) && (
                            <button
                                className="btn btn-error btn-outline btn-sm md:btn-md shrink-0"
                                onClick={() => setShowAnnulModal(true)}
                            >
                                <XCircle size={16} className="mr-2" />
                                Anular Registro
                            </button>
                        )}
                        {socio.estado === 'ANULADO' && (isAdmin || permissions.includes('SOCIOS_EDITAR')) && (
                            <button
                                className="btn btn-success btn-sm md:btn-md shrink-0 font-bold text-white"
                                onClick={handleReactivateSocio}
                                disabled={reactivating}
                            >
                                {reactivating ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs mr-2"></span>
                                        Reactivando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} className="mr-2" />
                                        Reactivar Socio
                                    </>
                                )}
                            </button>
                        )}
                    </div>
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
                            <h2 className="card-title text-2xl mb-4">Carnet de Acceso</h2>

                            {/* Branded QR Card — Option B */}
                            <div
                                id="qr-code-container"
                                style={{
                                    width: '300px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                                    border: '3px solid #4f46e5',
                                    margin: '0 auto',
                                    background: '#fff',
                                }}
                            >
                                {/* Header with brand */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                }}>
                                    <img
                                        src="/icons/icon-192x192.png"
                                        alt="Mr. Gym"
                                        style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }}
                                    />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ color: '#fff', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px', lineHeight: 1 }}>MR. GYM</div>
                                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Carnet de Acceso</div>
                                    </div>
                                </div>

                                {/* Clean QR — nothing behind or on top */}
                                <div style={{ background: '#fff', padding: '16px', display: 'flex', justifyContent: 'center' }}>
                                    {socio.estado === 'ANULADO' ? (
                                        <div style={{
                                            width: '252px',
                                            height: '252px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#fef2f2',
                                            border: '2px dashed #f87171',
                                            borderRadius: '8px',
                                            color: '#dc2626'
                                        }}>
                                            <XCircle size={48} className="mb-2 text-error animate-pulse" />
                                            <span className="font-extrabold text-sm uppercase tracking-wider">CÓDIGO QR ANULADO</span>
                                            <span className="text-[10px] opacity-75 mt-1 font-semibold">Socio Desactivado</span>
                                        </div>
                                    ) : (
                                        <QRCodeSVG
                                            value={socio.codigo}
                                            size={252}
                                            level="H"
                                            includeMargin={false}
                                            bgColor="#FFFFFF"
                                            fgColor="#000000"
                                            id="socio-qr-svg"
                                        />
                                    )}
                                </div>

                                {/* Footer with code + name */}
                                <div style={{
                                    background: '#f8f8ff',
                                    borderTop: '1px solid #e0e0f0',
                                    padding: '10px 16px 14px',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 900, letterSpacing: '4px', color: '#4f46e5' }}>
                                        {socio.codigo}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#555', marginTop: '2px', fontWeight: 600 }}>
                                        {socio.nombres} {socio.apellidos}
                                    </div>
                                </div>
                            </div>


                            <div className="flex flex-col gap-4 mt-8 w-full max-w-sm mx-auto">
                                {/* Estado de Acceso Card */}
                                <div className={`p-4 rounded-2xl border-2 flex items-center gap-4 shadow-sm transition-all ${socio.estado === 'ANULADO' ? 'bg-error/15 border-error text-error animate-pulse' : (latestSub?.estado === 'ACTIVA' ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error')}`}>
                                    <div className={`p-3 rounded-full ${socio.estado === 'ANULADO' ? 'bg-error/20 text-error' : (latestSub?.estado === 'ACTIVA' ? 'bg-success/20 text-success' : 'bg-error/20 text-error')}`}>
                                        {socio.estado === 'ANULADO' ? <XCircle size={32} /> : (latestSub?.estado === 'ACTIVA' ? <CheckCircle size={32} /> : <XCircle size={32} />)}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-xs opacity-70 uppercase tracking-widest mb-0.5">Estado de Acceso</h3>
                                        <div className="text-2xl font-black tracking-tight leading-none">
                                            {socio.estado === 'ANULADO' ? 'ANULADO' : (latestSub?.estado === 'ACTIVA' ? 'HABILITADO' : 'DENEGADO')}
                                        </div>
                                    </div>
                                </div>

                                <div className="divider text-xs font-semibold opacity-50 uppercase tracking-widest my-2">Acciones del QR</div>

                                {/* Botones */}
                                <div className="grid grid-cols-1 gap-3">
                                    <button 
                                        className="btn btn-primary w-full shadow-md font-bold" 
                                        disabled={socio.estado === 'ANULADO'}
                                        onClick={async () => {
                                            const blob = await generateCarnetBlob('socio-qr-svg', socio.codigo, `${socio.nombres} ${socio.apellidos}`)
                                            if (!blob) { alert('Error al generar la imagen. Intenta de nuevo.'); return }
                                            const link = document.createElement('a')
                                            link.download = `QR-${socio.nombres}-${socio.codigo}.png`
                                            link.href = URL.createObjectURL(blob)
                                            link.click()
                                            setTimeout(() => URL.revokeObjectURL(link.href), 5000)
                                        }}
                                    >
                                        <Download size={20} className="mr-1" />
                                        Descargar Imagen
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            className="btn btn-outline btn-success shadow-sm font-bold bg-success/5" 
                                            disabled={socio.estado === 'ANULADO'}
                                            onClick={async () => {
                                                if (!socio.telefono) {
                                                    alert('El socio no tiene un número de teléfono registrado.')
                                                    return
                                                }
                                                const phone = socio.telefono.replace(/\D/g, '')
                                                const phoneWithCountry = phone.length === 9 ? `51${phone}` : phone
                                                const text = `Hola ${socio.nombres}, aquí tienes tu código de acceso para Mr. Gym: ${socio.codigo}`
                                                const targetUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`

                                                window.open(targetUrl, '_blank')
                                                logQRSent(socio.nombres, socio.codigo, 'WhatsApp')

                                                const blob = await generateCarnetBlob('socio-qr-svg', socio.codigo, `${socio.nombres} ${socio.apellidos}`)
                                                if (blob) {
                                                    try {
                                                        const item = new ClipboardItem({ 'image/png': blob })
                                                        await navigator.clipboard.write([item])
                                                        alert('✅ Imagen QR copiada al portapapeles.\n\nEn WhatsApp: mantén presionado en el chat y selecciona PEGAR para enviar el código como imagen.')
                                                    } catch (e) {
                                                        console.error('No se pudo copiar al portapapeles', e)
                                                    }
                                                }
                                            }}
                                        >
                                            <MessageCircle size={18} className="mr-1" />
                                            WhatsApp
                                        </button>


                                        <button 
                                            className="btn btn-outline shadow-sm font-bold bg-base-200/50" 
                                            disabled={socio.estado === 'ANULADO'}
                                            onClick={async () => {
                                                const text = `Hola ${socio.nombres}, aquí tienes tu código de acceso para Mr. Gym: ${socio.codigo}`
                                                const blob = await generateCarnetBlob('socio-qr-svg', socio.codigo, `${socio.nombres} ${socio.apellidos}`)
                                                if (!blob) { alert('Error al generar la imagen.'); return }
                                                const file = new File([blob], `QR-${socio.nombres}-${socio.codigo}.png`, { type: 'image/png' })
                                                const shareData = { title: 'Código QR de Acceso', text, files: [file] }
                                                if (navigator.canShare && navigator.canShare(shareData)) {
                                                    try {
                                                        await navigator.share(shareData)
                                                        logQRSent(socio.nombres, socio.codigo, 'Nativo (Compartir)')
                                                    } catch (err: any) {
                                                        console.log('Compartir cancelado o falló', err.message)
                                                    }
                                                } else {
                                                    alert("Tu dispositivo no soporta compartir nativamente. Usa el botón 'WhatsApp'.")
                                                }
                                            }}
                                        >
                                            <Share2 size={18} className="mr-1" />
                                            Compartir
                                        </button>
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
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b pb-4">
                                            <div>
                                                <h2 className="card-title text-2xl font-black">Historial de Asistencias</h2>
                                                <p className="text-xs opacity-60 mt-1">
                                                    Mostrando {asistenciasLimit > 0 ? `las últimas ${asistenciasLimit}` : 'todas las'} asistencias ({asistenciasData.asistencias.length} de {asistenciasData.stats.total})
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                {/* Select for limit */}
                                                <select 
                                                    value={asistenciasLimit} 
                                                    onChange={(e) => setAsistenciasLimit(Number(e.target.value))}
                                                    className="select select-bordered select-sm w-full sm:w-auto"
                                                >
                                                    <option value={50}>Últimas 50</option>
                                                    <option value={100}>Últimas 100</option>
                                                    <option value={500}>Últimas 500</option>
                                                    <option value={-1}>Ver todas (Sin límite)</option>
                                                </select>

                                                {/* Button for PDF */}
                                                <button
                                                    onClick={handleExportAttendancePDF}
                                                    disabled={generatingAttendancePdf || asistenciasData.asistencias.length === 0}
                                                    className="btn btn-outline btn-primary btn-sm flex-1 sm:flex-none font-bold"
                                                >
                                                    {generatingAttendancePdf ? (
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                    ) : (
                                                        <Download size={14} className="mr-1" />
                                                    )}
                                                    PDF Asistencias
                                                </button>
                                            </div>
                                        </div>
                                        {asistenciasData.asistencias.length === 0 ? (
                                            <div className="text-center py-12 text-base-content/50">
                                                <CalendarDays size={48} className="mx-auto mb-4 opacity-45" />
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
                                                                    {format(new Date(a.fecha), "dd/MM/yyyy")}
                                                                </td>
                                                                <td className="font-bold text-primary">
                                                                    {format(new Date(a.fecha), 'hh:mm:ss a')}
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
                        {socio.estado === 'ANULADO' && (
                            <div className="lg:col-span-3 alert alert-error shadow-lg rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-8 h-8 shrink-0 text-white animate-bounce" />
                                    <div>
                                        <h3 className="font-black text-white text-lg">REGISTRO DE SOCIO ANULADO</h3>
                                        <p className="text-white text-sm opacity-90">
                                            Este socio ha sido retirado del sistema. Su acceso está bloqueado y su código QR está desactivado.
                                        </p>
                                        {socio.motivoAnulacion && (
                                            <p className="text-white text-sm mt-2">
                                                <span className="font-bold">Motivo de Anulación:</span> {socio.motivoAnulacion}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {(isAdmin || permissions.includes('SOCIOS_EDITAR')) && (
                                    <button
                                        onClick={handleReactivateSocio}
                                        disabled={reactivating}
                                        className="btn bg-white text-error hover:bg-zinc-100 border-none btn-sm md:btn-md shrink-0 w-full md:w-auto font-black shadow-md"
                                    >
                                        {reactivating ? 'Reactivando...' : 'Reactivar Socio'}
                                    </button>
                                )}
                            </div>
                        )}
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
                                                <p className="font-semibold">{safeFormatDate(socio.fechaNacimiento)}</p>
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
                                                        <td>{safeFormatDate(item.fechaCambio)}</td>
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
                                                    <span className="opacity-70">{safeFormatDate(item.fechaCambio)}</span>
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
                                                Vence el: <span className="font-bold">{safeFormatDate(latestSub.fechaFin)}</span>
                                            </p>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                        <Plus className="mr-2" />
                                        Renovación
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
                                                    <th>Costo / Saldo</th>
                                                    <th>Estado</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {socio.suscripciones?.map((sub: any, index: number) => {
                                                    const historicalCodes = socio.historialCodigos || []
                                                    const displayCode = sub.codigo || (index === 0 ? socio.codigo : (historicalCodes[index - 1]?.codigo || socio.codigo))

                                                    const subPagos = socio.pagos?.filter((p: any) => p.suscripcionId === sub.id) || []
                                                    const totalPagado = subPagos.reduce((sum: number, p: any) => sum + p.monto, 0)
                                                    const precioPlan = sub.plan?.precio || 0
                                                    const saldoPendiente = precioPlan - totalPagado

                                                    return (
                                                        <tr key={sub.id}>
                                                            <td>{safeFormatDate(sub.fechaInicio)}</td>
                                                            <td>
                                        {sub.plan ? (
                                            <div>
                                                <div className="font-bold">{sub.plan.nombre}</div>
                                                <div className="text-xs opacity-70">{sub.meses} {sub.meses === 1 ? 'mes' : 'meses'}</div>
                                            </div>
                                        ) : (
                                            `${sub.meses} ${sub.meses === 1 ? 'mes' : 'meses'}`
                                        )}
                                    </td>
                                                            <td>{safeFormatDate(sub.fechaFin)}</td>
                                                            <td className="font-mono text-xs text-primary">{displayCode}</td>
                                                            <td>
                                                                <div>
                                                                    <div className="font-bold text-xs">Costo: S/. {precioPlan.toFixed(2)}</div>
                                                                    <div className="text-[10px] opacity-70">Abonado: S/. {totalPagado.toFixed(2)}</div>
                                                                    {saldoPendiente > 0 && (
                                                                        <div className="text-[10px] text-warning font-black animate-pulse mt-0.5">
                                                                            Debe: S/. {saldoPendiente.toFixed(2)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className={`badge ${sub.estado === 'ACTIVA' ? 'badge-success' : 'badge-ghost'}`}>
                                                                    {sub.estado}
                                                                </div>
                                                            </td>
                                                            <td className="flex items-center gap-1">
                                                                {saldoPendiente > 0 && (
                                                                    <button
                                                                        className="btn btn-warning btn-outline btn-xs font-bold text-xs"
                                                                        onClick={() => handleOpenAbono(sub, saldoPendiente)}
                                                                        title="Registrar Abono"
                                                                    >
                                                                        Abonar
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="btn btn-ghost btn-xs"
                                                                    onClick={() => setEditingSub(sub)}
                                                                    title="Editar fecha de inicio"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                {(isAdmin || permissions.includes('SUSCRIPCIONES_ELIMINAR')) && (
                                                                    <button
                                                                        className="btn btn-ghost btn-xs text-error"
                                                                        onClick={() => handleDeleteSub(sub.id)}
                                                                        disabled={deletingSubId === sub.id}
                                                                        title="Eliminar renovación"
                                                                    >
                                                                        {deletingSubId === sub.id ? (
                                                                            <span className="loading loading-spinner loading-xs"></span>
                                                                        ) : (
                                                                            <Trash2 size={14} />
                                                                        )}
                                                                    </button>
                                                                )}
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

                                            const subPagos = socio.pagos?.filter((p: any) => p.suscripcionId === sub.id) || []
                                            const totalPagado = subPagos.reduce((sum: number, p: any) => sum + p.monto, 0)
                                            const precioPlan = sub.plan?.precio || 0
                                            const saldoPendiente = precioPlan - totalPagado

                                            return (
                                                <div key={sub.id} className="bg-base-200 border border-base-300 rounded-lg p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className={`badge badge-sm ${sub.estado === 'ACTIVA' ? 'badge-success' : 'badge-ghost'}`}>
                                                            {sub.estado}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                className="btn btn-ghost btn-xs text-primary"
                                                                onClick={() => setEditingSub(sub)}
                                                            >
                                                                <Edit size={14} className="mr-1" /> Editar
                                                            </button>
                                                            {(isAdmin || permissions.includes('SUSCRIPCIONES_ELIMINAR')) && (
                                                                <button
                                                                    className="btn btn-ghost btn-xs text-error"
                                                                    onClick={() => handleDeleteSub(sub.id)}
                                                                    disabled={deletingSubId === sub.id}
                                                                >
                                                                    {deletingSubId === sub.id ? (
                                                                        <span className="loading loading-spinner loading-xs mr-1"></span>
                                                                    ) : (
                                                                        <Trash2 size={14} className="mr-1" />
                                                                    )}
                                                                    Eliminar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="opacity-50 block">Inicio</span>
                                                            <span className="font-semibold">{safeFormatDate(sub.fechaInicio)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-50 block">Vencimiento</span>
                                                            <span className="font-semibold">{safeFormatDate(sub.fechaFin)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-50 block">Duración</span>
                                                            <span className="font-semibold">{sub.meses} {sub.meses === 1 ? 'mes' : 'meses'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="opacity-50 block">Código</span>
                                                            <span className="font-mono text-primary font-bold">{displayCode}</span>
                                                        </div>
                                                        <div className="col-span-2 border-t pt-2 mt-2 flex justify-between items-center">
                                                            <div>
                                                                <span className="opacity-50 block">Costo / Abonado</span>
                                                                <span className="font-semibold">
                                                                    S/. {precioPlan.toFixed(2)} / S/. {totalPagado.toFixed(2)}
                                                                </span>
                                                                {saldoPendiente > 0 && (
                                                                    <span className="text-[10px] text-warning font-black block mt-0.5 animate-pulse">
                                                                        Debe: S/. {saldoPendiente.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {saldoPendiente > 0 && (
                                                                <button
                                                                    className="btn btn-warning btn-sm font-bold text-xs"
                                                                    onClick={() => handleOpenAbono(sub, saldoPendiente)}
                                                                >
                                                                    Abonar
                                                                </button>
                                                            )}
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

            {/* Photo Zoom Modal */}
            {viewingPhoto && (
                <div className="modal modal-open z-[9999]" onClick={() => setViewingPhoto(null)}>
                    <div className="modal-box p-0 bg-transparent shadow-none max-w-4xl w-auto overflow-visible relative" onClick={e => e.stopPropagation()}>
                        <button 
                            className="btn btn-circle btn-sm absolute -top-10 right-0 md:-right-10 bg-base-100 border-none shadow-lg"
                            onClick={() => setViewingPhoto(null)}
                        >
                            <XCircle size={24} />
                        </button>
                        <img 
                            src={viewingPhoto} 
                            alt="Foto ampliada" 
                            className="max-h-[85vh] w-auto mx-auto rounded-2xl shadow-2xl border-4 border-white/10 ring-1 ring-white/20"
                        />
                        <div className="text-center mt-4 text-white font-bold text-lg drop-shadow-lg">
                            {socio.nombres} {socio.apellidos}
                        </div>
                    </div>
                </div>
            )}

            {/* Anular Socio Modal */}
            {showAnnulModal && (
                <div className="modal modal-open z-[9999]">
                    <div className="modal-box relative border border-error/20 bg-base-100 shadow-2xl rounded-2xl max-w-md">
                        <h3 className="font-black text-xl text-error mb-2">Anular Registro de Socio</h3>
                        <p className="text-sm opacity-75 mb-6">
                            Esta acción anulará el registro del socio, desactivando su código QR y bloqueando su acceso al gimnasio.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Motivo de Anulación</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered h-24 w-full focus:textarea-error"
                                    placeholder="Ingrese el motivo de la anulación (por ejemplo: Retiro por viaje, problemas de salud, etc.)"
                                    value={annulReason}
                                    onChange={(e) => setAnnulReason(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="modal-action mt-6 gap-2">
                            <button 
                                className="btn btn-ghost" 
                                onClick={() => {
                                    setShowAnnulModal(false);
                                    setAnnulReason('');
                                }}
                                disabled={annulling}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-error font-bold" 
                                onClick={handleAnnulSocio}
                                disabled={annulling || !annulReason.trim()}
                            >
                                {annulling ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs mr-1"></span>
                                        Anulando...
                                    </>
                                ) : (
                                    'Confirmar Anulación'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Registrar Abono Modal */}
            {showAbonoModal && abonoSub && (
                <div className="modal modal-open z-[9999]">
                    <form onSubmit={handleSaveAbono} className="modal-box relative border border-warning/20 bg-base-100 shadow-2xl rounded-2xl max-w-md">
                        <h3 className="font-black text-xl text-warning flex items-center gap-2 mb-2">
                            <CreditCard className="w-6 h-6" />
                            Registrar Abono / Pago
                        </h3>
                        <p className="text-sm opacity-75 mb-6">
                            Permite abonar a la membresía pendiente. Esto registrará un ingreso en la caja.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Monto del Abono (S/.)</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input input-bordered w-full focus:input-warning"
                                    placeholder="0.00"
                                    value={abonoMonto}
                                    onChange={(e) => setAbonoMonto(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Método de Pago</span>
                                </label>
                                <select
                                    className="select select-bordered w-full focus:select-warning"
                                    value={abonoMetodo}
                                    onChange={(e) => setAbonoMetodo(e.target.value as any)}
                                    required
                                >
                                    <option value="EFECTIVO">💵 Efectivo</option>
                                    <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                                    <option value="YAPE">📱 Yape</option>
                                    <option value="PLIN">📱 Plin</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Descripción</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full focus:input-warning"
                                    placeholder="Descripción del pago"
                                    value={abonoDescripcion}
                                    onChange={(e) => setAbonoDescripcion(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="modal-action mt-6 gap-2">
                            <button 
                                type="button"
                                className="btn btn-ghost" 
                                onClick={() => {
                                    setShowAbonoModal(false);
                                    setAbonoSub(null);
                                }}
                                disabled={savingAbono}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="btn btn-warning text-white font-bold" 
                                disabled={savingAbono || !abonoMonto || parseFloat(abonoMonto) <= 0}
                            >
                                {savingAbono ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs mr-1"></span>
                                        Registrando...
                                    </>
                                ) : (
                                    'Registrar Pago'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div >
    )
}
