import PersonalClient from "./PersonalClient";
import { getPersonal } from "@/app/actions/personal";

export const metadata = {
  title: "Gestión de Personal | Mr. Gym",
};

export default async function PersonalPage() {
  const { personal } = await getPersonal();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">Gestión de Personal</h1>
      <PersonalClient initialData={personal || []} />
    </div>
  );
}
