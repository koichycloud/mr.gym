"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  DollarSign, 
  X, 
  Loader2, 
  AlertCircle,
  Briefcase,
  Phone,
  FileText,
  Percent,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  createManualAsistencia, 
  updateAsistencia, 
  deleteAsistencia 
} from "@/app/actions/asistencia-personal";
import Link from "next/link";

interface Personal {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  dni: string;
  telefono: string | null;
  rol: string;
  metodoPago: string;
  montoPago: number;
  horasObjetivo: number;
  activo: boolean;
}

interface Asistencia {
  id: string;
  personalId: string;
  fecha: Date | string;
  horaEntrada: Date | string | null;
  horaSalidaAlmuerzo: Date | string | null;
  horaEntradaAlmuerzo: Date | string | null;
  horaSalida: Date | string | null;
  horasTrabajadas: number | null;
}

export default function PersonalProfileClient({ 
  personal, 
  initialAsistencias 
}: { 
  personal: Personal; 
  initialAsistencias: Asistencia[] 
}) {
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<Asistencia[]>(initialAsistencias);
  const [filterMode, setFilterMode] = useState<"ALL" | "CYCLE">("CYCLE");
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fecha: "",
    horaEntrada: "",
    horaSalidaAlmuerzo: "",
    horaEntradaAlmuerzo: "",
    horaSalida: ""
  });

  // Sync state with props when initialAsistencias changes
  useEffect(() => {
    setAsistencias(initialAsistencias);
  }, [initialAsistencias]);

  // Helper: Date format "Lunes, 1 de Enero de 2026"
  const formatLocalDate = (dateVal: Date | string) => {
    if (typeof dateVal === "string" && dateVal.includes("T")) {
      const parts = dateVal.split("T")[0].split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const date = parseInt(parts[2], 10);
        const localD = new Date(year, month, date);
        const dayOfWeek = localD.getDay();
        const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const months = [
          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return `${weekdays[dayOfWeek]}, ${date} de ${months[month]} de ${year}`;
      }
    }
    const d = new Date(dateVal);
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = d.getDate();
    const dayOfWeek = d.getDay();

    const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    return `${weekdays[dayOfWeek]}, ${date} de ${months[month]} de ${year}`;
  };

  // Helper: Time format "HH:MM" local
  const formatLocalTime = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Convert Date object to "YYYY-MM-DD" local for inputs
  const getLocalDateString = (dateVal: Date | string) => {
    if (typeof dateVal === "string" && dateVal.includes("T")) {
      return dateVal.split("T")[0];
    }
    const d = new Date(dateVal);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert Date object to "HH:MM" local for inputs
  const getLocalTimeString = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Define payment cycle based on method
  const getCycleDates = (metodo: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let name = "";

    if (metodo === "POR_HORA" || metodo === "POR_DIA" || metodo === "SEMANAL") {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      name = "Semana Actual";
    } else if (metodo === "QUINCENAL") {
      const dayOfMonth = now.getDate();
      if (dayOfMonth <= 15) {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
        name = "1ra Quincena del Mes";
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        name = "2da Quincena del Mes";
      }
    } else if (metodo === "MENSUAL") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      name = "Mes Actual";
    } else {
      start = new Date();
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      name = "Últimos 30 Días";
    }

    return { start, end, name };
  };

  const cycle = getCycleDates(personal.metodoPago);

  // Filter attendance logs in the current cycle
  const cycleAsistencias = asistencias.filter(a => {
    const f = new Date(a.fecha);
    return f.getTime() >= cycle.start.getTime() && f.getTime() <= cycle.end.getTime();
  });

  // Calculate worked hours
  const totalHoursAll = asistencias.reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0);
  const totalHoursCycle = cycleAsistencias.reduce((sum, a) => sum + (a.horasTrabajadas || 0), 0);

  const displayedAsistencias = filterMode === "CYCLE" ? cycleAsistencias : asistencias;
  const currentHours = filterMode === "CYCLE" ? totalHoursCycle : totalHoursAll;

  // Earnings estimation
  let estimatedEarnings = 0;
  if (personal.metodoPago === "POR_HORA") {
    estimatedEarnings = totalHoursCycle * personal.montoPago;
  } else if (personal.metodoPago === "POR_DIA") {
    // Count days with entry registered in the current cycle
    const activeDaysCount = cycleAsistencias.filter(a => a.horaEntrada).length;
    estimatedEarnings = activeDaysCount * personal.montoPago;
  } else {
    // Fijo
    estimatedEarnings = personal.montoPago;
  }

  // Progress percentage
  const percentage = personal.horasObjetivo > 0 
    ? Math.min(Math.round((totalHoursCycle / personal.horasObjetivo) * 100), 100) 
    : 0;

  // Open modal for Adding
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      fecha: getLocalDateString(new Date()),
      horaEntrada: "08:00",
      horaSalidaAlmuerzo: "",
      horaEntradaAlmuerzo: "",
      horaSalida: ""
    });
    setModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (a: Asistencia) => {
    setIsEditing(true);
    setEditingId(a.id);
    setFormData({
      fecha: getLocalDateString(a.fecha),
      horaEntrada: getLocalTimeString(a.horaEntrada),
      horaSalidaAlmuerzo: getLocalTimeString(a.horaSalidaAlmuerzo),
      horaEntradaAlmuerzo: getLocalTimeString(a.horaEntradaAlmuerzo),
      horaSalida: getLocalTimeString(a.horaSalida)
    });
    setModalOpen(true);
  };

  // Submit Modal Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fecha || !formData.horaEntrada) {
      toast.error("Fecha y Hora de entrada son requeridos");
      return;
    }

    setSubmitting(true);
    let res;

    if (isEditing && editingId) {
      res = await updateAsistencia(editingId, personal.id, formData);
    } else {
      res = await createManualAsistencia(personal.id, formData);
    }

    if (res.success) {
      toast.success(isEditing ? "Registro de asistencia actualizado" : "Asistencia registrada manualmente");
      setModalOpen(false);
      router.refresh();
    } else {
      toast.error(res.error || "Ocurrió un error");
    }
    setSubmitting(false);
  };

  // Delete Attendance Record
  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro de asistencia? Esta acción no se puede deshacer.")) {
      const res = await deleteAsistencia(id, personal.id);
      if (res.success) {
        toast.success("Registro de asistencia eliminado");
        router.refresh();
      } else {
        toast.error(res.error || "Error al eliminar el registro");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/admin/personal" 
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Volver a Personal
        </Link>
        <div className="flex items-center gap-3">
          {personal.activo ? (
            <span className="bg-green-500/10 text-green-500 border border-green-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Activo
            </span>
          ) : (
            <span className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Inactivo
            </span>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Profile Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-[100%]"></div>
            
            <div className="flex flex-col items-center text-center pb-6 border-b border-zinc-800/80">
              <div className="w-20 h-20 bg-zinc-800 border border-zinc-700 text-yellow-500 rounded-2xl flex items-center justify-center mb-4">
                <User className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {personal.nombres} {personal.apellidos}
              </h2>
              <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                {personal.rol}
              </span>
            </div>

            <div className="pt-6 space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/40">
                <span className="text-zinc-400 flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-500" /> Documento</span>
                <span className="text-white font-semibold">{personal.tipoDocumento}: {personal.dni}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/40">
                <span className="text-zinc-400 flex items-center gap-2"><Phone className="w-4 h-4 text-zinc-500" /> Teléfono</span>
                <span className="text-white font-medium">{personal.telefono || "No registrado"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/40">
                <span className="text-zinc-400 flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" /> Cód. Kiosco</span>
                <span className="font-mono bg-zinc-950 px-2.5 py-1 border border-zinc-800 text-white rounded font-bold">{personal.codigo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/40">
                <span className="text-zinc-400 flex items-center gap-2"><Briefcase className="w-4 h-4 text-zinc-500" /> Método Pago</span>
                <span className="text-white font-semibold">{personal.metodoPago.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/40">
                <span className="text-zinc-400 flex items-center gap-2"><DollarSign className="w-4 h-4 text-zinc-500" /> Monto Pago</span>
                <span className="text-yellow-500 font-bold">S/ {personal.montoPago.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400 flex items-center gap-2"><Percent className="w-4 h-4 text-zinc-500" /> Horas Obj.</span>
                <span className="text-white font-bold">{personal.horasObjetivo} hrs/ciclo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Worked Hours Summary & Attendance Records */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: worked hours summary for the current cycle */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Resumen de Horas Trabajadas
                </h3>
                <p className="text-zinc-400 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Ciclo: <span className="text-yellow-500 font-semibold">{cycle.name}</span> ({cycle.start.toLocaleDateString()} - {cycle.end.toLocaleDateString()})
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-zinc-500">Monto proyectado (Sujeto a descuentos)</p>
                <p className="text-2xl font-black text-green-500">
                  S/ {estimatedEarnings.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Progress Bar comparison */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Progreso de horas respecto al objetivo del ciclo:</span>
                <span className="text-white font-bold">
                  {totalHoursCycle.toFixed(1)} / {personal.horasObjetivo} horas ({percentage}%)
                </span>
              </div>
              
              {personal.horasObjetivo > 0 ? (
                <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-4 overflow-hidden p-0.5">
                  <div 
                    className="bg-yellow-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No hay objetivo de horas configurado para este empleado.</p>
              )}
            </div>
          </div>

          {/* Card 2: Attendance records table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-zinc-950">
              <div>
                <h3 className="text-lg font-bold text-white">Registro de Asistencia</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Mostrando los registros de la base de datos (Máx. 100)</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Filter Tabs */}
                <div className="bg-zinc-900 p-1 border border-zinc-800 rounded-xl flex">
                  <button 
                    onClick={() => setFilterMode("CYCLE")} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterMode === "CYCLE" 
                        ? "bg-yellow-500 text-black shadow-lg" 
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Ciclo Actual
                  </button>
                  <button 
                    onClick={() => setFilterMode("ALL")} 
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterMode === "ALL" 
                        ? "bg-yellow-500 text-black shadow-lg" 
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                </div>

                <button 
                  onClick={handleOpenAddModal}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar Registro
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase font-semibold text-zinc-300">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Entrada</th>
                    <th className="px-6 py-4">Almuerzo (Salida / Retorno)</th>
                    <th className="px-6 py-4">Salida Final</th>
                    <th className="px-6 py-4 text-center">Neto</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {displayedAsistencias.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 italic">
                        No se encontraron registros de asistencia en este periodo.
                      </td>
                    </tr>
                  ) : (
                    displayedAsistencias.map((a) => (
                      <tr key={a.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white capitalize">
                            {formatLocalDate(a.fecha)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-zinc-200">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {formatLocalTime(a.horaEntrada)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {a.horaSalidaAlmuerzo || a.horaEntradaAlmuerzo ? (
                            <span className="flex items-center gap-1 text-zinc-300">
                              <span className="bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-zinc-400 rounded text-xs">
                                {formatLocalTime(a.horaSalidaAlmuerzo)}
                              </span>
                              <span className="text-zinc-600">→</span>
                              <span className="bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-zinc-400 rounded text-xs">
                                {formatLocalTime(a.horaEntradaAlmuerzo)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-zinc-200">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {formatLocalTime(a.horaSalida)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {a.horasTrabajadas !== null ? (
                            <span className="bg-zinc-950 px-2.5 py-1 border border-zinc-800 text-yellow-500 font-mono font-bold rounded">
                              {a.horasTrabajadas.toFixed(2)}h
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">Incompleto</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => handleOpenEditModal(a)} 
                              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-lg transition-colors"
                              title="Editar registro"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(a.id)} 
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Manual Entry Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-950">
              <h3 className="text-xl font-bold text-white">
                {isEditing ? "Editar Registro de Asistencia" : "Agregar Asistencia Manual"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Informative Warning */}
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 flex gap-3 text-xs text-yellow-500/90 leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Nota de cálculo de horas:</p>
                  El sistema calculará automáticamente las horas trabajadas netas restando el tiempo de almuerzo (entrada de almuerzo menos salida de almuerzo) del horario total de trabajo (salida final menos entrada inicial).
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Fecha de la Jornada
                </label>
                <input 
                  required 
                  type="date" 
                  value={formData.fecha} 
                  onChange={e => setFormData({...formData, fecha: e.target.value})} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Hora Entrada (Inicial)
                  </label>
                  <input 
                    required 
                    type="time" 
                    value={formData.horaEntrada} 
                    onChange={e => setFormData({...formData, horaEntrada: e.target.value})} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:outline-none font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Hora Salida (Final)
                  </label>
                  <input 
                    type="time" 
                    value={formData.horaSalida} 
                    onChange={e => setFormData({...formData, horaSalida: e.target.value})} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:outline-none font-mono" 
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800/80 my-4 pt-4">
                <h4 className="text-zinc-300 font-bold text-xs uppercase tracking-wider mb-3">
                  Intermedio / Break Almuerzo (Opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Salida a Almuerzo
                    </label>
                    <input 
                      type="time" 
                      value={formData.horaSalidaAlmuerzo} 
                      onChange={e => setFormData({...formData, horaSalidaAlmuerzo: e.target.value})} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-yellow-500 focus:outline-none font-mono text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Retorno de Almuerzo
                    </label>
                    <input 
                      type="time" 
                      value={formData.horaEntradaAlmuerzo} 
                      onChange={e => setFormData({...formData, horaEntradaAlmuerzo: e.target.value})} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-yellow-500 focus:outline-none font-mono text-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="px-5 py-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    "Guardar Registro"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
