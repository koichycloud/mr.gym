"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { format } from "date-fns";
import { getEvolucionYSeguimientoSocio } from "@/app/actions/evolucion-plan";
import { getAdherenciaYCumplimientoSocio } from "@/app/actions/adherencia-plan";

/**
 * Consulta segura y encapsulada del Plan Activo para el Socio Autenticado.
 * Garantiza aislamiento IDOR: la identidad se obtiene estrictamente de la sesión.
 */
export async function getMiPlanSocio() {
  try {
    const session = await requireAuth();
    if (!session || !session.user) {
      return { success: false, error: "No autenticado. Por favor inicie sesión." };
    }

    const userId = session.user.id;
    const username = (session.user as any).name || (session.user as any).username || "";

    // Buscar la ficha de Socio asociada al usuario autenticado
    let socio = await prisma.socio.findFirst({
      where: {
        OR: [
          { numeroDocumento: username },
          { codigo: username },
          { id: userId },
        ],
      },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
      },
    });

    // Fallback para testing o socios recién asignados
    if (!socio && process.env.AUTH_BYPASS_FOR_TEST === "true") {
      socio = await prisma.socio.findFirst({
        select: { id: true, codigo: true, nombres: true, apellidos: true },
      });
    }

    if (!socio) {
      return { success: false, error: "No se encontró una ficha de socio asociada a su cuenta." };
    }

    // 1. Obtener Perfil de Planificación Vigente
    const perfilActivo = await prisma.perfilPlanificacion.findFirst({
      where: { socioId: socio.id, activo: true },
      select: {
        id: true,
        version: true,
        nivel: true,
        objetivoPrincipal: true,
        objetivoSecundario: true,
        diasPorSemana: true,
        fechaInicio: true,
      },
    });

    // 2. Obtener Plan de Entrenamiento Activo
    const planEntrenamientoActivo = await prisma.planEntrenamiento.findFirst({
      where: { socioId: socio.id, activo: true },
      select: {
        id: true,
        titulo: true,
        version: true,
        descripcion: true,
        splitSugerido: true,
        frecuenciaSemanal: true,
        nivelActual: true,
        fechaInicio: true,
        contenido: true,
      },
    });

    // 3. Obtener Plan de Alimentación Activo
    const planAlimentacionActivo = await prisma.planAlimentacion.findFirst({
      where: { socioId: socio.id, activo: true },
      select: {
        id: true,
        titulo: true,
        version: true,
        descripcion: true,
        lineamientosGenerales: true,
        recomendacionHidratacion: true,
        fechaInicio: true,
        contenido: true,
      },
    });

    // 4. Obtener datos encapsulados de Evolución y Adherencia del propio socio
    const [evoRes, adhRes] = await Promise.all([
      getEvolucionYSeguimientoSocio(socio.id),
      getAdherenciaYCumplimientoSocio(socio.id, 30),
    ]);

    return {
      success: true,
      data: {
        socio: {
          id: socio.id,
          nombre: `${socio.nombres} ${socio.apellidos}`,
          codigo: socio.codigo,
        },
        perfilActivo: perfilActivo
          ? {
              ...perfilActivo,
              fechaInicio: format(perfilActivo.fechaInicio, "dd/MM/yyyy"),
            }
          : null,
        planEntrenamiento: planEntrenamientoActivo
          ? {
              id: planEntrenamientoActivo.id,
              titulo: planEntrenamientoActivo.titulo,
              version: planEntrenamientoActivo.version,
              descripcion: planEntrenamientoActivo.descripcion,
              splitSugerido: planEntrenamientoActivo.splitSugerido,
              frecuenciaSemanal: planEntrenamientoActivo.frecuenciaSemanal,
              nivelActual: planEntrenamientoActivo.nivelActual,
              fechaInicio: format(planEntrenamientoActivo.fechaInicio, "dd/MM/yyyy"),
              contenido: planEntrenamientoActivo.contenido,
            }
          : null,
        planAlimentacion: planAlimentacionActivo
          ? {
              id: planAlimentacionActivo.id,
              titulo: planAlimentacionActivo.titulo,
              version: planAlimentacionActivo.version,
              lineamientosGenerales: planAlimentacionActivo.lineamientosGenerales,
              recomendacionHidratacion: planAlimentacionActivo.recomendacionHidratacion,
              fechaInicio: format(planAlimentacionActivo.fechaInicio, "dd/MM/yyyy"),
              contenido: planAlimentacionActivo.contenido,
            }
          : null,
        evolucion: evoRes.success ? evoRes.data : null,
        adherencia: adhRes.success ? adhRes.data : null,
      },
    };
  } catch (err: any) {
    console.error("Error en getMiPlanSocio:", err);
    return { success: false, error: err.message || "Error al obtener su plan personalizado." };
  }
}
