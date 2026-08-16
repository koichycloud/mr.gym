"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Users,
  Dumbbell,
  UserPlus,
  ArrowRightLeft,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  History,
  Activity,
  FileText,
  UserCheck,
  AlertTriangle,
  Loader2,
  X,
  ChevronRight,
} from "lucide-react";
import {
  assignTrainerToMember,
  endTrainerAssignment,
  changeTrainerAssignment,
  getMemberTrainerHistory,
} from "@/app/actions/asignacion-entrenador";
import { useRouter } from "next/navigation";

interface CurrentUser {
  id: string;
  username: string;
  role: string;
  personalId: string | null;
  personal: {
    id: string;
    codigo: string;
    nombres: string;
    apellidos: string;
    rol: string;
    activo: boolean;
  } | null;
  canManage: boolean;
}

interface Trainer {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  rol: string;
  telefono: string | null;
  fotoUrl: string | null;
  activo: boolean;
}

interface Assignment {
  id: string;
  socioId: string;
  entrenadorId: string;
  fechaInicio: Date | string;
  fechaFin: Date | string | null;
  mesesPlan: number;
  activo: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  socio: {
    id: string;
    codigo: string;
    nombres: string | null;
    apellidos: string | null;
    numeroDocumento: string;
    tipoDocumento: string;
    telefono: string | null;
    fotoUrl: string | null;
    estado: string;
  };
  entrenador: {
    id: string;
    codigo: string;
    nombres: string;
    apellidos: string;
    rol: string;
    fotoUrl: string | null;
    activo: boolean;
  };
}

interface MemberForAssignment {
  id: string;
  codigo: string;
  nombres: string | null;
  apellidos: string | null;
  numeroDocumento: string;
  tipoDocumento: string;
  telefono: string | null;
  fotoUrl: string | null;
  asignacionesEntrenador: {
    entrenador: {
      id: string;
      nombres: string;
      apellidos: string;
      rol: string;
    };
  }[];
}

interface Props {
  currentUser: CurrentUser;
  trainers: Trainer[];
  initialAssignments: Assignment[];
  members: MemberForAssignment[];
}

