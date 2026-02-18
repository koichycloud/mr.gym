'use client'

import { useState, useEffect } from 'react'

interface BodyVisualizerProps {
    data: any
    sexo: string
    readOnly?: boolean // Kept for compatibility but unused as component is now read-only by default
}

// MASTER TEMPLATE CONFIGURATIONS (External Constants)
const MALE_CONFIG: any = {
    // --- SILHOUETTE TRANSFORM ---
    silhouette: { scaleX: 1.16, scaleY: 1.15, x: 4, y: 24 },
    // --- MARKERS ---
    cuello: { dot: { x: 51.22338735303463, y: 21.833333333333332 }, label: { x: 17.522356893186256, y: 11.166666666666666 }, color: "#94a3b8", width: 2 },
    hombros: { dot: { x: 38.730763992918426, y: 26.166666666666664 }, label: { x: 14.907621771301466, y: 24 }, color: "#94a3b8", width: 2 },
    pecho: { dot: { x: 51.80443960234237, y: 30 }, label: { x: 87.24862681011393, y: 15.333333333333332 }, color: "#94a3b8", width: 2 },
    biceps: { dot: { x: 68.65495483226655, y: 33.83333333333333 }, label: { x: 85.50547006219075, y: 27.833333333333332 }, color: "#94a3b8", width: 2 },
    antebrazos: { dot: { x: 32.04866312587952, y: 42.5 }, label: { x: 14.907621771301466, y: 35.66666666666667 }, color: "#94a3b8", width: 2 },
    cintura: { dot: { x: 51.22338735303463, y: 39 }, label: { x: 88.41073130872941, y: 40.833333333333336 }, color: "#94a3b8", width: 2 },
    vientreBajo: { dot: { x: 51.22338735303463, y: 43 }, label: { x: 13.164465023378275, y: 54.166666666666664 }, color: "#94a3b8", width: 2 },
    gluteos: { dot: { x: 40.18339461618775, y: 49 }, label: { x: 14.326569521993735, y: 65.83333333333333 }, color: "#94a3b8", width: 2 },
    cuadriceps: { dot: { x: 59.939171092650604, y: 54.50000000000001 }, label: { x: 88.70125743338326, y: 66.33333333333333 }, color: "#94a3b8", width: 2 },
    pantorrillas: { dot: { x: 60.22969721730447, y: 76.83333333333333 }, label: { x: 84.92441781288301, y: 84.33333333333334 }, color: "#94a3b8", width: 2 }
}

const FEMALE_CONFIG: any = {
    // --- SILHOUETTE TRANSFORM (Same as Male) ---
    silhouette: { scaleX: 1.16, scaleY: 1.15, x: 4, y: 24 },
    // --- MARKERS (Same positions, pink color) ---
    cuello: { dot: { x: 51.22338735303463, y: 21.833333333333332 }, label: { x: 17.522356893186256, y: 11.166666666666666 }, color: "#ec4899", width: 2 },
    hombros: { dot: { x: 38.730763992918426, y: 26.166666666666664 }, label: { x: 14.907621771301466, y: 24 }, color: "#ec4899", width: 2 },
    pecho: { dot: { x: 51.80443960234237, y: 30 }, label: { x: 87.24862681011393, y: 15.333333333333332 }, color: "#ec4899", width: 2 },
    biceps: { dot: { x: 68.65495483226655, y: 33.83333333333333 }, label: { x: 85.50547006219075, y: 27.833333333333332 }, color: "#ec4899", width: 2 },
    antebrazos: { dot: { x: 32.04866312587952, y: 42.5 }, label: { x: 14.907621771301466, y: 35.66666666666667 }, color: "#ec4899", width: 2 },
    cintura: { dot: { x: 51.22338735303463, y: 39 }, label: { x: 88.41073130872941, y: 40.833333333333336 }, color: "#ec4899", width: 2 },
    vientreBajo: { dot: { x: 51.22338735303463, y: 43 }, label: { x: 13.164465023378275, y: 54.166666666666664 }, color: "#ec4899", width: 2 },
    gluteos: { dot: { x: 40.18339461618775, y: 49 }, label: { x: 14.326569521993735, y: 65.83333333333333 }, color: "#ec4899", width: 2 },
    cuadriceps: { dot: { x: 59.939171092650604, y: 54.50000000000001 }, label: { x: 88.70125743338326, y: 66.33333333333333 }, color: "#ec4899", width: 2 },
    pantorrillas: { dot: { x: 60.22969721730447, y: 76.83333333333333 }, label: { x: 84.92441781288301, y: 84.33333333333334 }, color: "#ec4899", width: 2 }
}

