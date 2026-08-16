"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getEjercicios,
  createEjercicio,
  updateEjercicio,
  toggleEjercicioActivo,
} from "@/app/actions/ejercicios";
import {
  GRUPOS_MUSCULARES,
  NIVELES_PLANIFICACION,
  TIPOS_EJERCICIO,
  EQUIPAMIENTO_EJERCICIO,
} from "@/lib/validations";

interface EjercicioItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  instrucciones: string | null;
  grupoMuscular: string;
  grupoMuscularSecundario: string | null;
  nivel: string;
  tipoEjercicio: string;
  equipamientoRequerido: string;
  restricciones: string | null;
  activo: boolean;
  createdAt: string | Date;
}

export default function EjerciciosAdminPage() {
  const [isPending, startTransition] = useTransition();
  const [ejercicios, setEjercicios] = useState<EjercicioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrupo, setFilterGrupo] = useState<string>("");
  const [filterNivel, setFilterNivel] = useState<string>("");
  const [filterEquipamiento, setFilterEquipamiento] = useState<string>("");
  const [filterActivo, setFilterActivo] = useState<string>("ALL");

  // Modal Crear/Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EjercicioItem | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    instrucciones: "",
    grupoMuscular: "PECHO",
    grupoMuscularSecundario: "",
    nivel: "PRINCIPIANTE",
    tipoEjercicio: "FUERZA",
    equipamientoRequerido: "GIMNASIO_COMPLETO",
    restricciones: "",
  });

  const loadData = () => {
    setLoading(true);
    startTransition(async () => {
      const res = await getEjercicios({
        query: searchQuery || undefined,
        grupoMuscular: (filterGrupo as any) || undefined,
        nivel: (filterNivel as any) || undefined,
        equipamientoRequerido: (filterEquipamiento as any) || undefined,
        activo: filterActivo === "ALL" ? undefined : filterActivo === "TRUE",
      });

      if (res.success && res.ejercicios) {
        setEjercicios(res.ejercicios as EjercicioItem[]);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.error || "Error al cargar la biblioteca de ejercicios.");
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, filterGrupo, filterNivel, filterEquipamiento, filterActivo]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      nombre: "",
      descripcion: "",
      instrucciones: "",
      grupoMuscular: "PECHO",
      grupoMuscularSecundario: "",
      nivel: "PRINCIPIANTE",
      tipoEjercicio: "FUERZA",
      equipamientoRequerido: "GIMNASIO_COMPLETO",
      restricciones: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EjercicioItem) => {
    setEditingItem(item);
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      instrucciones: item.instrucciones || "",
      grupoMuscular: item.grupoMuscular,
      grupoMuscularSecundario: item.grupoMuscularSecundario || "",
      nivel: item.nivel,
      tipoEjercicio: item.tipoEjercicio,
      equipamientoRequerido: item.equipamientoRequerido,
      restricciones: item.restricciones || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      let res;
      if (editingItem) {
        res = await updateEjercicio({
          id: editingItem.id,
          ...(formData as any),
        });
      } else {
        res = await createEjercicio({
          ...(formData as any),
          activo: true,
        });
      }

      if (res.success) {
        setSuccessMsg(
          editingItem ? "Ejercicio actualizado exitosamente." : "Ejercicio registrado exitosamente."
        );
        setIsModalOpen(false);
        loadData();
      } else {
        setErrorMsg(res.error || "Error al procesar la solicitud.");
      }
    });
  };

  const handleToggleActivo = (item: EjercicioItem) => {
    startTransition(async () => {
      const res = await toggleEjercicioActivo(item.id, !item.activo);
      if (res.success) {
        setSuccessMsg(`Ejercicio ${!item.activo ? "activado" : "desactivado"} correctamente.`);
        loadData();
      } else {
        setErrorMsg(res.error || "Error al cambiar el estado.");
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Biblioteca de Ejercicios
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Catálogo maestro de ejercicios para la planificación y estructuración de entrenamientos.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary px-4 py-2 text-sm font-semibold rounded-lg shadow"
        >
          + Nuevo Ejercicio
        </button>
      </div>

      {/* Mensajes de Alerta */}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered w-full text-sm rounded-lg"
        />
        <select
          value={filterGrupo}
          onChange={(e) => setFilterGrupo(e.target.value)}
          className="select select-bordered w-full text-sm rounded-lg"
        >
          <option value="">Todos los grupos</option>
          {GRUPOS_MUSCULARES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={filterNivel}
          onChange={(e) => setFilterNivel(e.target.value)}
          className="select select-bordered w-full text-sm rounded-lg"
        >
          <option value="">Todos los niveles</option>
          {NIVELES_PLANIFICACION.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={filterEquipamiento}
          onChange={(e) => setFilterEquipamiento(e.target.value)}
          className="select select-bordered w-full text-sm rounded-lg"
        >
          <option value="">Todo equipamiento</option>
          {EQUIPAMIENTO_EJERCICIO.map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </select>
        <select
          value={filterActivo}
          onChange={(e) => setFilterActivo(e.target.value)}
          className="select select-bordered w-full text-sm rounded-lg"
        >
          <option value="ALL">Todos los estados</option>
          <option value="TRUE">Activos</option>
          <option value="FALSE">Inactivos</option>
        </select>
      </div>

      {/* Tabla de Ejercicios */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-100 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-700 dark:text-gray-200 border-b">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Grupo Muscular</th>
              <th className="p-3">Nivel</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Equipamiento</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Cargando ejercicios...
                </td>
              </tr>
            ) : ejercicios.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  No se encontraron ejercicios en la biblioteca.
                </td>
              </tr>
            ) : (
              ejercicios.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="p-3 font-medium text-gray-900 dark:text-white">
                    {item.nombre}
                    {item.restricciones && (
                      <span className="block text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        ⚠️ Restricción: {item.restricciones}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="badge badge-ghost text-xs font-semibold">{item.grupoMuscular}</span>
                    {item.grupoMuscularSecundario && (
                      <span className="block text-xs text-gray-400 mt-0.5">
                        +{item.grupoMuscularSecundario}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-medium text-xs">{item.nivel}</td>
                  <td className="p-3 font-medium text-xs">{item.tipoEjercicio}</td>
                  <td className="p-3 text-xs">{item.equipamientoRequerido}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.activo
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActivo(item)}
                      className={`text-xs font-semibold ${
                        item.activo ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {item.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Formulario Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingItem ? "Editar Ejercicio" : "Nuevo Ejercicio"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Ejercicio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input input-bordered w-full rounded-lg text-sm"
                  placeholder="Ej: Press de Banca Plano con Barra"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Grupo Muscular Principal *
                  </label>
                  <select
                    value={formData.grupoMuscular}
                    onChange={(e) => setFormData({ ...formData, grupoMuscular: e.target.value })}
                    className="select select-bordered w-full rounded-lg text-sm"
                  >
                    {GRUPOS_MUSCULARES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Grupo Muscular Secundario
                  </label>
                  <input
                    type="text"
                    value={formData.grupoMuscularSecundario}
                    onChange={(e) => setFormData({ ...formData, grupoMuscularSecundario: e.target.value })}
                    className="input input-bordered w-full rounded-lg text-sm"
                    placeholder="Ej: Tríceps, Deltoides Anterior"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nivel Requerido *
                  </label>
                  <select
                    value={formData.nivel}
                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                    className="select select-bordered w-full rounded-lg text-sm"
                  >
                    {NIVELES_PLANIFICACION.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Ejercicio *
                  </label>
                  <select
                    value={formData.tipoEjercicio}
                    onChange={(e) => setFormData({ ...formData, tipoEjercicio: e.target.value })}
                    className="select select-bordered w-full rounded-lg text-sm"
                  >
                    {TIPOS_EJERCICIO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Equipamiento *
                  </label>
                  <select
                    value={formData.equipamientoRequerido}
                    onChange={(e) => setFormData({ ...formData, equipamientoRequerido: e.target.value })}
                    className="select select-bordered w-full rounded-lg text-sm"
                  >
                    {EQUIPAMIENTO_EJERCICIO.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="textarea textarea-bordered w-full rounded-lg text-sm"
                  placeholder="Descripción técnica del ejercicio..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instrucciones de Ejecución
                </label>
                <textarea
                  rows={3}
                  value={formData.instrucciones}
                  onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                  className="textarea textarea-bordered w-full rounded-lg text-sm"
                  placeholder="Pasos para realizar el movimiento de forma biomecánicamente segura..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Restricciones / Advertencias Operativas
                </label>
                <input
                  type="text"
                  value={formData.restricciones}
                  onChange={(e) => setFormData({ ...formData, restricciones: e.target.value })}
                  className="input input-bordered w-full rounded-lg text-sm"
                  placeholder="Ej: Evitar si presenta lesión activa en hombro derecho"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary text-sm px-5"
                >
                  {isPending ? "Guardando..." : "Guardar Ejercicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
