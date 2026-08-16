"use client";

import { History, Sparkles, User, Settings, CheckCircle2, XCircle, Archive, ShieldCheck, Layers } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  fecha: string | Date;
  tipoEvento: string;
  origen: "IA" | "ENTRENADOR" | "SISTEMA";
  titulo: string;
  descripcion: string;
  usuario: string;
}

interface Props {
  events: TimelineEvent[];
}

export default function HistorialOperativoTimeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-base-100 rounded-2xl border border-base-200 p-6 text-center shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center mx-auto text-base-content/40 mb-2">
          <History className="w-5 h-5" />
        </div>
        <p className="text-xs text-base-content/60">Sin eventos operativos registrados aún en el historial.</p>
      </div>
    );
  }

  const getOriginBadge = (origen: string) => {
    switch (origen) {
      case "IA":
        return (
          <span className="badge badge-secondary badge-xs gap-1 font-bold">
            <Sparkles className="w-2.5 h-2.5" /> IA
          </span>
        );
      case "ENTRENADOR":
        return (
          <span className="badge badge-primary badge-xs gap-1 font-bold">
            <User className="w-2.5 h-2.5" /> Entrenador
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral badge-xs gap-1 font-bold">
            <Settings className="w-2.5 h-2.5" /> Sistema
          </span>
        );
    }
  };

  return (
    <div className="bg-base-100 rounded-2xl border border-base-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black">Historial Operativo y Trazabilidad</h4>
            <p className="text-[11px] opacity-60">Registro histórico cronológico e inmutable de versiones y cambios del plan.</p>
          </div>
        </div>
        <span className="badge badge-ghost badge-sm text-[11px] font-mono font-bold">
          {events.length} evento(s)
        </span>
      </div>

      <div className="relative border-l-2 border-base-200 ml-4 space-y-4 py-1">
        {events.map((ev) => {
          const dateObj = new Date(ev.fecha);
          const dateStr = format(dateObj, "dd/MM/yyyy HH:mm", { locale: es });

          return (
            <div key={ev.id} className="relative pl-6 group">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-base-100 border-2 border-primary group-hover:bg-primary transition-colors" />

              <div className="bg-base-200/40 p-3 rounded-xl hover:bg-base-200/70 transition-all space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getOriginBadge(ev.origen)}
                    <span className="font-bold text-xs">{ev.tipoEvento}</span>
                  </div>
                  <span className="text-[10px] opacity-60 font-mono">{dateStr}</span>
                </div>

                <h5 className="font-semibold text-xs text-base-content mt-1">{ev.titulo}</h5>
                <p className="text-[11px] text-base-content/70">{ev.descripcion}</p>

                <div className="flex items-center justify-between pt-1 text-[10px] opacity-60 border-t border-base-200/50 mt-2">
                  <span>Autor: {ev.usuario}</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-success" /> Registrado en AuditLog
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
