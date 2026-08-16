import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import AsignacionesClient from "./AsignacionesClient";
import {
  getAvailableTrainers,
  getAllAssignments,
  getMembersForAssignment,
} from "@/app/actions/asignacion-entrenador";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestión de Socios del Entrenador | Mr. Gym",
  description: "Panel de consulta y gestión de socios asignados a entrenadores personales.",
};

export default async function AsignacionesPage() {
  const session = await requireAuth();

  // Obtener usuario completo con su relación personalId / personal
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      personal: {
        select: {
          id: true,
          codigo: true,
          nombres: true,
          apellidos: true,
          rol: true,
          activo: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const permissions = (user.permissions as string[]) || [];
  const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
  const canManage = isAdmin || permissions.includes("PLANES_PERSONALIZADOS_GESTIONAR");

  // Cargar datos iniciales
  const [trainersRes, assignmentsRes, membersRes] = await Promise.all([
    getAvailableTrainers(),
    getAllAssignments(),
    getMembersForAssignment(),
  ]);

  const trainers = trainersRes.success ? trainersRes.entrenadores || [] : [];
  const assignments = assignmentsRes.success ? assignmentsRes.asignaciones || [] : [];
  const members = membersRes.success ? membersRes.socios || [] : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <AsignacionesClient
        currentUser={{
          id: user.id,
          username: user.username,
          role: user.role,
          personalId: user.personalId,
          personal: user.personal,
          canManage,
        }}
        trainers={trainers}
        initialAssignments={assignments}
        members={members}
      />
    </div>
  );
}
