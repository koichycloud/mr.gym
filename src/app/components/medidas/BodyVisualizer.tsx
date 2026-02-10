'use client'

import { useState, useRef, useEffect } from 'react'
import { Info, Settings, Move, GripHorizontal, Scaling, Image as ImageIcon } from 'lucide-react'

interface BodyVisualizerProps {
    data: any
    sexo: string
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

    // --- GRAPHIC EDITOR LOGIC ---
    const [isDesignerMode, setIsDesignerMode] = useState(false)
    const [draggingType, setDraggingType] = useState<'dot' | 'label' | 'panel' | 'silhouette' | null>(null)
    const [draggingId, setDraggingId] = useState<string | null>(null) // 'panel' or key pair id
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [panelPosition, setPanelPosition] = useState({ x: 20, y: 60 }) // Default panel position inside container
    const [activeTab, setActiveTab] = useState<'markers' | 'silhouette'>('markers') // 'markers' or 'silhouette'

    // Initialize with the correct config based on gender
    const [positions, setPositions] = useState<any>(() => isFemale ? { ...FEMALE_CONFIG } : { ...MALE_CONFIG })

    // Force re-initialization when gender changes - use deep copy to avoid mutation
    useEffect(() => {
        const correctConfig = sexo === 'F' ? { ...FEMALE_CONFIG } : { ...MALE_CONFIG }
        setPositions(correctConfig)
    }, [sexo])

    const containerRef = useRef<HTMLDivElement>(null)
    const dragStartPos = useRef({ x: 0, y: 0 })

    const handleDragStart = (e: React.MouseEvent, id: string, type: 'dot' | 'label' | 'panel' | 'silhouette') => {
        if (!isDesignerMode) return
        e.preventDefault()
        e.stopPropagation()
        setDraggingId(id)
        setDraggingType(type)

        if (type === 'panel') {
            dragStartPos.current = { x: e.clientX, y: e.clientY }
        } else if (type === 'silhouette') {
            // Silhouette dragging could be implemented here, but we'll use sliders for precision
        } else {
            setSelectedId(id)
            setActiveTab('markers') // Switch tab if clicking a marker
        }
    }

    const handleDragMove = (e: React.MouseEvent) => {
        if (!isDesignerMode || !draggingId || !draggingType) return

        if (draggingType === 'panel') {
            const dx = e.clientX - dragStartPos.current.x
            const dy = e.clientY - dragStartPos.current.y
            setPanelPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
            dragStartPos.current = { x: e.clientX, y: e.clientY }
            return
        }

        if (!containerRef.current) return

        const container = containerRef.current.getBoundingClientRect()
        const xRaw = e.clientX - container.left
        const yRaw = e.clientY - container.top

        const x = Math.max(0, Math.min(100, (xRaw / container.width) * 100))
        const y = Math.max(0, Math.min(100, (yRaw / container.height) * 100))

        setPositions((prev: any) => ({
            ...prev,
            [draggingId]: {
                ...prev[draggingId],
                [draggingType]: { x, y }
            }
        }))
    }

    const handleDragEnd = () => {
        setDraggingId(null)
        setDraggingType(null)
    }

    const updateLineStyle = (id: string, key: string, value: any) => {
        setPositions((prev: any) => ({
            ...prev,
            [id]: { ...prev[id], [key]: value }
        }))
    }

    const updateSilhouette = (key: string, value: number) => {
        setPositions((prev: any) => ({
            ...prev,
            silhouette: { ...prev.silhouette, [key]: value }
        }))
    }


    const copyConfig = () => {
        const config = JSON.stringify(positions, null, 2)
        navigator.clipboard.writeText(config)
        alert(`Configuración ${isFemale ? 'FEMENINA' : 'MASCULINA'} copiada.`)
    }

    const imageSrc = isFemale ? '/siluetas/cuerpo_humano_mujer.jpg' : '/siluetas/cuerpo_humano_hombre.jpg'
    const primaryColor = isFemale ? '#ec4899' : 
    '#3b82f6'

    // Fallback for potentially missing silhouette config in migration
    const silCfg = positions.silhouette || { scaleX: 1, scaleY: 1, x: 0, y: 0 }