export default function BodyVisualizer({ data, sexo }: BodyVisualizerProps) {
    const [hoveredPart, setHoveredPart] = useState<string | null>(null)
    const isFemale = sexo === 'F'

    // Static positions configuration
    const [positions, setPositions] = useState<any>(() => isFemale ? { ...FEMALE_CONFIG } : { ...MALE_CONFIG })

    // Force re-initialization when gender changes
    useEffect(() => {
        const correctConfig = sexo === 'F' ? { ...FEMALE_CONFIG } : { ...MALE_CONFIG }
        setPositions(correctConfig)
    }, [sexo])

    const imageSrc = isFemale ? '/siluetas/cuerpo_humano_mujer.jpg' : '/siluetas/cuerpo_humano_hombre.jpg'
    const primaryColor = isFemale ? '#ec4899' : '#3b82f6'

    // Fallback for potentially missing silhouette config in migration
    const silCfg = positions.silhouette || { scaleX: 1, scaleY: 1, x: 0, y: 0 }

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm relative overflow-hidden min-h-[600px]">

            {/* CANVAS AREA */}
            <div className="relative w-full max-w-[1100px] h-[600px] select-none">
                <img
                    src={imageSrc}
                    crossOrigin="anonymous"
                    alt="Silueta"
                    className="absolute w-full h-full object-contain opacity-90 mix-blend-multiply pointer-events-none z-0 transition-transform duration-200"
                    style={{
                        transform: `translate(${silCfg.x}px, ${silCfg.y}px) scale(${silCfg.scaleX}, ${silCfg.scaleY})`
                    }}
                />

                {/* SVG LAYER FOR LINES */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {Object.entries(positions).map(([key, config]: any) => {
                        if (key === 'silhouette') return null
                        return (
                            <line
                                key={key}
                                x1={`${config.dot.x}%`} y1={`${config.dot.y}%`}
                                x2={`${config.label.x}%`} y2={`${config.label.y}%`}
                                stroke={config.color || '#94a3b8'}
                                strokeWidth={config.width || 2}
                                strokeLinecap="round"
                            />
                        )
                    })}
                </svg>

                {/* VISUAL ELEMENTS LAYER */}
                {Object.entries(data || {}).map(([key, value]) => {
                    if (!positions[key] || key === 'silhouette') return null
                    const config = positions[key]
                    const isHovered = hoveredPart === key

                    return (
                        <div key={key} className="absolute inset-0 pointer-events-none z-20">

                            {/* 1. DOT */}
                            <div
                                className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-sm pointer-events-auto transition-transform hover:scale-125 z-20"
                                style={{
                                    left: `${config.dot.x}%`, top: `${config.dot.y}%`,
                                    backgroundColor: (isHovered) ? '#fbbf24' : primaryColor
                                }}
                                onMouseEnter={() => setHoveredPart(key)}
                                onMouseLeave={() => setHoveredPart(null)}
                            />

                            {/* 2. LABEL */}
                            <div
                                className="absolute pointer-events-auto flex flex-col items-center bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border shadow-sm transition-all border-slate-200"
                                style={{
                                    left: `${config.label.x}%`, top: `${config.label.y}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatLabel(key)}</span>
                                <span className="text-sm font-mono font-bold text-slate-800">{value as string} cm</span>
                            </div>

                        </div>
                    )
                })}

            </div>

            {/* STATS PANEL (Fixed position) */}
            <div className="w-full max-w-[425px] mt-4 px-0 ml-auto mr-8 z-30 relative">
                <div className="bg-indigo-100 p-4 rounded-xl border border-indigo-200 shadow-sm">
                    <h4 className="font-bold mb-3 text-sm flex items-center gap-2 text-slate-700">
                        <div className={`w-3 h-3 rounded-full ${isFemale ? 'bg-pink-500' : 'bg-blue-500'}`}></div>
                        Composición Corporal
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <StatBox label="Peso" value={data?.peso} unit="kg" color="text-slate-800" />
                        <StatBox label="% Grasa" value={data?.porcentajeGrasa} unit="%" color="text-orange-500" />
                        <StatBox label="% Músculo" value={data?.porcentajeMusculo} unit="%" color="text-emerald-500" />
                    </div>
                </div>
            </div>

        </div>
    )
}

function StatBox({ label, value, unit, color }: any) {
    if (!value) return null
    return (
        <div className="flex flex-col bg-white/80 p-2 rounded shadow-sm border border-slate-100">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
            <span className={`font-bold text-base ${color}`}>{value} <span className="text-[10px]">{unit}</span></span>
        </div>
    )
}

function formatLabel(key: string) {
    const labels: any = {
        cuello: 'Cuello', hombros: 'Hombros', pecho: 'Pecho', biceps: 'Bíceps', antebrazos: 'Antebrazo',
        cintura: 'Cintura', vientreBajo: 'Vientre', gluteos: 'Cadera', cuadriceps: 'Cuádriceps', pantorrillas: 'Pantorrilla'
    }
    return labels[key] || key
}

export function BodyVisualizerPdf({ data, sexo }: BodyVisualizerProps) {
    const isFemale = sexo === 'F'
    const positions = isFemale ? FEMALE_CONFIG : MALE_CONFIG

    // Explicit HEX colors
    const primaryColor = isFemale ? '#ec4899' : '#3b82f6'
    const silCfg = positions.silhouette || { scaleX: 1, scaleY: 1, x: 0, y: 0 }

    // Inline Styles Constants
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        width: '100%',
        fontFamily: 'Arial, sans-serif'
    }

    const canvasStyle: React.CSSProperties = {
        position: 'relative',
        width: '500px',
        maxWidth: '100%',
        height: '600px',
        margin: '0 auto',
        userSelect: 'none'
    }

    const statPanelStyle: React.CSSProperties = {
        width: '500px',
        maxWidth: '100%',
        margin: '0 auto 0 auto',
        position: 'relative',
        zIndex: 30
    }

    const statBoxContainerStyle: React.CSSProperties = {
        backgroundColor: '#e0e7ff', // indigo-100
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid #c7d2fe', // indigo-200
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }

    return (
        <div style={containerStyle}>
            {/* CANVAS AREA */}
            <div style={canvasStyle}>
                <img
                    src={isFemale ? '/siluetas/cuerpo_humano_mujer.jpg' : '/siluetas/cuerpo_humano_hombre.jpg'}
                    crossOrigin="anonymous"
                    alt="Silueta"
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        opacity: 0.9,
                        mixBlendMode: 'multiply',
                        pointerEvents: 'none',
                        zIndex: 0,
                        transform: `translate(${silCfg.x}px, ${silCfg.y}px) scale(${silCfg.scaleX}, ${silCfg.scaleY})`
                    }}
                />

                {/* SVG LAYER */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                    {Object.entries(positions).map(([key, config]: any) => {
                        if (key === 'silhouette') return null
                        return (
                            <line
                                key={key}
                                x1={`${config.dot.x}%`} y1={`${config.dot.y}%`}
                                x2={`${config.label.x}%`} y2={`${config.label.y}%`}
                                stroke={config.color || '#94a3b8'}
                                strokeWidth={config.width || 2}
                                strokeLinecap="round"
                            />
                        )
                    })}
                </svg>

                {/* VISUAL ELEMENTS */}
                {Object.entries(data || {}).map(([key, value]) => {
                    if (!positions[key] || key === 'silhouette') return null
                    const config = positions[key]

                    return (
                        <div key={key} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
                            {/* DOT */}
                            <div
                                style={{
                                    position: 'absolute',
                                    width: '16px',
                                    height: '16px',
                                    marginLeft: '-8px',
                                    marginTop: '-8px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    zIndex: 20,
                                    left: `${config.dot.x}%`,
                                    top: `${config.dot.y}%`,
                                    backgroundColor: primaryColor
                                }}
                            />

                            {/* LABEL */}
                            <div
                                style={{
                                    position: 'absolute',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0', // slate-200
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    left: `${config.label.x}%`,
                                    top: `${config.label.y}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{formatLabel(key)}</span>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>{value as string} cm</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* STATS PANEL */}
            <div style={statPanelStyle}>
                <div style={statBoxContainerStyle}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isFemale ? '#ec4899' : '#3b82f6' }}></div>
                        Composición Corporal
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                        {/* Manual Inline StatBoxes */}
                        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.8)', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Peso</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b' }}>{data?.peso} <span style={{ fontSize: '10px' }}>kg</span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.8)', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>% Grasa</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#f97316' }}>{data?.porcentajeGrasa} <span style={{ fontSize: '10px' }}>%</span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255,255,255,0.8)', padding: '8px', borderRadius: '4px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>% Músculo</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#10b981' }}>{data?.porcentajeMusculo} <span style={{ fontSize: '10px' }}>%</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
