import { requirePermission } from "@/lib/auth-utils";
import { getAIObservabilityMetrics, getGeneracionesIAHistory } from "@/app/actions/ai-observability";
import IAObservabilityClient from "./IAObservabilityClient";

export const metadata = {
  title: "Monitoreo de IA y Observabilidad | Mr. Gym",
  description: "Tablero administrativo de control, métricas de rendimiento y consumo de tokens del motor de planificación IA.",
};

export default async function IAObservabilityPage() {
  await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

  const [metricsRes, historyRes] = await Promise.all([
    getAIObservabilityMetrics({}),
    getGeneracionesIAHistory({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" }),
  ]);

  const initialMetrics = metricsRes.success ? metricsRes.data : null;
  const initialHistory = historyRes.success ? historyRes.data : null;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <IAObservabilityClient
        initialMetrics={initialMetrics}
        initialHistory={initialHistory}
      />
    </div>
  );
}
