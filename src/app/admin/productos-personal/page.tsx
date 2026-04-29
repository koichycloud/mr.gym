import ProductosPersonalClient from "./ProductosPersonalClient";
import { getProductosPersonal } from "@/app/actions/productos-personal";

export const metadata = {
  title: "Catálogo de Productos para Personal | Mr. Gym",
};

export default async function ProductosPersonalPage() {
  const { productos } = await getProductosPersonal();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Catálogo de Productos (Personal)</h1>
      <ProductosPersonalClient initialData={productos || []} />
    </div>
  );
}
