import { requirePermission } from "@/lib/auth-utils";
import {
  getFinancialMetrics,
  getCobranzasStatus,
  getFinancialTransactionsHistory,
} from "@/app/actions/finanzas";
import FinanzasClient from "./FinanzasClient";

export const metadata = {
  title: "Gestión Financiera y Caja — Mr. Gym",
  description: "Centro de control de caja diaria, ingresos, cobranzas y conciliación financiera.",
};

export default async function FinanzasPage() {
  await requirePermission("PLANES_PERSONALIZADOS_GESTIONAR");

  const [initialMetrics, initialCobranzas, initialTransactions] = await Promise.all([
    getFinancialMetrics({ periodo: "today" }),
    getCobranzasStatus(15),
    getFinancialTransactionsHistory({ page: 1, pageSize: 10 }),
  ]);

  return (
    <FinanzasClient
      initialMetrics={initialMetrics}
      initialCobranzas={initialCobranzas}
      initialTransactions={initialTransactions}
    />
  );
}
