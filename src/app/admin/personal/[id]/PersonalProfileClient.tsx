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
  XCircle,
  Download,
  MessageCircle,
  Share2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { 
  createManualAsistencia, 
  updateAsistencia, 
  deleteAsistencia 
} from "@/app/actions/asistencia-personal";
import { logQRSent } from "@/app/actions/socios";
import { pagarConsumoPersonal, pagarTodosConsumosPersonal } from "@/app/actions/personal";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

/** Genera la imagen del carnet de personal (dorado/amarillo) en un canvas y devuelve un Blob PNG. */
async function generateCarnetBlob(
  svgId: string,
  codigo: string,
  nombre: string
): Promise<Blob | null> {
  const svgEl = document.getElementById(svgId) as SVGSVGElement | null;
  if (!svgEl) return null;

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const qrImg = new Image();
    qrImg.onload = () => {
      const SCALE = 3;
      const QR = 252 * SCALE;
      const PAD = 16 * SCALE;
      const HDR = 64 * SCALE;
      const FTR = 60 * SCALE;
      const W = QR + PAD * 2;
      const H = HDR + QR + PAD * 2 + FTR;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Base blanca
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Degradado del header (Dorado/Amarillo para Personal)
      const grad = ctx.createLinearGradient(0, 0, W, HDR);
      grad.addColorStop(0, "#ca8a04");
      grad.addColorStop(1, "#eab308");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, HDR);

      // Texto de cabecera
      const txtX = PAD + 12 * SCALE;
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${18 * SCALE}px Arial, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText("MR. GYM", txtX, HDR * 0.38);
      ctx.font = `600 ${9 * SCALE}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText("CARNET DE PERSONAL", txtX, HDR * 0.72);

      // Imagen QR (limpia, sobre fondo blanco)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, HDR, W, QR + PAD * 2);
      ctx.drawImage(qrImg, PAD, HDR + PAD, QR, QR);

      // Fondo del footer (amarillo muy claro)
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(0, HDR + QR + PAD * 2, W, FTR);

      // Línea de borde del footer
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = SCALE;
      ctx.beginPath();
      ctx.moveTo(0, HDR + QR + PAD * 2);
      ctx.lineTo(W, HDR + QR + PAD * 2);
      ctx.stroke();

      // Código en el footer (dorado)
      ctx.fillStyle = "#ca8a04";
      ctx.font = `900 ${20 * SCALE}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(codigo, W / 2, HDR + QR + PAD * 2 + FTR * 0.35);

      // Nombre en el footer
      ctx.fillStyle = "#444444";
      ctx.font = `600 ${10 * SCALE}px Arial, sans-serif`;
      ctx.fillText(nombre, W / 2, HDR + QR + PAD * 2 + FTR * 0.72);

      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    qrImg.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      resolve(null);
    };
    qrImg.src = svgUrl;
  });
}

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
  consumos?: {
    id: string;
    personalId: string;
    productoPersonalId: string;
    cantidad: number;
    montoTotal: number;
    fecha: Date | string;
    pagado: boolean;
    producto: {
      nombre: string;
      precio: number;
      fotoUrl?: string | null;
    };
  }[];
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
  const [activeTab, setActiveTab] = useState<"asistencias" | "carnet" | "consumos">("asistencias");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrUrl(`${window.location.origin}/kiosco-personal?code=${personal.codigo}`);
    }
  }, [personal.codigo]);
  
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

  // Consumos pendientes
  const consumosPendientes = personal.consumos || [];
  const totalConsumosPendientes = consumosPendientes.reduce((sum, c) => sum + c.montoTotal, 0);

  const handlePagarConsumo = async (consumoId: string) => {
    if (confirm("¿Estás seguro de marcar este consumo como PAGADO?")) {
      const res = await pagarConsumoPersonal(consumoId, personal.id);
      if (res.success) {
        toast.success("Consumo cancelado correctamente");
        router.refresh();
      } else {
        toast.error(res.error || "Error al registrar el pago");
      }
    }
  };

  const handlePagarTodosConsumos = async () => {
    if (confirm(`¿Estás seguro de cancelar TODOS los consumos pendientes por un total de S/ ${totalConsumosPendientes.toFixed(2)}?`)) {
      const res = await pagarTodosConsumosPersonal(personal.id);
      if (res.success) {
        toast.success(`Se cancelaron todos los consumos por S/ ${res.total?.toFixed(2)}`);
        router.refresh();
      } else {
        toast.error(res.error || "Error al procesar el pago masivo");
      }
    }
  };

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

          {/* Tabs */}
          <div className="bg-zinc-950 p-1 border border-zinc-800 rounded-xl flex gap-1 w-full">
            <button 
              onClick={() => setActiveTab("asistencias")} 
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "asistencias" 
                  ? "bg-yellow-500 text-black shadow-lg" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Asistencias y Horas
            </button>
            <button 
              onClick={() => setActiveTab("carnet")} 
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "carnet" 
                  ? "bg-yellow-500 text-black shadow-lg" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Carnet Digital
            </button>
            <button 
              onClick={() => setActiveTab("consumos")} 
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "consumos" 
                  ? "bg-yellow-500 text-black shadow-lg" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Consumos
            </button>
          </div>

          {activeTab === "asistencias" && (
            <>
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
          </>
          )}

          {activeTab === "carnet" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col items-center text-center">
                <h2 className="text-xl font-bold text-white mb-4">Carnet de Personal</h2>

                {/* Branded QR Card */}
                <div
                  id="qr-code-container"
                  style={{
                    width: "300px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    border: "3px solid #ca8a04",
                    margin: "0 auto",
                    background: "#fff",
                  }}
                >
                  {/* Header with brand */}
                  <div style={{
                    background: "linear-gradient(135deg, #ca8a04 0%, #eab308 100%)",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                    <img
                      src="/icons/icon-192x192.png"
                      alt="Mr. Gym"
                      style={{ width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0 }}
                    />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: "#fff", fontWeight: 900, fontSize: "18px", letterSpacing: "-0.5px", lineHeight: 1 }}>MR. GYM</div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>Carnet de Personal</div>
                    </div>
                  </div>

                  {/* Clean QR — nothing behind or on top */}
                  <div style={{ background: "#fff", padding: "16px", display: "flex", justifyContent: "center" }}>
                    {qrUrl ? (
                      <QRCodeSVG
                        value={qrUrl}
                        size={252}
                        level="H"
                        includeMargin={false}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        id="personal-qr-svg"
                      />
                    ) : (
                      <div style={{ width: 252, height: 252 }} className="flex items-center justify-center text-zinc-400">Cargando...</div>
                    )}
                  </div>

                  {/* Footer with code + name */}
                  <div style={{
                    background: "#fffdf5",
                    borderTop: "1px solid #fef08a",
                    padding: "10px 16px 14px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 900, letterSpacing: "4px", color: "#ca8a04" }}>
                      {personal.codigo}
                    </div>
                    <div style={{ fontSize: "12px", color: "#555", marginTop: "2px", fontWeight: 600 }}>
                      {personal.nombres} {personal.apellidos}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-8 w-full max-w-sm mx-auto">
                  {/* Estado del Empleado */}
                  <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center gap-4 shadow-sm transition-all w-full">
                    <div className={`p-3 rounded-full ${personal.activo ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                      {personal.activo ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-xs opacity-70 uppercase tracking-widest mb-0.5">Estado del Empleado</h3>
                      <div className="text-2xl font-black tracking-tight leading-none text-white">
                        {personal.activo ? "HABILITADO" : "INACTIVO"}
                      </div>
                    </div>
                  </div>

                  <div className="divider text-xs font-semibold opacity-50 uppercase tracking-widest my-2 text-zinc-500">Acciones del QR</div>

                  {/* Botones */}
                  <div className="grid grid-cols-1 gap-3 w-full">
                    <button className="btn bg-yellow-500 hover:bg-yellow-400 text-black border-none w-full shadow-md font-bold py-3.5 rounded-xl flex items-center justify-center gap-2" onClick={async () => {
                      const blob = await generateCarnetBlob("personal-qr-svg", personal.codigo, `${personal.nombres} ${personal.apellidos}`);
                      if (!blob) { alert("Error al generar la imagen. Intenta de nuevo."); return; }
                      const link = document.createElement("a");
                      link.download = `QR-${personal.nombres}-${personal.codigo}.png`;
                      link.href = URL.createObjectURL(blob);
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
                    }}>
                      <Download size={20} />
                      Descargar Imagen
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button className="btn bg-green-600 hover:bg-green-500 border-none text-white shadow-sm font-bold py-3 rounded-xl flex items-center justify-center gap-1.5" onClick={async () => {
                        if (!personal.telefono) {
                          alert("El empleado no tiene un número de teléfono registrado.");
                          return;
                        }
                        const phone = personal.telefono.replace(/\D/g, "");
                        const phoneWithCountry = phone.length === 9 ? `51${phone}` : phone;
                        const text = `Hola ${personal.nombres}, aquí tienes tu enlace directo para marcar tu asistencia en Mr. Gym: ${qrUrl}`;
                        const targetUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;

                        window.open(targetUrl, "_blank");
                        logQRSent(personal.nombres, personal.codigo, "WhatsApp");

                        const blob = await generateCarnetBlob("personal-qr-svg", personal.codigo, `${personal.nombres} ${personal.apellidos}`);
                        if (blob) {
                          try {
                            const item = new ClipboardItem({ "image/png": blob });
                            await navigator.clipboard.write([item]);
                            toast.success("¡Imagen QR copiada al portapapeles! Puedes pegarla en WhatsApp.");
                          } catch (e) {
                            console.error("No se pudo copiar al portapapeles", e);
                          }
                        }
                      }}>
                        <MessageCircle size={18} />
                        WhatsApp
                      </button>

                      <button className="btn bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white shadow-sm font-bold py-3 rounded-xl flex items-center justify-center gap-1.5" onClick={async () => {
                        const text = `Hola ${personal.nombres}, aquí tienes tu código de acceso para Mr. Gym: ${personal.codigo}`;
                        const blob = await generateCarnetBlob("personal-qr-svg", personal.codigo, `${personal.nombres} ${personal.apellidos}`);
                        if (!blob) { alert("Error al generar la imagen."); return; }
                        const file = new File([blob], `QR-${personal.nombres}-${personal.codigo}.png`, { type: "image/png" });
                        const shareData = { title: "Código QR de Acceso", text, files: [file] };
                        if (navigator.canShare && navigator.canShare(shareData)) {
                          try {
                            await navigator.share(shareData);
                            logQRSent(personal.nombres, personal.codigo, "Nativo (Compartir)");
                          } catch (err: any) {
                            console.log("Compartir cancelado o falló", err.message);
                          }
                        } else {
                          alert("Tu dispositivo no soporta compartir nativamente. Usa el botón 'WhatsApp'.");
                        }
                      }}>
                        <Share2 size={18} />
                        Compartir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "consumos" && (
            <div className="space-y-6">
              {/* Resumen Deuda y Pago Masivo */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Consumos Pendientes de Pago
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    Lista de consumos registrados por el empleado en el kiosco que aún no han sido cobrados o descontados.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                  <div>
                    <p className="text-xs text-zinc-500">Deuda Total Acumulada</p>
                    <p className="text-2xl font-black text-yellow-500">
                      S/ {totalConsumosPendientes.toFixed(2)}
                    </p>
                  </div>
                  {totalConsumosPendientes > 0 && (
                    <button 
                      onClick={handlePagarTodosConsumos}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-colors border-none"
                    >
                      Cancelar Todos los Consumos
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de Consumos */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 bg-zinc-950">
                  <h3 className="text-lg font-bold text-white">Detalle de Adquisiciones</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Historial de consumos pendientes con fecha y hora exactas</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase font-semibold text-zinc-300">
                      <tr>
                        <th className="px-6 py-4">Fecha y Hora</th>
                        <th className="px-6 py-4">Producto</th>
                        <th className="px-6 py-4 text-center">Cantidad</th>
                        <th className="px-6 py-4 text-right">Subtotal</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {consumosPendientes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                            El empleado no tiene consumos pendientes de pago. ¡Está al día!
                          </td>
                        </tr>
                      ) : (
                        consumosPendientes.map((c) => {
                          const dateObj = new Date(c.fecha);
                          // Exact date: dd/MM/yyyy
                          const formattedDate = dateObj.toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          });
                          // Exact time: hh:mm:ss a
                          const formattedTime = dateObj.toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true
                          });

                          return (
                            <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-white">{formattedDate}</div>
                                <div className="text-xs text-zinc-500 font-mono">{formattedTime}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {c.producto.fotoUrl ? (
                                    <img src={c.producto.fotoUrl} alt={c.producto.nombre} className="w-8 h-8 rounded-lg object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-500">P</div>
                                  )}
                                  <div className="font-bold text-zinc-200">{c.producto.nombre}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center text-white font-medium">
                                {c.cantidad}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-white">
                                S/ {c.montoTotal.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handlePagarConsumo(c.id)}
                                  className="bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                                  title="Marcar como pagado"
                                >
                                  <Check className="w-3.5 h-3.5" /> Cancelar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
