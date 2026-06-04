import { notFound } from "next/navigation";
import { getPersonalById } from "@/app/actions/personal";
import prisma from "@/lib/prisma";
import PersonalProfileClient from "./PersonalProfileClient";

export const metadata = {
  title: "Perfil de Personal | Mr. Gym",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PersonalProfilePage({ params }: PageProps) {
  const { id } = await params;

  const { success, personal } = await getPersonalById(id);

  if (!success || !personal) {
    notFound();
  }

  // Fetch up to 100 attendance records to display a rich history
  const asistencias = await prisma.asistenciaPersonal.findMany({
    where: { personalId: id },
    orderBy: { fecha: "desc" },
    take: 100,
  });

  // Convert Date fields to JSON-safe formats if necessary, though Prisma dates work fine in Next.js Server Components.
  // We'll pass them directly.
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PersonalProfileClient personal={personal} initialAsistencias={asistencias} />
    </div>
  );
}
