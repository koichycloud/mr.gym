"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPersonalByCodigo } from "@/app/actions/personal";
import { markAsistencia, getTodayAsistencia, getResumenHoras } from "@/app/actions/asistencia-personal";
import { registrarConsumo, solicitarAdelanto } from "@/app/actions/nomina-personal";
import { Loader2, Clock, Coffee, LogIn, LogOut, PackageSearch, Banknote, CheckCircle2, AlertCircle, X, QrCode } from "lucide-react";
import { toast } from "sonner";

export default function KioscoPersonalClient({ initialProductos }: { initialProductos: any[] }) {
  return (
    <Suspense fallback={<div className="animate-pulse text-white">Cargando...</div>}>
      <KioscoPersonalContent initialProductos={initialProductos} />
    </Suspense>
  );
}

function KioscoPersonalContent({ initialProductos }: { initialProductos: any[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const autoCode = searchParams.get("code");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [personal, setPersonal] = useState<any>(null);
  const [asistencia, setAsistencia] = useState<any>(null);
  const [resumenHoras, setResumenHoras] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15);
  
  // UI States
  const [showConsumos, setShowConsumos] = useState(false);
  const [showAdelantos, setShowAdelantos] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [adelantoMonto, setAdelantoMonto] = useState("");
  const [adelantoMotivo, setAdelantoMotivo] = useState("");
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [cantidadProducto, setCantidadProducto] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus cuando no hay sesión
  useEffect(() => {
    if (!personal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [personal]);

  // Auto-logout tras 15 segundos de inactividad con contador visible y reinicio por interacción
  useEffect(() => {
    if (!personal) return;

    setSecondsLeft(15);

    const handleLogoutTimeout = () => {
      setPersonal(null);
      setAsistencia(null);
      setShowConsumos(false);
      setShowAdelantos(false);
      router.push("/kiosco"); // Redirigir de vuelta al kiosco de socios
    };

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogoutTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const resetIdleTimer = () => {
      setSecondsLeft(15);
    };

    const events = ["mousemove", "click", "keydown", "touchstart", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      clearInterval(interval);
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [personal, router]);

  // Auto-login from QR/Link
  useEffect(() => {
    if (autoCode && !personal) {
      const triggerAutoLogin = async () => {
        setLoading(true);
        const res = await getPersonalByCodigo(autoCode);
        if (res.success && res.personal) {
          setPersonal(res.personal);
          await refreshData(res.personal.id);
        } else {
          toast.error(res.error || "Enlace de acceso inválido");
          // Redirigir de vuelta al kiosco principal en 5 segundos si el código es inválido
          setTimeout(() => {
            router.push("/kiosco");
          }, 5000);
        }
        setLoading(false);
      };
      triggerAutoLogin();
    }
  }, [autoCode]);

  const handleLogin = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    let codeToUse = (overrideCode ?? codigo).trim();
    if (!codeToUse) return;

    // Si el scanner lee la URL completa, extraemos solo el código
    if (codeToUse.includes("code=")) {
      try {
        // Intentar parsear como URL completa
        const urlToParse = codeToUse.startsWith('http') ? codeToUse : `https://x.com/${codeToUse}`;
        const url = new URL(urlToParse);
        codeToUse = url.searchParams.get("code") || codeToUse;
      } catch {
        const parts = codeToUse.split("code=");
        if (parts.length > 1) codeToUse = parts[1].split('&')[0];
      }
    }

    setLoading(true);
    const res = await getPersonalByCodigo(codeToUse);
    if (res.success && res.personal) {
      setPersonal(res.personal);
      await refreshData(res.personal.id);
      setCodigo("");
    } else {
      toast.error(res.error || "Código inválido");
      setCodigo("");
      if (inputRef.current) inputRef.current.focus();
    }
    setLoading(false);
  };

  // Handler del input — debounce para auto-submit del lector óptico
  const handleCodigoChange = (val: string) => {
    setCodigo(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) {
      // Los lectores ópticos escriben todo en <100ms; esperamos 300ms sin cambios
      debounceRef.current = setTimeout(() => {
        handleLogin(undefined, val.trim());
      }, 300);
    }
  };

  const refreshData = async (personalId: string) => {
    const todayRes = await getTodayAsistencia(personalId);
    if (todayRes.success) {
      setAsistencia(todayRes.asistencia);
    }
    const resumenRes = await getResumenHoras(personalId);
    if (resumenRes.success) {
      setResumenHoras(resumenRes.totalHoras || 0);
    }
  };

  const handleLogout = () => {
    setPersonal(null);
    setAsistencia(null);
    setShowConsumos(false);
    setShowAdelantos(false);
    router.push("/kiosco"); // Redirigir de vuelta al kiosco de socios
  };

  const handleAsistencia = async (tipo: 'ENTRADA' | 'SALIDA_ALMUERZO' | 'ENTRADA_ALMUERZO' | 'SALIDA') => {
    setActionLoading(true);
    const res = await markAsistencia(personal.id, tipo);
    if (res.success) {
      toast.success(res.message);
      await refreshData(personal.id);
    } else {
      toast.error(res.error || "Error al marcar asistencia");
    }
    setActionLoading(false);
  };

  const handleConsumoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProducto || cantidadProducto < 1) return;

    setActionLoading(true);
    const res = await registrarConsumo(personal.id, selectedProducto.id, cantidadProducto);
    if (res.success) {
      toast.success("Consumo registrado. Se descontará en tu próximo pago.");
      setShowConsumos(false);
      setSelectedProducto(null);
      setCantidadProducto(1);
    } else {
      toast.error(res.error || "Error al registrar consumo");
    }
    setActionLoading(false);
  };

  const handleAdelantoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(adelantoMonto);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setActionLoading(true);
    const res = await solicitarAdelanto(personal.id, monto, adelantoMotivo);
    if (res.success) {
      toast.success("Adelanto solicitado. Espera la aprobación del administrador.");
      setShowAdelantos(false);
      setAdelantoMonto("");
      setAdelantoMotivo("");
    } else {
      toast.error(res.error || "Error al solicitar adelanto");
    }
    setActionLoading(false);
  };

  // --- LOGIN VIEW ---
  if (!personal) {
    // Si viene de un QR y está cargando, mostramos un estado más claro
    if (autoCode && loading) {
      return (
        <div className="flex flex-col items-center justify-center text-center animate-pulse">
          <QrCode className="w-24 h-24 text-yellow-500 mb-6 animate-bounce" />
          <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Procesando Acceso</h1>
          <p className="text-zinc-500 text-xl">Estamos verificando tu código personal...</p>
        </div>
      );
    }

    return (
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-zinc-900/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col items-center">
          <div className="bg-yellow-500/10 p-4 rounded-full mb-6">
            <LogIn className="w-12 h-12 text-yellow-500" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Acceso de Personal</h1>
            <p className="text-zinc-500 text-sm">Escanea tu código o ingrésalo manualmente</p>
          </div>
          
          <div className="w-full relative mb-6">
            <input
              ref={inputRef}
              type="password"
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              placeholder="••••••"
              className="w-full bg-zinc-950 border-2 border-zinc-800 text-white text-center text-4xl py-6 rounded-2xl focus:border-yellow-500 focus:outline-none transition-all tracking-[0.3em] font-mono shadow-inner"
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !codigo}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "INGRESAR"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/kiosco")}
            className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-md py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            VOLVER AL KIOSCO
          </button>
        </form>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  const faltan = personal.horasObjetivo ? Math.max(0, personal.horasObjetivo - resumenHoras).toFixed(1) : 0;
  
  return (
    <div className="w-full max-w-4xl bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
      
      {/* Contador de inactividad visible */}
      <div className="absolute top-4 right-4 z-10">
        {secondsLeft <= 5 ? (
          <div className="bg-red-600 text-white px-4 py-2 rounded-full border border-red-500 flex items-center gap-2 text-xs font-black tracking-wider uppercase animate-bounce shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <AlertCircle className="w-4 h-4 text-white" />
            <span>Cierre en: {secondsLeft}s</span>
          </div>
        ) : (
          <div className="bg-zinc-800/80 text-zinc-400 px-4 py-2 rounded-full border border-zinc-700/80 flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span>Inactivo en: {secondsLeft}s</span>
          </div>
        )}
      </div>

      {/* Sidebar Profile & Progress */}
      <div className="md:w-1/3 bg-zinc-950 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-zinc-800">
        <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border-2 border-yellow-500 overflow-hidden">
          <span className="text-3xl font-bold text-zinc-500">{personal.nombres[0]}{personal.apellidos[0]}</span>
        </div>
        <h2 className="text-2xl font-bold text-white text-center">{personal.nombres} {personal.apellidos}</h2>
        <p className="text-yellow-500 font-medium uppercase tracking-wider text-sm mt-1 mb-6">{personal.rol}</p>

        <div className="w-full bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mt-auto">
          <h3 className="text-zinc-400 text-sm font-medium mb-3 flex items-center justify-between">
            <span>Progreso Ciclo Actual</span>
            <Clock className="w-4 h-4 text-yellow-500" />
          </h3>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-black text-white">{resumenHoras.toFixed(1)}</span>
            <span className="text-zinc-500 font-medium mb-1">/ {personal.horasObjetivo || 0} hrs</span>
          </div>
          
          {personal.horasObjetivo > 0 && (
            <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-2 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full ${resumenHoras >= personal.horasObjetivo ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(100, (resumenHoras / personal.horasObjetivo) * 100)}%` }}
              ></div>
            </div>
          )}
          
          <p className="text-xs text-zinc-500">
            {resumenHoras >= personal.horasObjetivo 
              ? "¡Meta de horas cumplida!" 
              : `Faltan ${faltan} horas para la meta.`}
          </p>
        </div>

        <button 
          onClick={handleLogout}
          className="mt-6 w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider rounded-xl transition-all duration-200 shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 border-2 border-red-500 cursor-pointer pointer-events-auto"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>

      {/* Main Content Area */}
      <div className="md:w-2/3 p-6 md:p-8 flex flex-col relative">
        
        {/* Modals Overlay */}
        {(showConsumos || showAdelantos) && (
          <div className="absolute inset-0 z-20 bg-zinc-950/95 backdrop-blur-sm p-6 overflow-y-auto">
            <button 
              onClick={() => { setShowConsumos(false); setShowAdelantos(false); }}
              className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {showConsumos && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <PackageSearch className="w-8 h-8 text-yellow-500" />
                  Registrar Consumo
                </h3>
                
                {selectedProducto ? (
                   <form onSubmit={handleConsumoSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                     <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
                        {selectedProducto.fotoUrl ? (
                          <img src={selectedProducto.fotoUrl} alt={selectedProducto.nombre} className="w-20 h-20 object-cover rounded-xl" />
                        ) : (
                          <div className="w-20 h-20 bg-zinc-800 rounded-xl flex items-center justify-center"><PackageSearch className="w-8 h-8 text-zinc-600" /></div>
                        )}
                        <div>
                          <h4 className="text-xl font-bold text-white">{selectedProducto.nombre}</h4>
                          <p className="text-yellow-500 text-lg font-medium">S/ {selectedProducto.precio.toFixed(2)}</p>
                        </div>
                     </div>
                     
                     <div className="mb-6">
                       <label className="block text-zinc-400 mb-2">Cantidad</label>
                       <div className="flex items-center gap-4">
                         <button type="button" onClick={() => setCantidadProducto(Math.max(1, cantidadProducto - 1))} className="w-12 h-12 bg-zinc-800 text-white text-2xl rounded-xl hover:bg-zinc-700">-</button>
                         <span className="text-3xl font-bold text-white w-16 text-center">{cantidadProducto}</span>
                         <button type="button" onClick={() => setCantidadProducto(cantidadProducto + 1)} className="w-12 h-12 bg-zinc-800 text-white text-2xl rounded-xl hover:bg-zinc-700">+</button>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center mb-8 bg-black/50 p-4 rounded-xl">
                       <span className="text-zinc-400">Total a descontar:</span>
                       <span className="text-2xl font-black text-red-400">S/ {(selectedProducto.precio * cantidadProducto).toFixed(2)}</span>
                     </div>

                     <div className="flex gap-4">
                        <button type="button" onClick={() => setSelectedProducto(null)} className="flex-1 py-4 text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors">Volver</button>
                        <button type="submit" disabled={actionLoading} className="flex-1 py-4 text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold transition-colors disabled:opacity-50 flex justify-center items-center">
                          {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirmar Consumo"}
                        </button>
                     </div>
                   </form>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {initialProductos.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => { setSelectedProducto(prod); setCantidadProducto(1); }}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-yellow-500 hover:shadow-lg transition-all text-left flex flex-col group"
                      >
                        <div className="h-32 w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                           {prod.fotoUrl ? (
                              <img src={prod.fotoUrl} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                           ) : (
                              <PackageSearch className="w-10 h-10 text-zinc-700" />
                           )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="text-white font-bold mb-1 line-clamp-1">{prod.nombre}</h4>
                          <span className="text-yellow-500 font-bold mt-auto">S/ {prod.precio.toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                    {initialProductos.length === 0 && (
                      <div className="col-span-full py-12 text-center text-zinc-500 flex flex-col items-center">
                        <PackageSearch className="w-12 h-12 mb-4 opacity-20" />
                        No hay productos disponibles
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showAdelantos && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Banknote className="w-8 h-8 text-yellow-500" />
                  Solicitar Adelanto
                </h3>
                <form onSubmit={handleAdelantoSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-md mx-auto mt-12">
                  <div className="mb-6">
                    <label className="block text-zinc-400 mb-2 font-medium">Monto (S/)</label>
                    <input 
                      type="number" 
                      step="0.10"
                      value={adelantoMonto}
                      onChange={(e) => setAdelantoMonto(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white text-3xl p-4 rounded-xl focus:border-yellow-500 focus:outline-none transition-colors"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="mb-8">
                    <label className="block text-zinc-400 mb-2 font-medium">Motivo (Opcional)</label>
                    <input 
                      type="text" 
                      value={adelantoMotivo}
                      onChange={(e) => setAdelantoMotivo(e.target.value)}
                      placeholder="Ej. Pasajes, Almuerzo..."
                      className="w-full bg-zinc-950 border-2 border-zinc-800 text-white p-4 rounded-xl focus:border-yellow-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <button type="submit" disabled={actionLoading || !adelantoMonto} className="w-full py-4 text-black bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 flex justify-center items-center">
                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Enviar Solicitud"}
                  </button>
                  <p className="text-zinc-500 text-sm mt-4 text-center">
                    La solicitud será enviada al administrador para su aprobación.
                  </p>
                </form>
              </div>
            )}
          </div>
        )}

        <h3 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Control de Asistencia</h3>
        
        {/* Attendance Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => handleAsistencia('ENTRADA')}
            disabled={actionLoading || asistencia?.horaEntrada}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 
              ${asistencia?.horaEntrada 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                : 'bg-green-500/10 border-green-500 text-green-500 hover:bg-green-500 hover:text-black'}`}
          >
            <LogIn className="w-10 h-10" />
            <span className="font-bold text-lg uppercase tracking-wide">Entrada</span>
            {asistencia?.horaEntrada && <span className="text-xs bg-zinc-950 px-3 py-1 rounded-full text-zinc-400">{new Date(asistencia.horaEntrada).toLocaleTimeString()}</span>}
          </button>

          <button 
            onClick={() => handleAsistencia('SALIDA')}
            disabled={actionLoading || !asistencia?.horaEntrada || asistencia?.horaSalida || (asistencia?.horaSalidaAlmuerzo && !asistencia?.horaEntradaAlmuerzo)}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 
              ${asistencia?.horaSalida 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                : (!asistencia?.horaEntrada || (asistencia?.horaSalidaAlmuerzo && !asistencia?.horaEntradaAlmuerzo))
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                  : 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-black'}`}
          >
            <LogOut className="w-10 h-10" />
            <span className="font-bold text-lg uppercase tracking-wide">Salida</span>
            {asistencia?.horaSalida && <span className="text-xs bg-zinc-950 px-3 py-1 rounded-full text-zinc-400">{new Date(asistencia.horaSalida).toLocaleTimeString()}</span>}
          </button>

          <button 
            onClick={() => handleAsistencia('SALIDA_ALMUERZO')}
            disabled={actionLoading || !asistencia?.horaEntrada || asistencia?.horaSalidaAlmuerzo || asistencia?.horaSalida}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 
              ${asistencia?.horaSalidaAlmuerzo 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                : (!asistencia?.horaEntrada || asistencia?.horaSalida)
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                  : 'bg-orange-500/10 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black'}`}
          >
            <Coffee className="w-10 h-10" />
            <span className="font-bold text-lg uppercase tracking-wide text-center">Salida<br/>Almuerzo</span>
            {asistencia?.horaSalidaAlmuerzo && <span className="text-xs bg-zinc-950 px-3 py-1 rounded-full text-zinc-400">{new Date(asistencia.horaSalidaAlmuerzo).toLocaleTimeString()}</span>}
          </button>

          <button 
            onClick={() => handleAsistencia('ENTRADA_ALMUERZO')}
            disabled={actionLoading || !asistencia?.horaSalidaAlmuerzo || asistencia?.horaEntradaAlmuerzo || asistencia?.horaSalida}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-2 
              ${asistencia?.horaEntradaAlmuerzo 
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                : (!asistencia?.horaSalidaAlmuerzo || asistencia?.horaSalida)
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                  : 'bg-blue-500/10 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black'}`}
          >
            <LogIn className="w-10 h-10" />
            <span className="font-bold text-lg uppercase tracking-wide text-center">Retorno<br/>Almuerzo</span>
            {asistencia?.horaEntradaAlmuerzo && <span className="text-xs bg-zinc-950 px-3 py-1 rounded-full text-zinc-400">{new Date(asistencia.horaEntradaAlmuerzo).toLocaleTimeString()}</span>}
          </button>
        </div>

        {/* Quick Actions */}
        <h3 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4 mt-auto">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowConsumos(true)}
            className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-colors"
          >
            <PackageSearch className="w-5 h-5 text-yellow-500" />
            Registrar Consumo
          </button>
          <button 
            onClick={() => setShowAdelantos(true)}
            className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium flex items-center justify-center gap-3 transition-colors"
          >
            <Banknote className="w-5 h-5 text-green-500" />
            Pedir Adelanto
          </button>
        </div>

      </div>
    </div>
  );
}
