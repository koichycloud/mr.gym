"use client";

import { useState } from "react";
import { createProductoPersonal, updateProductoPersonal, deleteProductoPersonal } from "@/app/actions/productos-personal";
import { Plus, Edit2, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function ProductosPersonalClient({ initialData }: { initialData: any[] }) {
  const [productos, setProductos] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: 0,
    fotoUrl: "",
    activo: true,
  });

  const handleOpenModal = (p?: any) => {
    if (p) {
      setEditingId(p.id);
      setFormData({
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        precio: p.precio,
        fotoUrl: p.fotoUrl || "",
        activo: p.activo,
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: "",
        descripcion: "",
        precio: 0,
        fotoUrl: "",
        activo: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSubmit = {
      ...formData,
      precio: Number(formData.precio),
    };

    let res;
    if (editingId) {
      res = await updateProductoPersonal(editingId, dataToSubmit);
    } else {
      res = await createProductoPersonal(dataToSubmit);
    }

    if (res.success) {
      toast.success(editingId ? "Producto actualizado" : "Producto creado");
      setShowModal(false);
      window.location.reload();
    } else {
      toast.error(res.error || "Error al guardar");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      const res = await deleteProductoPersonal(id);
      if (res.success) {
        toast.success("Eliminado correctamente");
        setProductos(productos.filter((p) => p.id !== id));
      } else {
        toast.error(res.error || "Error al eliminar");
      }
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
        <h2 className="text-xl font-bold text-white">Catálogo</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Nuevo Producto
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {productos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500">
            No hay productos registrados.
          </div>
        ) : (
          productos.map((p) => (
            <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group relative">
               {!p.activo && <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">INACTIVO</div>}
               <div className="h-40 w-full bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                 {p.fotoUrl ? (
                    <img src={p.fotoUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 ) : (
                    <ImageIcon className="w-12 h-12 text-zinc-700" />
                 )}
               </div>
               <div className="p-4 flex-1 flex flex-col">
                 <h3 className="font-bold text-white text-lg mb-1 line-clamp-1">{p.nombre}</h3>
                 <p className="text-zinc-500 text-sm line-clamp-2 mb-3">{p.descripcion}</p>
                 <div className="mt-auto flex items-center justify-between">
                   <span className="text-yellow-500 font-bold text-xl">S/ {p.precio.toFixed(2)}</span>
                   <div className="flex gap-2">
                     <button onClick={() => handleOpenModal(p)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h3 className="text-2xl font-bold text-white">{editingId ? "Editar Producto" : "Nuevo Producto"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Producto</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Precio (S/)</label>
                    <input required type="number" step="0.1" min="0" value={formData.precio} onChange={e => setFormData({...formData, precio: parseFloat(e.target.value)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">URL de la Foto (Opcional)</label>
                <input type="url" value={formData.fotoUrl} onChange={e => setFormData({...formData, fotoUrl: e.target.value})} placeholder="https://ejemplo.com/foto.jpg" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                {formData.fotoUrl && (
                  <div className="mt-2 h-32 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
                     <img src={formData.fotoUrl} alt="Preview" className="h-full object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción (Opcional)</label>
                <textarea rows={2} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none resize-none" />
              </div>

              {editingId && (
                <div className="flex items-center gap-3 pt-2">
                  <input type="checkbox" id="activo" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 accent-yellow-500" />
                  <label htmlFor="activo" className="text-white font-medium">Producto Disponible</label>
                </div>
              )}

              <div className="pt-6 border-t border-zinc-800 flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors flex items-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
