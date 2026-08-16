import { requirePermission } from "@/lib/auth-utils";
import { getExecutiveDashboardMetrics } from "@/app/actions/admin-dashboard";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function ExecutiveDashboardPage() {
  // Verificación server-side de autorización
  await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

  // Obtener métricas iniciales
  const metricsRes = await getExecutiveDashboardMetrics({ periodo: "30d" });

  return <DashboardClient initialMetrics={metricsRes} />;
}
