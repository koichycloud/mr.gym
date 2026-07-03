"use client";

import { useState, useRef, useCallback } from "react";
import { createProductoPersonal, updateProductoPersonal, deleteProductoPersonal } from "@/app/actions/productos-personal";
import { Plus, Edit2, Trash2, X, Loader2, Image as ImageIcon, Upload, Camera } from "lucide-react";
import { toast } from "sonner";

export default function ProductosPersonalClient({ initialData }: { initialData: any[] }) {
  const [productos, setProductos] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: 0,
    fotoUrl: "",
    activo: true,
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 500;
          const scale = Math.min(1, MAX_WIDTH / img.width);

          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setFormData((prev) => ({ ...prev, fotoUrl: dataUrl }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      // Assign stream to video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const MAX_WIDTH = 500;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setFormData(prev => ({ ...prev, fotoUrl: dataUrl }));
    closeCamera();
    toast.success('Foto capturada correctamente');
  }, [closeCamera]);

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
                    <input required type="number" step="0.1" min="0" value={formData.precio} onChange={e => setFormData({...formData, precio: parseFloat(e.target.value)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" inputMode="decimal" />
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Foto del Producto</label>
                <div className="flex flex-col gap-3">

                  {/* Preview with tap-to-remove */}
                  {formData.fotoUrl ? (
                    <div className="relative w-full h-44 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
                      <img
                        src={formData.fotoUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as any).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, fotoUrl: ""})}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                        title="Eliminar imagen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-zinc-950 border-2 border-dashed border-zinc-700 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-zinc-700" />
                    </div>
                  )}

                  {/* Primary action buttons — full width, mobile-first */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white py-4 rounded-xl font-bold text-sm cursor-pointer transition-colors border border-zinc-700">
                      <Upload className="w-6 h-6" />
                      Galería
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex flex-col items-center justify-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 active:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 py-4 rounded-xl font-bold text-sm transition-colors"
                    >
                      <Camera className="w-6 h-6" />
                      Cámara
                    </button>
                  </div>

                  {/* URL input — collapsed by default, useful for desktop */}
                  <details className="group">
                    <summary className="text-xs text-zinc-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-zinc-400 transition-colors">
                      <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                      Pegar URL de imagen
                    </summary>
                    <input
                      type="url"
                      value={formData.fotoUrl}
                      onChange={e => setFormData({...formData, fotoUrl: e.target.value})}
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none text-sm"
                    />
                  </details>

                </div>
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

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4 gap-4">
          <div className="w-full max-w-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-yellow-500" /> Tomar Foto del Producto
              </h3>
              <button onClick={closeCamera} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video preview */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-zinc-700 aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Crosshair overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-yellow-500/60 rounded-lg" />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={closeCamera}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-5 h-5" /> Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
