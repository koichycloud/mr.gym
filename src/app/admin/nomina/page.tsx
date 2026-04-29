import NominaClient from "./NominaClient";
import { getPersonal } from "@/app/actions/personal";
import { getAdelantosPendientes, getPagosRecientes } from "@/app/actions/nomina-personal";

export const metadata = {
  title: "Nómina y Pagos | Mr. Gym",
};

export default async function NominaPage() {
  const { personal } = await getPersonal();
  const { adelantos } = await getAdelantosPendientes();
  const { pagos } = await getPagosRecientes();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Nómina y Pagos</h1>
      <NominaClient 
        initialPersonal={personal || []} 
        initialAdelantos={adelantos || []} 
        initialPagos={pagos || []}
      />
    </div>
  );
}
