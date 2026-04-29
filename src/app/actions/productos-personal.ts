"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Obtener catálogo de productos
export async function getProductosPersonal() {
  try {
    const productos = await prisma.productoPersonal.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    });
    return { success: true, productos };
  } catch (error: any) {
    return { success: false, error: "Error al obtener productos" };
  }
}

// Crear producto
export async function createProductoPersonal(data: {
  nombre: string;
  descripcion?: string;
  precio: number;
  fotoUrl?: string;
}) {
  try {
    const producto = await prisma.productoPersonal.create({
      data,
    });
    revalidatePath("/admin/productos-personal");
    revalidatePath("/kiosco-personal");
    return { success: true, producto };
  } catch (error: any) {
    return { success: false, error: "Error al crear producto" };
  }
}

// Actualizar producto
export async function updateProductoPersonal(id: string, data: {
  nombre: string;
  descripcion?: string;
  precio: number;
  fotoUrl?: string;
  activo: boolean;
}) {
  try {
    const producto = await prisma.productoPersonal.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/productos-personal");
    revalidatePath("/kiosco-personal");
    return { success: true, producto };
  } catch (error: any) {
    return { success: false, error: "Error al actualizar producto" };
  }
}

// Eliminar producto
export async function deleteProductoPersonal(id: string) {
  try {
    await prisma.productoPersonal.delete({
      where: { id },
    });
    revalidatePath("/admin/productos-personal");
    revalidatePath("/kiosco-personal");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "No se puede eliminar el producto porque ya tiene consumos asociados. Intenta desactivarlo." };
  }
}
