"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Users,
  ChevronRight,
  Loader2,
  CalendarCheck,
  AlertCircle,
  X,
  Phone,
} from "lucide-react";
import {
  getAgendaSemanalEntrenador,
  actualizarHorarioSocioEntrenador,
  AgendaSemanalResultado,
  SesionAgenda,
} from "@/app/actions/agenda-entrenador";
import Link from "next/link";

interface Props {
  entrenadorId: string;
  canManage: boolean;
}

const DIAS_SEMANA_OPCIONES = [
  { id: "LUNES", label: "Lunes" },
  { id: "MARTES", label: "Martes" },
  { id: "MIERCOLES", label: "Miércoles" },
  { id: "JUEVES", label: "Jueves" },
  { id: "VIERNES", label: "Viernes" },
  { id: "SABADO", label: "Sábado" },
  { id: "DOMINGO", label: "Domingo" },
];

export default function AgendaEntrenadorSection({ entrenadorId, canManage }: Props) {
  const [agenda, setAgenda] = useState<AgendaSemanalResultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal para editar horario
  const [editingSession, setEditingSession] = useState<{
    perfilId: string;
    socioNombre: string;
    socioCodigo: string;
    dias: string[];
    horaInicio: string;
    duracion: number;
  } | null>(null);

  const loadAgenda = async () => {
    if (!entrenadorId || entrenadorId === "all") {
      setAgenda(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getAgendaSemanalEntrenador(entrenadorId);
      if (res.success && res.data) {
        setAgenda(res.data);
      } else {
        toast.error(res.error || "No se pudo cargar la agenda del entrenador.");
        setAgenda(null);
      }
    } catch (err: any) {
      toast.error("Error de conexión al cargar la agenda.");
      setAgenda(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, [entrenadorId]);

  const handleOpenEdit = (sesion: SesionAgenda) => {
    // Buscar todos los días que este perfil tiene agendados
    const diasDelSocio: string[] = [];
    if (agenda) {
      agenda.diasSemana.forEach((d) => {
        if (d.sesiones.some((s) => s.perfilId === sesion.perfilId)) {
          diasDelSocio.push(d.dia);
        }
      });
    }

    setEditingSession({
      perfilId: sesion.perfilId,
      socioNombre: sesion.socioNombre,
      socioCodigo: sesion.socioCodigo,
      dias: diasDelSocio.length > 0 ? diasDelSocio : [sesion.dia],
      horaInicio: sesion.horaInicio,
      duracion: sesion.duracionMinutos,
    });
  };

  const handleOpenEditFromPending = (socio: AgendaSemanalResultado["sociosPendientes"][0]) => {
    if (!socio.perfilId) {
      toast.info("Este socio no cuenta con una evaluación creada. Diríjase a su ficha para crearla.");
      return;
    }

    setEditingSession({
      perfilId: socio.perfilId,
      socioNombre: socio.socioNombre,
      socioCodigo: socio.socioCodigo,
      dias: ["LUNES", "MIERCOLES", "VIERNES"],
      horaInicio: "08:00",
      duracion: 60,
    });
  };

  const handleSaveHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    if (editingSession.dias.length === 0) {
      toast.error("Debe seleccionar al menos un día de la semana.");
      return;
    }
    if (!editingSession.horaInicio) {
      toast.error("Debe ingresar una hora válida (ej: 08:00).");
      return;
    }

    startTransition(async () => {
      const res = await actualizarHorarioSocioEntrenador({
        perfilId: editingSession.perfilId,
        diasPreferidos: editingSession.dias,
        horarioPreferido: editingSession.horaInicio,
        duracionMinutos: Number(editingSession.duracion),
      });

      if (res.success) {
        toast.success("Horario coordinado actualizado correctamente.");
        setEditingSession(null);
        await loadAgenda();
      } else {
        toast.error(res.error || "No se pudo actualizar el horario.");
      }
    });
  };

  const toggleDia = (diaId: string) => {
    if (!editingSession) return;
    const exists = editingSession.dias.includes(diaId);
    setEditingSession({
      ...editingSession,
      dias: exists
        ? editingSession.dias.filter((d) => d !== diaId)
        : [...editingSession.dias, diaId],
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-base-100 rounded-3xl border border-base-200 shadow-sm space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm opacity-70">Cargando agenda semanal del entrenador...</p>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="p-8 text-center bg-base-100 rounded-3xl border border-base-200 shadow-sm space-y-2">
        <Calendar className="w-10 h-10 text-base-content/40 mx-auto" />
        <p className="text-sm font-semibold">Seleccione un entrenador para visualizar su agenda semanal.</p>
      </div>
    );
  }

  const { metricasCarga, diasSemana, sociosPendientes, entrenador } = agenda;

  return (
    <div className="space-y-6">
      {/* 1. RESUMEN DE CAPACIDAD Y CARGA SEMANAL */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold opacity-70 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Socios Asignados
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black">{metricasCarga.totalSociosAsignados}</span>
            <span className="text-xs opacity-60 ml-1.5">activos</span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold opacity-70 flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-success" /> Con Horario
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-success">{metricasCarga.totalSociosConHorario}</span>
            <span className="text-xs opacity-60 ml-1.5">coordinados</span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold opacity-70 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-warning" /> Pendientes Horario
          </span>
          <div className="mt-2">
            <span className={`text-2xl font-black ${metricasCarga.totalSociosPendientes > 0 ? "text-warning" : "opacity-60"}`}>
              {metricasCarga.totalSociosPendientes}
            </span>
            <span className="text-xs opacity-60 ml-1.5">sin agendar</span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold opacity-70 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-info" /> Sesiones / Semana
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-info">{metricasCarga.totalSesionesSemanales}</span>
            <span className="text-xs opacity-60 ml-1.5">sesiones</span>
          </div>
        </div>

        <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-xs font-semibold opacity-70 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-secondary" /> Carga Semanal
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black">{metricasCarga.horasTotalesSemanales}</span>
            <span className="text-xs opacity-60 ml-1.5">horas aprox.</span>
          </div>
        </div>
      </div>

      {/* 2. ALERTA DE CONFLICTOS SI EXISTEN */}
      {metricasCarga.totalConflictos > 0 && (
        <div className="alert alert-warning shadow-md rounded-2xl text-xs flex items-start gap-3 border border-warning/30 bg-warning/10 text-warning-content">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">Advertencia de Superposición de Horarios</span>
            <span>
              Se detectaron {metricasCarga.totalConflictos} sesión(es) con conflicto o traslape de horario en la agenda de este entrenador. Revise las tarjetas marcadas en rojo a continuación.
            </span>
          </div>
        </div>
      )}

      {/* 3. AGENDA SEMANAL DISTRIBUIDA (LUNES A DOMINGO) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Distribución Semanal de {entrenador.nombres} {entrenador.apellidos}
          </h3>
          <span className="text-xs opacity-60">Lunes a Domingo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {diasSemana.map((diaInfo) => (
            <div
              key={diaInfo.dia}
              className={`bg-base-100 rounded-2xl border ${
                diaInfo.tieneConflictos ? "border-error/50 bg-error/5" : "border-base-200"
              } shadow-sm flex flex-col min-h-[320px] overflow-hidden`}
            >
              {/* Cabecera del Día */}
              <div className="p-3 border-b border-base-200 bg-base-200/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs">{diaInfo.dia}</span>
                  <span className="text-[10px] block opacity-60 font-mono">
                    {diaInfo.totalSesionesDia} ses. ({diaInfo.totalHorasDia}h)
                  </span>
                </div>
                {diaInfo.tieneConflictos && (
                  <span className="badge badge-error badge-xs text-white" title="Conflicto detectado">
                    !
                  </span>
                )}
              </div>

              {/* Lista de Sesiones del Día */}
              <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[500px]">
                {diaInfo.sesiones.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-8">
                    <span className="text-[11px] opacity-40 italic">Libre</span>
                  </div>
                ) : (
                  diaInfo.sesiones.map((s) => (
                    <div
                      key={s.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                        s.tieneConflicto
                          ? "bg-error/10 border-error text-error-content shadow-sm"
                          : "bg-base-200/50 hover:bg-base-200 border-base-200"
                      }`}
                    >
                      {/* Rango de Horario */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-70" />
                          {s.horaInicio} – {s.horaFin}
                        </span>
                        <span className="badge badge-ghost badge-xs font-mono">{s.duracionMinutos}m</span>
                      </div>

                      {/* Socio */}
                      <div>
                        <Link
                          href={`/socios/${s.socioId}`}
                          className="font-bold hover:text-primary transition-colors line-clamp-1 block"
                          title="Ver ficha del socio"
                        >
                          {s.socioNombre}
                        </Link>
                        <span className="text-[10px] opacity-60 font-mono block">Cod: {s.socioCodigo}</span>
                      </div>

                      {/* Objetivo y Nivel */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <span className="badge badge-primary badge-outline badge-xs text-[9px] py-1">
                          {s.objetivoPrincipal}
                        </span>
                        <span className="badge badge-ghost badge-xs text-[9px] opacity-70">{s.nivel}</span>
                      </div>

                      {/* Alerta de Conflicto en Tarjeta */}
                      {s.tieneConflicto && (
                        <div className="pt-1 text-[10px] text-error font-medium space-y-0.5 border-t border-error/20">
                          {s.detallesConflicto.map((det, idx) => (
                            <p key={idx} className="flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" /> {det}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Botón Editar Horario */}
                      <div className="pt-1 border-t border-base-content/10 flex justify-end">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="btn btn-ghost btn-xs text-primary gap-1 text-[10px] h-6 min-h-0 px-2"
                        >
                          <Edit3 className="w-3 h-3" /> Editar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. SOCIOS PENDIENTES DE HORARIO COORDINADO */}
      {sociosPendientes.length > 0 && (
        <div className="bg-base-100 rounded-2xl border border-warning/30 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Socios Asignados Pendientes de Coordinación de Horario ({sociosPendientes.length})
            </h4>
            <span className="text-xs opacity-60">Requieren definir días o turno</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sociosPendientes.map((p) => (
              <div
                key={p.socioId}
                className="bg-base-200/50 p-3 rounded-xl border border-base-200 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <Link
                    href={`/socios/${p.socioId}`}
                    className="font-bold hover:text-primary transition-colors block"
                  >
                    {p.socioNombre}
                  </Link>
                  <span className="text-[11px] opacity-60 font-mono">Cod: {p.socioCodigo}</span>
                  <span className="badge badge-warning badge-xs block text-[9px] py-1 mt-1">
                    {p.motivoPendiente}
                  </span>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  {p.perfilId ? (
                    <button
                      onClick={() => handleOpenEditFromPending(p)}
                      className="btn btn-primary btn-xs gap-1"
                    >
                      <Clock className="w-3 h-3" /> Asignar Horario
                    </button>
                  ) : (
                    <Link href={`/socios/${p.socioId}`} className="btn btn-outline btn-xs gap-1">
                      <User className="w-3 h-3" /> Crear Perfil
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODAL DE EDICIÓN DE HORARIO */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-base-200 flex items-center justify-between bg-base-200/50">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Coordinar Horario de Entrenamiento
                </h3>
                <p className="text-xs opacity-70 mt-0.5">
                  Socio: <span className="font-bold">{editingSession.socioNombre}</span> ({editingSession.socioCodigo})
                </p>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHorario} className="p-5 space-y-4 text-xs">
              {/* Selección de Días */}
              <div className="space-y-2">
                <label className="font-bold opacity-80 block">
                  Días de la semana acordados ({editingSession.dias.length} días seleccionados)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DIAS_SEMANA_OPCIONES.map((opt) => {
                    const isSelected = editingSession.dias.includes(opt.id);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => toggleDia(opt.id)}
                        className={`btn btn-sm ${
                          isSelected ? "btn-primary text-white" : "btn-outline border-base-300"
                        } text-xs font-semibold`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hora de Inicio y Duración */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold opacity-80 block">Hora de inicio habitual</label>
                  <input
                    type="time"
                    value={editingSession.horaInicio}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, horaInicio: e.target.value })
                    }
                    className="input input-bordered input-sm w-full font-mono font-bold"
                    required
                  />
                  <span className="text-[10px] opacity-60 block">Ej. 07:00, 08:30, 18:00</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold opacity-80 block">Duración de la sesión (minutos)</label>
                  <select
                    value={editingSession.duracion}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, duracion: Number(e.target.value) })
                    }
                    className="select select-bordered select-sm w-full font-bold"
                  >
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos (Estándar)</option>
                    <option value={75}>75 minutos</option>
                    <option value={90}>90 minutos</option>
                    <option value={120}>120 minutos</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-base-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="btn btn-ghost btn-sm"
                  disabled={isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm text-white gap-1.5"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Guardar Horario
                    </>
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
