'use client'

import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, ArrowLeft, Check, AlertCircle, Save, Settings } from 'lucide-react'
import Link from 'next/link'
import { importSocios } from '@/app/actions/import'

const FIELDS = [
    { key: 'codigo', label: 'Código (Sugerido AUTO)' },
    { key: 'nombres', label: 'Nombres (Opcional)' },
    { key: 'apellidos', label: 'Apellidos (Opcional)' },
    { key: 'numeroDocumento', label: 'Número Documento (DNI/CE)' },
    { key: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'meses', label: 'Meses Suscripción' },
    { key: 'fechaInicio', label: 'Fecha Inicio Pago' },
]

export default function ImportarSocios() {
    const router = useRouter()
    const [data, setData] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload')

    const [loading, setLoading] = useState(false)
    const [fileName, setFileName] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [debugLogs, setDebugLogs] = useState<string[]>([])

    const addLog = (msg: string) => {
        setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
        console.log(msg)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) {
            addLog('❌ Evento disparado pero no hay archivo (e.target.files[0] es null)')
            alert('No se detectó ningún archivo seleccionado.')
            return
        }

        setFileName(file.name)
        setError(null)
        addLog(`📂 Archivo seleccionado: ${file.name}`)
        addLog(`📏 Tamaño: ${file.size} bytes`)
        addLog(`❓ Tipo MIME: ${file.type || 'Desconocido'}`)

        const reader = new FileReader()

        reader.onloadstart = () => addLog('⏳ Iniciando lectura del archivo...')

        reader.onerror = () => {
            addLog('❌ Error CRÍTICO en FileReader.onerror')
            addLog(`❌ Error details: ${reader.error?.message}`)
            alert('Error al leer el archivo. Puede estar bloqueado o corrupto.')
            setError('Error de lectura del navegador.')
        }

        reader.onload = (evt) => {
            try {
                addLog('✅ Lectura binaria completada. Procesando Excel...')
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })

                addLog(`📚 Libro leído. Hojas encontradas: ${wb.SheetNames.join(', ')}`)

                if (!wb.SheetNames.length) {
                    addLog('❌ El archivo Excel no tiene hojas visibles.')
                    alert('El Excel no tiene hojas.')
                    return
                }

                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const jsonData = XLSX.utils.sheet_to_json(ws)

                addLog(`📊 Filas convertidas a JSON: ${jsonData.length}`)

                if (jsonData.length > 0) {
                    const firstRow = jsonData[0] as any
                    const excelCols = Object.keys(firstRow)
                    addLog(`📝 Columnas detectadas: ${excelCols.join(', ')}`)

                    setColumns(excelCols)
                    setData(jsonData)

                    // Auto mapping attempt
                    const autoMap: Record<string, string> = {}
                    FIELDS.forEach(f => {
                        const match = excelCols.find(c =>
                            c.toLowerCase().includes(f.key.toLowerCase()) ||
                            c.toLowerCase().includes(f.label.toLowerCase())
                        )
                        if (match) autoMap[f.key] = match
                    })
                    setMapping(autoMap)
                    addLog('✅ Mapeo automático realizado. Pasando al paso 2.')
                    setStep('map')
                } else {
                    addLog('⚠️ El array de datos está vacío (0 filas).')
                    setError('El archivo está vacío')
                    alert('El archivo parece estar vacío.')
                }
            } catch (err) {
                console.error(err)
                const errMsg = (err as any).message
                addLog(`❌ Excepción al procesar Excel: ${errMsg}`)
                setError(`Error al procesar el archivo: ${errMsg}`)
                alert('Error al procesar: ' + errMsg)
            }
        }
        reader.readAsBinaryString(file)
    }

    const [importResult, setImportResult] = useState<{
        count: number;
        skippedCount: number;
        skippedRecords: any[];
        reportBase64?: string;
    } | null>(null)

    const downloadSkippedReport = useCallback(async () => {
        if (!importResult?.reportBase64) return

        try {
            // Convert Base64 to Blob
            const binaryString = window.atob(importResult.reportBase64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

            // Try Modern "Save As" Picker
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: `reporte_omitidos_${Date.now()}.xlsx`,
                        types: [{
                            description: 'Excel File',
                            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return; // Success
                } catch (err: any) {
                    if (err.name === 'AbortError') return;
                    console.warn('File Picker fallback:', err);
                }
            }

            // Fallback
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `reporte_omitidos_${Date.now()}.xlsx`
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            }, 100)
        } catch (err) {
            console.error('Download error:', err)
            alert('Error al descargar: ' + (err as any).message)
        }
    }, [importResult])

    // Auto-download effect
    useEffect(() => {
        if (step === 'result' && importResult?.reportBase64) {
            const timer = setTimeout(() => {
                downloadSkippedReport()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [step, importResult, downloadSkippedReport])

    const handleConfirmImport = async () => {
        setLoading(true)
        setError(null)

        try {
            // Ensure data is a plain object for Server Action
            const sanitizedData = JSON.parse(JSON.stringify(data))
            const res = await importSocios(sanitizedData, mapping)

            if (res.success) {
                const importedCount = (res.count as number) || 0
                const skippedCount = (res.skippedCount as number) || 0
                const skippedRecs = res.skippedRecords || [] // Fix type check

                if (skippedCount > 0) {
                    // Show result screen instead of redirecting
                    setImportResult({
                        count: importedCount,
                        skippedCount: skippedCount,
                        skippedRecords: skippedRecs,
                        reportBase64: res.skippedReportBase64
                    })
                    // Auto-download is handled by useEffect now
                    setStep('result')
                } else {
                    alert(`¡Éxito! Se importaron ${importedCount} socios correctamente.`)
                    router.push('/socios')
                    router.refresh()
                }
            } else {
                alert('Error devuelto por servidor: ' + res.error)
                setError(res.error || 'Error al importar')
                setLoading(false)
            }
        } catch (err) {
            console.error(err)
            const msg = (err as any).message || 'Desconocido'
            setError('Error de conexión con el servidor: ' + msg)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-base-200 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => step === 'upload' ? router.push('/socios') : setStep(step === 'preview' ? 'map' : 'upload')} className="btn btn-ghost btn-circle">
                        <ArrowLeft />
                    </button>
                    <h1 className="text-3xl font-bold">Importación Flexible</h1>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Step Tracker */}
                    <ul className="steps w-full mb-8">
                        <li className={`step ${step === 'upload' || step === 'map' || step === 'preview' || step === 'result' ? 'step-primary' : ''}`}>Cargar archivo</li>
                        <li className={`step ${step === 'map' || step === 'preview' || step === 'result' ? 'step-primary' : ''}`}>Mapear Columnas</li>
                        <li className={`step ${step === 'preview' || step === 'result' ? 'step-primary' : ''}`}>Confirmar</li>
                        <li className={`step ${step === 'result' ? 'step-primary' : ''}`}>Resultados</li>
                    </ul>

                    {step === 'upload' && (
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body items-center text-center py-12">
                                <FileSpreadsheet size={64} className="text-primary mb-4" />
                                <h2 className="card-title text-2xl">Paso 1: Sube tu Excel</h2>
                                <p className="opacity-60 mb-6">No importa el formato o nombre de las columnas.</p>

                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                    onClick={(e) => (e.target as any).value = null}
                                    className="file-input file-input-bordered file-input-primary w-full max-w-xs"
                                />

                                {error && (
                                    <div className="alert alert-error mt-4 max-w-md">
                                        <AlertCircle size={20} />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'map' && (
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title text-2xl mb-6 flex items-center gap-2">
                                    <Settings className="text-primary" />
                                    Paso 2: Mapea los campos
                                </h2>
                                <p className="mb-8 opacity-70">Selecciona qué columna de tu archivo corresponde a cada dato en Mr. GYM.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {FIELDS.map(f => (
                                        <div key={f.key} className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text font-bold">{f.label}</span>
                                            </label>
                                            <select
                                                className="select select-bordered"
                                                value={mapping[f.key] || ''}
                                                onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                                            >
                                                <option value="">-- No importar / No disponible --</option>
                                                {columns.map(col => (
                                                    <option key={col} value={col}>{col}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="card-actions justify-end mt-12">
                                    <button
                                        className="btn btn-primary btn-lg px-12"
                                        onClick={() => setStep('preview')}
                                    >
                                        Continuar a Vista Previa
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="alert alert-info shadow-lg">
                                <Check size={24} />
                                <div>
                                    <h3 className="font-bold">Todo listo para procesar {data.length} filas</h3>
                                    <div className="text-xs">Los campos faltantes se llenarán con valores por defecto.</div>
                                </div>
                            </div>

                            <div className="card bg-base-100 shadow-xl overflow-hidden">
                                <div className="card-body p-0">
                                    <div className="p-4 bg-base-300 flex justify-between items-center">
                                        <span className="font-bold">Vista Previa con Mapeo Aplicado</span>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleConfirmImport}
                                            disabled={loading}
                                        >
                                            {loading ? <span className="loading loading-spinner"></span> : <Save size={20} className="mr-2" />}
                                            Confirmar Importación
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto max-h-[400px]">
                                        <table className="table table-xs table-pin-rows">
                                            <thead>
                                                <tr>
                                                    {FIELDS.map(f => (
                                                        <th key={f.key}>{f.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.slice(0, 50).map((row, i) => (
                                                    <tr key={i} className="hover">
                                                        {FIELDS.map(f => (
                                                            <td key={f.key}>{row[mapping[f.key]] || '-'}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {data.length > 50 && (
                                            <div className="p-4 text-center opacity-50">Mostrando primeras 50 filas...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'result' && importResult && (
                        <div className="card bg-base-100 shadow-xl text-center py-16">
                            <div className="card-body items-center max-w-2xl mx-auto">
                                <FileSpreadsheet size={80} className="text-warning mb-6" />
                                <h2 className="text-3xl font-bold mb-2">Importación Completada Parcialmente</h2>
                                <p className="text-lg opacity-80 mb-8">
                                    Se importaron <span className="font-bold text-success">{importResult.count}</span> socios correctamente.<br />
                                    Hubo <span className="font-bold text-error">{importResult.skippedCount}</span> registros omitidos por duplicidad.
                                </p>

                                <div className="flex flex-col gap-4 w-full max-w-md">
                                    <button
                                        onClick={downloadSkippedReport}
                                        className="btn btn-warning btn-lg w-full flex items-center gap-3"
                                    >
                                        <Save size={24} />
                                        Descargar Reporte de Omitidos
                                    </button>
                                    <p className="text-xs opacity-50">Si la descarga automática falló, pulsa aquí para descargar el Excel.</p>

                                    <div className="divider"></div>

                                    <Link href="/socios" className="btn btn-outline w-full">
                                        Volver a la Lista de Socios
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
