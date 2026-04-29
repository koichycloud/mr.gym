"use client";

import { useState } from "react";
import { actualizarEstadoAdelanto, generarPago } from "@/app/actions/nomina-personal";
import { Check, X, Loader2, Banknote, Calendar, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function NominaClient({ initialPersonal, initialAdelantos, initialPagos }: { initialPersonal: any[], initialAdelantos: any[], initialPagos: any[] }) {
  const [adelantos, setAdelantos] = useState(initialAdelantos);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Pago Form
  const [selectedPersonalId, setSelectedPersonalId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [generandoPago, setGenerandoPago] = useState(false);

  const handleEstadoAdelanto = async (id: string, estado: "APROBADO" | "RECHAZADO") => {
    setLoadingId(id);
    const res = await actualizarEstadoAdelanto(id, estado);
    if (res.success) {
      toast.success(`Adelanto ${estado.toLowerCase()}`);
      setAdelantos(adelantos.filter((a) => a.id !== id));
    } else {
      toast.error(res.error || "Error al actualizar");
    }
    setLoadingId(null);
  };

  const handleGenerarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonalId || !fechaInicio || !fechaFin) {
      toast.error("Completa todos los campos");
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      toast.error("La fecha de inicio no puede ser mayor a la fecha fin");
      return;
    }

    setGenerandoPago(true);
    const start = new Date(fechaInicio + "T00:00:00");
    const end = new Date(fechaFin + "T23:59:59");
    
    const res = await generarPago(selectedPersonalId, start, end);
    if (res.success) {
      toast.success("Pago generado correctamente");
      setSelectedPersonalId("");
      // Recargar para limpiar data
      window.location.reload();
    } else {
      toast.error(res.error || "Error al generar pago");
    }
    setGenerandoPago(false);
  };

  return (
    <div className="space-y-8">
      
      {/* Adelantos Pendientes Section */}
      {adelantos.length > 0 && (
        <div className="bg-zinc-900 border-2 border-yellow-500/50 rounded-2xl p-6 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            Adelantos Pendientes de Aprobación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adelantos.map(a => (
              <div key={a.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-bl-[100%]"></div>
                <div className="font-bold text-white text-lg mb-1">{a.personal.nombres} {a.personal.apellidos}</div>
                <div className="text-zinc-400 text-sm mb-4">Motivo: {a.motivo || "No especificado"}</div>
                <div className="text-3xl font-black text-yellow-500 mb-6">S/ {a.monto.toFixed(2)}</div>
                <div className="flex gap-2 mt-auto">
                  <button 
                    disabled={loadingId === a.id}
                    onClick={() => handleEstadoAdelanto(a.id, "RECHAZADO")}
                    className="flex-1 p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg flex justify-center items-center font-bold transition-colors disabled:opacity-50"
                  >
                    {loadingId === a.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rechazar"}
                  </button>
                  <button 
                    disabled={loadingId === a.id}
                    onClick={() => handleEstadoAdelanto(a.id, "APROBADO")}
                    className="flex-1 p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg flex justify-center items-center font-bold transition-colors disabled:opacity-50"
                  >
                    {loadingId === a.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aprobar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generar Pago Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Banknote className="w-6 h-6 text-green-500" />
          Generar Pago / Planilla
        </h2>
        <form onSubmit={handleGenerarPago} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Seleccionar Personal</label>
            <select 
              required
              value={selectedPersonalId}
              onChange={(e) => setSelectedPersonalId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">-- Seleccionar --</option>
              {initialPersonal.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombres} {p.apellidos} ({p.metodoPago.replace('_', ' ')} - S/{p.montoPago})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha Inicio</label>
            <div className="relative">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
               <input 
                 required
                 type="date" 
                 value={fechaInicio}
                 onChange={(e) => setFechaInicio(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 pl-12 text-white focus:border-yellow-500 focus:outline-none" 
               />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha Fin</label>
            <div className="relative">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
               <input 
                 required
                 type="date" 
                 value={fechaFin}
                 onChange={(e) => setFechaFin(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 pl-12 text-white focus:border-yellow-500 focus:outline-none" 
               />
            </div>
          </div>
          <div className="md:col-span-4 mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-start gap-4">
            <Clock className="w-6 h-6 text-zinc-500 shrink-0 mt-1" />
            <div>
              <p className="text-zinc-400 text-sm">
                Al generar el pago, el sistema sumará las horas trabajadas en el rango de fechas, calculará el sueldo base (según método), y descontará automáticamente todos los consumos y adelantos **Aprobados** que no hayan sido pagados previamente.
              </p>
            </div>
          </div>
          <div className="md:col-span-4 flex justify-end">
             <button 
                type="submit" 
                disabled={generandoPago}
                className="px-8 py-4 bg-green-500 hover:bg-green-600 text-black font-bold text-lg rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generandoPago ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Banknote className="w-6 h-6" /> Generar Planilla de Pago</>}
              </button>
          </div>
        </form>
      </div>

      {/* Historial de Pagos Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Últimas Planillas Generadas</h2>
        {initialPagos.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            No hay pagos registrados recientemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="pb-4 font-medium">Personal</th>
                  <th className="pb-4 font-medium">Periodo</th>
                  <th className="pb-4 font-medium text-center">Horas</th>
                  <th className="pb-4 font-medium text-right">Monto Final</th>
                  <th className="pb-4 font-medium text-right">Fecha Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {initialPagos.map(p => (
                  <tr key={p.id} className="group">
                    <td className="py-4 font-medium text-white">{p.personal.nombres} {p.personal.apellidos}</td>
                    <td className="py-4 text-zinc-400 text-sm">
                      {new Date(p.fechaInicio).toLocaleDateString()} - {new Date(p.fechaFin).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-center text-zinc-300 font-mono">{p.horasTrabajadas}h</td>
                    <td className="py-4 text-right text-green-500 font-bold">S/ {p.montoFinal.toFixed(2)}</td>
                    <td className="py-4 text-right text-zinc-500 text-sm">{new Date(p.fechaPago).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