export default function AsignacionesClient({
  currentUser,
  trainers,
  initialAssignments,
  members,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tab activo: si el usuario es entrenador y no admin, inicia en "mis-socios"
  const isLinkedTrainer = Boolean(currentUser.personalId);
  const [activeTab, setActiveTab] = useState<"mis-socios" | "gestion">(
    isLinkedTrainer && !currentUser.canManage ? "mis-socios" : "mis-socios"
  );

  // Filtros
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(
    currentUser.personalId || (trainers.length > 0 ? trainers[0]!.id : "all")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "activos" | "historicos">("activos");

  // Modales
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    socioId: "",
    entrenadorId: currentUser.personalId || (trainers[0]?.id || ""),
    fechaInicio: new Date().toISOString().split("T")[0],
    mesesPlan: 1,
  });

  const [changeTarget, setChangeTarget] = useState<Assignment | null>(null);
  const [changeForm, setChangeForm] = useState({
    nuevoEntrenadorId: "",
    fechaInicio: new Date().toISOString().split("T")[0],
    mesesPlan: 1,
  });

  const [endTarget, setEndTarget] = useState<Assignment | null>(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [historyTarget, setHistoryTarget] = useState<{
    id: string;
    nombres: string | null;
    apellidos: string | null;
    codigo: string;
  } | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Formato seguro de fecha
  const safeFormatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      return format(d, "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  // Filtrado de asignaciones para "Mis Socios"
  const myTrainerAssignments = initialAssignments.filter((a) => {
    const matchesTrainer =
      selectedTrainerId === "all" ? true : a.entrenadorId === selectedTrainerId;
    const matchesActive = a.activo === true;
    const socioFullName = `${a.socio.nombres || ""} ${a.socio.apellidos || ""}`.toLowerCase();
    const matchesSearch =
      socioFullName.includes(searchTerm.toLowerCase()) ||
      a.socio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.socio.numeroDocumento.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTrainer && matchesActive && matchesSearch;
  });

  // Filtrado general para la pestaña "Gestión de Asignaciones"
  const generalAssignments = initialAssignments.filter((a) => {
    const socioFullName = `${a.socio.nombres || ""} ${a.socio.apellidos || ""}`.toLowerCase();
    const trainerFullName = `${a.entrenador.nombres || ""} ${a.entrenador.apellidos || ""}`.toLowerCase();
    const matchesSearch =
      socioFullName.includes(searchTerm.toLowerCase()) ||
      trainerFullName.includes(searchTerm.toLowerCase()) ||
      a.socio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.socio.numeroDocumento.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "activos"
        ? a.activo === true
        : a.activo === false;

    return matchesSearch && matchesStatus;
  });

  // Handlers para acciones
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.socioId) {
      toast.error("Seleccione un socio.");
      return;
    }
    if (!assignForm.entrenadorId) {
      toast.error("Seleccione un entrenador.");
      return;
    }

    startTransition(async () => {
      const res = await assignTrainerToMember({
        socioId: assignForm.socioId,
        entrenadorId: assignForm.entrenadorId,
        fechaInicio: new Date(assignForm.fechaInicio || new Date()),
        mesesPlan: Number(assignForm.mesesPlan),
      });

      if (res.success) {
        toast.success("Entrenador asignado exitosamente.");
        setShowAssignModal(false);
        setAssignForm({
          socioId: "",
          entrenadorId: currentUser.personalId || (trainers[0]?.id || ""),
          fechaInicio: new Date().toISOString().split("T")[0],
          mesesPlan: 1,
        });
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo asignar el entrenador.");
      }
    });
  };

  const handleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTarget) return;
    if (!changeForm.nuevoEntrenadorId) {
      toast.error("Seleccione el nuevo entrenador.");
      return;
    }
    if (changeForm.nuevoEntrenadorId === changeTarget.entrenadorId) {
      toast.error("El nuevo entrenador debe ser diferente al actual.");
      return;
    }

    startTransition(async () => {
      const res = await changeTrainerAssignment({
        socioId: changeTarget.socioId,
        nuevoEntrenadorId: changeForm.nuevoEntrenadorId,
        fechaInicio: new Date(changeForm.fechaInicio || new Date()),
        mesesPlan: Number(changeForm.mesesPlan),
      });

      if (res.success) {
        toast.success("Cambio de entrenador realizado correctamente.");
        setChangeTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo cambiar el entrenador.");
      }
    });
  };

  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endTarget) return;

    startTransition(async () => {
      const res = await endTrainerAssignment({
        asignacionId: endTarget.id,
        fechaFin: new Date(endDate || new Date()),
      });

      if (res.success) {
        toast.success("Asignación finalizada correctamente.");
        setEndTarget(null);
        router.refresh();
      } else {
        toast.error(res.error || "No se pudo finalizar la asignación.");
      }
    });
  };

  const handleOpenHistory = async (socio: {
    id: string;
    nombres: string | null;
    apellidos: string | null;
    codigo: string;
  }) => {
    setHistoryTarget(socio);
    setLoadingHistory(true);
    try {
      const res = await getMemberTrainerHistory(socio.id);
      if (res.success) {
        setHistoryData(res.historial || []);
      } else {
        toast.error(res.error || "Error al cargar historial.");
        setHistoryData([]);
      }
    } catch {
      toast.error("Error al cargar historial.");
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Identificación del Usuario */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/70 border border-zinc-800/80 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Planificación Personalizada</h1>
              <p className="text-zinc-400 text-sm">
                Gestión y seguimiento de socios asignados a entrenadores personales.
              </p>
            </div>
          </div>
        </div>

        {/* Acceso para Asignar (Solo con permisos) */}
        {currentUser.canManage && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl transition-all shadow-lg shadow-yellow-500/10 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Asignar Entrenador
          </button>
        )}
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Socios con Entrenador
            </p>
            <p className="text-2xl font-black text-white mt-1">
              {initialAssignments.filter((a) => a.activo).length}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Entrenadores Activos
            </p>
            <p className="text-2xl font-black text-yellow-500 mt-1">{trainers.length}</p>
          </div>
          <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Historial Total Asignaciones
            </p>
            <p className="text-2xl font-black text-zinc-300 mt-1">{initialAssignments.length}</p>
          </div>
          <div className="p-3 bg-zinc-800 text-zinc-400 rounded-xl">
            <History className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          onClick={() => setActiveTab("mis-socios")}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "mis-socios"
              ? "border-yellow-500 text-yellow-500"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Mis Socios (Vista Entrenador)
        </button>

        {currentUser.canManage && (
          <button
            onClick={() => setActiveTab("gestion")}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "gestion"
                ? "border-yellow-500 text-yellow-500"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Gestión de Asignaciones (Administración)
          </button>
        )}
      </div>

      {/* CONTENIDO TAB 1: MIS SOCIOS */}
      {activeTab === "mis-socios" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            {/* Selector de Entrenador (Para administradores o para elegir qué entrenador ver) */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                Entrenador:
              </label>
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
              >
                {currentUser.canManage && <option value="all">Todos los Entrenadores</option>}
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombres} {t.apellidos} ({t.rol})
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda en tiempo real */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por socio, DNI o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Listado de Socios Activos */}
          {myTrainerAssignments.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">No hay socios asignados</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto mt-1">
                No se encontraron socios activos para el entrenador o filtro seleccionado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTrainerAssignments.map((a) => (
                <div
                  key={a.id}
                  className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header de la tarjeta */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                          {a.socio.codigo}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1.5 line-clamp-1">
                          {a.socio.nombres} {a.socio.apellidos}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {a.socio.tipoDocumento}: {a.socio.numeroDocumento}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Activo
                      </span>
                    </div>

                    {/* Detalles del Plan Personalizado */}
                    <div className="bg-zinc-950/60 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>Entrenador:</span>
                        <span className="text-zinc-200 font-medium">
                          {a.entrenador.nombres} {a.entrenador.apellidos}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Inicio:</span>
                        <span className="text-zinc-200 font-medium">
                          {safeFormatDate(a.fechaInicio)}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Duración plan:</span>
                        <span className="text-yellow-500 font-semibold">{a.mesesPlan} mes(es)</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del Socio */}
                  <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/socios/${a.socio.id}`}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                        title="Ver Perfil del Socio"
                      >
                        <FileText className="w-3.5 h-3.5" /> Perfil
                      </Link>
                      <Link
                        href={`/socios/${a.socio.id}?tab=medidas`}
                        className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                        title="Ver Medidas Físicas y Gráficos"
                      >
                        <Activity className="w-3.5 h-3.5" /> Medidas
                      </Link>
                    </div>

                    <button
                      onClick={() => handleOpenHistory(a.socio)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Ver Historial de Entrenadores"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 2: GESTIÓN DE ASIGNACIONES (ADMIN) */}
      {activeTab === "gestion" && currentUser.canManage && (
        <div className="space-y-4">
          {/* Filtros de Gestión */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 font-medium">Estado:</label>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
              >
                <option value="all">Todas las asignaciones</option>
                <option value="activos">Solo Activas</option>
                <option value="historicos">Solo Históricas</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por socio, entrenador o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabla de Asignaciones */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">Socio</th>
                  <th className="px-5 py-3.5">Entrenador</th>
                  <th className="px-5 py-3.5">Fecha Inicio</th>
                  <th className="px-5 py-3.5">Fecha Fin</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {generalAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-zinc-500">
                      No se encontraron registros de asignaciones.
                    </td>
                  </tr>
                ) : (
                  generalAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">
                          {a.socio.nombres} {a.socio.apellidos}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {a.socio.codigo} • {a.socio.numeroDocumento}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-zinc-200 font-medium">
                          {a.entrenador.nombres} {a.entrenador.apellidos}
                        </div>
                        <div className="text-xs text-zinc-500">{a.entrenador.rol}</div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-300">{safeFormatDate(a.fechaInicio)}</td>
                      <td className="px-5 py-3.5 text-zinc-300">{safeFormatDate(a.fechaFin)}</td>
                      <td className="px-5 py-3.5 font-medium text-yellow-500">
                        {a.mesesPlan} mes(es)
                      </td>
                      <td className="px-5 py-3.5">
                        {a.activo ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Finalizado
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.activo && (
                            <>
                              <button
                                onClick={() => {
                                  setChangeTarget(a);
                                  setChangeForm({
                                    nuevoEntrenadorId: "",
                                    fechaInicio: new Date().toISOString().split("T")[0],
                                    mesesPlan: a.mesesPlan,
                                  });
                                }}
                                className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-500 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                title="Cambiar Entrenador"
                              >
                                <ArrowRightLeft className="w-3 h-3" /> Cambiar
                              </button>
                              <button
                                onClick={() => {
                                  setEndTarget(a);
                                  setEndDate(new Date().toISOString().split("T")[0]);
                                }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                                title="Finalizar Asignación"
                              >
                                <XCircle className="w-3 h-3" /> Finalizar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenHistory(a.socio)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Ver Historial"
                          >
                            <History className="w-4 h-4" />
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
      )}

      {/* MODAL 1: ASIGNAR ENTRENADOR */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-yellow-500" />
                Asignar Entrenador a Socio
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
              {/* Selección de Socio */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Socio <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.socioId}
                  onChange={(e) => setAssignForm({ ...assignForm, socioId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Socio --</option>
                  {members.map((m) => {
                    const currentTrainer = m.asignacionesEntrenador?.[0]?.entrenador;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.nombres} {m.apellidos} ({m.codigo}){" "}
                        {currentTrainer ? `[Activo con: ${currentTrainer.nombres}]` : "[Sin asignar]"}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selección de Entrenador */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Entrenador Personal <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.entrenadorId}
                  onChange={(e) => setAssignForm({ ...assignForm, entrenadorId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Entrenador --</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombres} {t.apellidos} ({t.rol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha de Inicio y Meses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={assignForm.fechaInicio}
                    onChange={(e) => setAssignForm({ ...assignForm, fechaInicio: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Meses del Plan <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={36}
                    value={assignForm.mesesPlan}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, mesesPlan: parseInt(e.target.value) || 1 })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CAMBIAR ENTRENADOR */}
      {changeTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-yellow-500" />
                Cambiar Entrenador Asignado
              </h3>
              <button onClick={() => setChangeTarget(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Al cambiar de entrenador se finalizará automáticamente la asignación actual de{" "}
                  <strong>
                    {changeTarget.entrenador.nombres} {changeTarget.entrenador.apellidos}
                  </strong>{" "}
                  y se creará un nuevo registro activo en el historial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Socio</label>
                <input
                  disabled
                  type="text"
                  value={`${changeTarget.socio.nombres} ${changeTarget.socio.apellidos} (${changeTarget.socio.codigo})`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Nuevo Entrenador <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={changeForm.nuevoEntrenadorId}
                  onChange={(e) =>
                    setChangeForm({ ...changeForm, nuevoEntrenadorId: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Nuevo Entrenador --</option>
                  {trainers
                    .filter((t) => t.id !== changeTarget.entrenadorId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombres} {t.apellidos} ({t.rol})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={changeForm.fechaInicio}
                    onChange={(e) =>
                      setChangeForm({ ...changeForm, fechaInicio: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Meses del Plan <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={36}
                    value={changeForm.mesesPlan}
                    onChange={(e) =>
                      setChangeForm({ ...changeForm, mesesPlan: parseInt(e.target.value) || 1 })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangeTarget(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold transition-colors flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FINALIZAR ASIGNACIÓN */}
      {endTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Finalizar Asignación
              </h3>
              <button onClick={() => setEndTarget(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEndSubmit} className="p-5 space-y-4">
              <p className="text-sm text-zinc-300">
                ¿Está seguro de que desea finalizar la asignación de{" "}
                <strong>
                  {endTarget.entrenador.nombres} {endTarget.entrenador.apellidos}
                </strong>{" "}
                para el socio{" "}
                <strong>
                  {endTarget.socio.nombres} {endTarget.socio.apellidos}
                </strong>
                ?
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Fecha de Cierre / Finalización
                </label>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEndTarget(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Finalizar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORIAL DE ENTRENADORES */}
      {historyTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-yellow-500" />
                  Historial de Entrenadores
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Socio: {historyTarget.nombres} {historyTarget.apellidos} ({historyTarget.codigo})
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                  <span>Cargando historial...</span>
                </div>
              ) : historyData.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">
                  No se encontraron asignaciones históricas para este socio.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                  {historyData.map((h) => (
                    <div key={h.id} className="relative">
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${
                          h.activo ? "bg-green-500" : "bg-zinc-600"
                        }`}
                      />
                      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-white">
                            {h.entrenador.nombres} {h.entrenador.apellidos}
                          </span>
                          {h.activo ? (
                            <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                              Actual
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                              Finalizado
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-400">Rol: {h.entrenador.rol}</p>
                        <div className="flex items-center gap-4 text-zinc-400 pt-1">
                          <span>
                            Desde: <strong className="text-zinc-200">{safeFormatDate(h.fechaInicio)}</strong>
                          </span>
                          <span>
                            Hasta: <strong className="text-zinc-200">{safeFormatDate(h.fechaFin)}</strong>
                          </span>
                          <span>
                            Plan: <strong className="text-yellow-500">{h.mesesPlan} mes(es)</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex justify-end">
              <button
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
