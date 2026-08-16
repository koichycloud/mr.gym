"use client";

import { Activity, ArrowUpRight, Scale, Ruler, HeartPulse } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Props {
  socioId: string;
  ultimaMedida: any | null;
}

export default function MedidasFisicasSummaryCard({ socioId, ultimaMedida }: Props) {
  if (!ultimaMedida) {
    return (
      <div className="bg-base-100 rounded-2xl border border-base-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-xs">Sin medidas físicas registradas</h5>
            <p className="text-[11px] opacity-60">Registre evaluaciones antropométricas para hacer seguimiento.</p>
          </div>
        </div>
        <Link
          href={`/socios/${socioId}?tab=medidas`}
          className="btn btn-primary btn-outline btn-xs gap-1 text-[11px] rounded-xl"
        >
          <span>Ver evolución física</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-2xl border border-base-200 p-4 shadow-sm hover:shadow-md transition-all space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-secondary/10 text-secondary rounded-xl">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-bold text-xs flex items-center gap-1.5">
              <span>Última Evaluación Física</span>
              <span className="badge badge-neutral badge-xs font-mono">
                {ultimaMedida.fecha ? format(new Date(ultimaMedida.fecha), "dd/MM/yyyy") : "N/A"}
              </span>
            </h5>
            <p className="text-[10px] opacity-60">Resumen antropométrico actual del socio</p>
          </div>
        </div>
        <Link
          href={`/socios/${socioId}?tab=medidas`}
          className="btn btn-secondary btn-ghost btn-xs gap-1 text-[11px] font-bold text-secondary"
        >
          <span>Ver evolución física</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
        <div className="bg-base-200/50 p-2 rounded-xl">
          <span className="opacity-60 block text-[10px]">Peso</span>
          <strong className="text-base-content text-xs">{ultimaMedida.peso ? `${ultimaMedida.peso} kg` : "N/A"}</strong>
        </div>
        <div className="bg-base-200/50 p-2 rounded-xl">
          <span className="opacity-60 block text-[10px]">Talla/Altura</span>
          <strong className="text-base-content text-xs">{ultimaMedida.altura ? `${ultimaMedida.altura} cm` : "N/A"}</strong>
        </div>
        <div className="bg-base-200/50 p-2 rounded-xl">
          <span className="opacity-60 block text-[10px]">% Grasa</span>
          <strong className="text-primary text-xs">{ultimaMedida.porcentajeGrasa ? `${ultimaMedida.porcentajeGrasa}%` : "N/A"}</strong>
        </div>
        <div className="bg-base-200/50 p-2 rounded-xl">
          <span className="opacity-60 block text-[10px]">% Músclo</span>
          <strong className="text-secondary text-xs">{ultimaMedida.porcentajeMusculo ? `${ultimaMedida.porcentajeMusculo}%` : "N/A"}</strong>
        </div>
        <div className="bg-base-200/50 p-2 rounded-xl">
          <span className="opacity-60 block text-[10px]">Cintura</span>
          <strong className="text-base-content text-xs">{ultimaMedida.cintura ? `${ultimaMedida.cintura} cm` : "N/A"}</strong>
        </div>
        <div className="bg-base-200/50 p-2 rounded-xl">
          <span className="opacity-60 block text-[10px]">Pecho</span>
          <strong className="text-base-content text-xs">{ultimaMedida.pecho ? `${ultimaMedida.pecho} cm` : "N/A"}</strong>
        </div>
      </div>

      {(ultimaMedida.biceps || ultimaMedida.gluteos || ultimaMedida.cuadriceps || ultimaMedida.pantorrillas) && (
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-base-200/30 p-2 rounded-xl border border-base-200">
          <div>
            <span className="opacity-60 block">Bíceps:</span>
            <strong>{ultimaMedida.biceps ? `${ultimaMedida.biceps} cm` : "N/A"}</strong>
          </div>
          <div>
            <span className="opacity-60 block">Glúteos:</span>
            <strong>{ultimaMedida.gluteos ? `${ultimaMedida.gluteos} cm` : "N/A"}</strong>
          </div>
          <div>
            <span className="opacity-60 block">Cuádriceps:</span>
            <strong>{ultimaMedida.cuadriceps ? `${ultimaMedida.cuadriceps} cm` : "N/A"}</strong>
          </div>
          <div>
            <span className="opacity-60 block">Pantorrillas:</span>
            <strong>{ultimaMedida.pantorrillas ? `${ultimaMedida.pantorrillas} cm` : "N/A"}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