    return (
        <div
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm relative overflow-hidden min-h-[600px]"
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
        >

            {/* CONTROLS */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => setIsDesignerMode(!isDesignerMode)}
                        className={`btn btn-sm ${isDesignerMode ? 'btn-warning' : 'btn-secondary shadow-lg'}`}
                    >
                        <Settings size={16} className="mr-1" /> {isDesignerMode ? 'Terminar Edición' : 'Editor Gráfico'}
                    </button>
                    {isDesignerMode && (
                        <button onClick={copyConfig} className="btn btn-sm btn-primary shadow-lg">Copiar JSON ({isFemale ? 'M' : 'H'})</button>
                    )}
                </div>
            </div>

            {/* DRAGGABLE PROPERTIES PANEL */}
            {isDesignerMode && (
                <div
                    className="fixed bg-white/95 backdrop-blur p-0 rounded-lg shadow-2xl border border-slate-200 text-xs w-[240px] pointer-events-auto animate-in fade-in zoom-in-95 z-[100]"
                    style={{
                        left: panelPosition.x,
                        top: panelPosition.y,
                        cursor: draggingType === 'panel' ? 'grabbing' : 'auto'
                    }}
                >
                    {/* Drag Handle */}
                    <div
                        className="bg-slate-100 p-2 rounded-t-lg border-b border-slate-200 flex justify-between items-center cursor-move"
                        onMouseDown={(e) => handleDragStart(e, 'panel-settings', 'panel')}
                    >
                        <span className="font-bold text-slate-700 uppercase flex items-center gap-1">
                            <Settings size={12} /> PROPIEDADES
                        </span>
                        <GripHorizontal size={14} className="text-slate-400" />
                    </div>

                    {/* TABS ROW */}
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('markers')}
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === 'markers' ? 'bg-white text-indigo-600 border-b-2 border-indigo-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            PUNTOS
                        </button>
                        <button
                            onClick={() => setActiveTab('silhouette')}
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === 'silhouette' ? 'bg-white text-indigo-600 border-b-2 border-indigo-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                            SILUETA
                        </button>
                    </div>

                    <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">

                        {activeTab === 'markers' ? (
                            selectedId ? (
                                <>
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        <span className="font-bold uppercase text-slate-500">{selectedId}</span>
                                        <span className="text-[10px] text-slate-400">Marcador</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="flex justify-between font-medium text-slate-600">
                                            <span>Grosor Línea</span>
                                            <span>{positions[selectedId]?.width}px</span>
                                        </label>
                                        <input
                                            type="range" min="1" max="10" step="0.5"
                                            value={positions[selectedId]?.width || 2}
                                            onChange={(e) => updateLineStyle(selectedId, 'width', parseFloat(e.target.value))}
                                            className="range range-xs range-primary"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-slate-600">Color</span>
                                        <div className="flex gap-1">
                                            {['#94a3b8', '#000000', '#ef4444', '#3b82f6', '#ec4899'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => updateLineStyle(selectedId, 'color', c)}
                                                    className={`w-5 h-5 rounded-full border border-slate-300 ${positions[selectedId]?.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-slate-400 py-4 italic">Selecciona un marcador en el cuerpo</p>
                            )
                        ) : (
                            // SILHOUETTE CONTROLS
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="flex justify-between font-medium text-slate-600">
                                        <span>Ancho (Scale X)</span>
                                        <span>{silCfg.scaleX}x</span>
                                    </label>
                                    <input type="range" min="0.5" max="1.5" step="0.01" value={silCfg.scaleX} onChange={(e) => updateSilhouette('scaleX', parseFloat(e.target.value))} className="range range-xs range-secondary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex justify-between font-medium text-slate-600">
                                        <span>Alto (Scale Y)</span>
                                        <span>{silCfg.scaleY}x</span>
                                    </label>
                                    <input type="range" min="0.5" max="1.5" step="0.01" value={silCfg.scaleY} onChange={(e) => updateSilhouette('scaleY', parseFloat(e.target.value))} className="range range-xs range-secondary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex justify-between font-medium text-slate-600">
                                        <span>Posición X</span>
                                        <span>{silCfg.x}px</span>
                                    </label>
                                    <input type="range" min="-200" max="200" step="1" value={silCfg.x} onChange={(e) => updateSilhouette('x', parseFloat(e.target.value))} className="range range-xs range-accent" />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex justify-between font-medium text-slate-600">
                                        <span>Posición Y</span>
                                        <span>{silCfg.y}px</span>
                                    </label>
                                    <input type="range" min="-200" max="200" step="1" value={silCfg.y} onChange={(e) => updateSilhouette('y', parseFloat(e.target.value))} className="range range-xs range-accent" />
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* CANVAS AREA */}
            <div
                ref={containerRef}
                className={`relative w-full max-w-[1100px] h-[600px] select-none ${isDesignerMode ? 'cursor-crosshair border-2 border-dashed border-yellow-400 bg-yellow-50/10' : ''}`}
            >
                <img
                    src={imageSrc}
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

                {/* INTERACTIVE ELEMENTS LAYER */}
                {Object.entries(data || {}).map(([key, value]) => {
                    if (!positions[key] || key === 'silhouette') return null
                    const config = positions[key]
                    const isSelected = selectedId === key
                    const isHovered = hoveredPart === key

                    return (
                        <div key={key} className="absolute inset-0 pointer-events-none z-20">

                            {/* 1. DOT (Draggable) */}
                            <div
                                className={`absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-sm cursor-move pointer-events-auto transition-transform hover:scale-125 ${isDesignerMode ? 'z-50' : 'z-20'}`}
                                style={{
                                    left: `${config.dot.x}%`, top: `${config.dot.y}%`,
                                    backgroundColor: (isSelected || isHovered) ? '#fbbf24' : primaryColor
                                }}
                                onMouseDown={(e) => handleDragStart(e, key, 'dot')}
                                onMouseEnter={() => !isDesignerMode && setHoveredPart(key)}
                                onMouseLeave={() => !isDesignerMode && setHoveredPart(null)}
                            />

                            {/* 2. LABEL (Draggable) */}
                            <div
                                className={`absolute pointer-events-auto cursor-move flex flex-col items-center bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border shadow-sm transition-all
                                    ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-slate-200'}
                                    ${isDesignerMode ? 'hover:border-blue-400' : ''}
                                `}
                                style={{
                                    left: `${config.label.x}%`, top: `${config.label.y}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                                onMouseDown={(e) => handleDragStart(e, key, 'label')}
                            >
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatLabel(key)}</span>
                                <span className="text-sm font-mono font-bold text-slate-800">{value as string} cm</span>
                            </div>

                        </div>
                    )
                })}

            </div>

            {/* STATS PANEL (Fixed position, not draggable) */}
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
