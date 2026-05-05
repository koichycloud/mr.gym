"use client";

import { useState } from "react";
import { createPersonal, updatePersonal, deletePersonal } from "@/app/actions/personal";
import { Plus, Edit2, Trash2, X, Loader2, Link, QrCode, Share2, Send, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export default function PersonalClient({ initialData }: { initialData: any[] }) {
  const [personal, setPersonal] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; personal: any }>({ open: false, personal: null });
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    dni: "",
    telefono: "",
    rol: "Instructor",
    metodoPago: "POR_HORA",
    montoPago: 10,
    horasObjetivo: 40,
    activo: true,
    codigo: "",
    tipoDocumento: "DNI"
  });

  const handleOpenModal = (p?: any) => {
    if (p) {
      setEditingId(p.id);
      setFormData({
        nombres: p.nombres,
        apellidos: p.apellidos,
        dni: p.dni,
        telefono: p.telefono || "",
        rol: p.rol,
        metodoPago: p.metodoPago,
        montoPago: p.montoPago,
        horasObjetivo: p.horasObjetivo,
        activo: p.activo,
        codigo: p.codigo,
        tipoDocumento: p.tipoDocumento || "DNI"
      });
    } else {
      setEditingId(null);
      setFormData({
        nombres: "",
        apellidos: "",
        dni: "",
        telefono: "",
        rol: "Instructor",
        metodoPago: "POR_HORA",
        montoPago: 10,
        horasObjetivo: 40,
        activo: true,
        codigo: "",
        tipoDocumento: "DNI"
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSubmit = {
      ...formData,
      montoPago: Number(formData.montoPago),
      horasObjetivo: Number(formData.horasObjetivo)
    };

    let res;
    if (editingId) {
      res = await updatePersonal(editingId, dataToSubmit);
    } else {
      res = await createPersonal(dataToSubmit);
    }

    if (res.success) {
      toast.success(editingId ? "Personal actualizado" : "Personal registrado");
      setShowModal(false);
      // Actualización optimista o reload (en este caso el parent tiene revalidatePath, 
      // pero para evitar un refresh forzamos recarga simple o actualizamos state)
      window.location.reload();
    } else {
      toast.error(res.error || "Error al guardar");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este empleado?")) {
      const res = await deletePersonal(id);
      if (res.success) {
        toast.success("Eliminado correctamente");
        setPersonal(personal.filter((p) => p.id !== id));
      } else {
        toast.error(res.error || "Error al eliminar");
      }
    }
  };

  const downloadQR = () => {
    const svg = document.querySelector("#qr-personal-svg") as SVGElement;
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_Acceso_${qrModal.personal.nombres}_${qrModal.personal.apellidos}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
        <h2 className="text-xl font-bold text-white">Lista de Empleados</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Nuevo Personal
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase font-semibold text-zinc-300">
            <tr>
              <th className="px-6 py-4">Empleado</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Método de Pago</th>
              <th className="px-6 py-4">Tarifa / Objetivo</th>
              <th className="px-6 py-4">Código / QR</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {personal.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                  No hay personal registrado.
                </td>
              </tr>
            ) : (
              personal.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{p.nombres} {p.apellidos}</div>
                    <div className="text-xs">{p.tipoDocumento || 'DNI'}: {p.dni}</div>
                  </td>
                  <td className="px-6 py-4"><span className="bg-zinc-800 px-2 py-1 rounded text-yellow-500 font-medium">{p.rol}</span></td>
                  <td className="px-6 py-4">{p.metodoPago.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <div className="text-white">S/ {p.montoPago.toFixed(2)}</div>
                    {p.horasObjetivo > 0 && <div className="text-xs">{p.horasObjetivo} hrs/ciclo</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-zinc-950 px-2 py-1 rounded text-white border border-zinc-800">{p.codigo}</span>
                      <button 
                        onClick={() => setQrModal({ open: true, personal: p })}
                        className="p-1.5 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black rounded-lg transition-all"
                        title="Generar QR de Acceso"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {p.activo ? (
                      <span className="text-green-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Activo</span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Inactivo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`/admin/personal/${p.id}`} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Ver Perfil">
                        <Link className="w-5 h-5" />
                      </a>
                      <button onClick={() => handleOpenModal(p)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <h3 className="text-2xl font-bold text-white">{editingId ? "Editar Personal" : "Registrar Personal"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Nombres</label>
                  <input required type="text" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Apellidos</label>
                  <input required type="text" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Tipo Documento</label>
                  <select 
                    value={formData.tipoDocumento} 
                    onChange={e => setFormData({...formData, tipoDocumento: e.target.value})} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none"
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">C.E. (Carnet Extranjería)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Nro. Documento</label>
                  <input required type="text" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
                
                <div className="col-span-full border-t border-zinc-800 pt-6 mt-2">
                  <h4 className="text-yellow-500 font-bold mb-4 uppercase text-sm tracking-wider">Configuración de Rol y Pago</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Rol</label>
                  <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none">
                    <option value="Instructor">Instructor</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Recepcionista">Recepcionista</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Método de Pago</label>
                  <select value={formData.metodoPago} onChange={e => setFormData({...formData, metodoPago: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none">
                    <option value="POR_HORA">Por Hora</option>
                    <option value="POR_DIA">Por Día</option>
                    <option value="SEMANAL">Semanal Fijo</option>
                    <option value="QUINCENAL">Quincenal Fijo</option>
                    <option value="MENSUAL">Mensual Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Monto Acordado (S/)</label>
                  <input required type="number" step="0.1" value={formData.montoPago} onChange={e => setFormData({...formData, montoPago: parseFloat(e.target.value)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Horas Objetivo (al {formData.metodoPago.toLowerCase()})</label>
                  <input required type="number" step="1" value={formData.horasObjetivo} onChange={e => setFormData({...formData, horasObjetivo: parseFloat(e.target.value)})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none" />
                  <p className="text-xs text-zinc-500 mt-1">Horas que debe cumplir en su ciclo de pago.</p>
                </div>

                {editingId && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Código de Acceso (Kiosco)</label>
                      <input required type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none font-mono" />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" id="activo" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 accent-yellow-500" />
                      <label htmlFor="activo" className="text-white font-medium">Personal Activo</label>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-6 border-t border-zinc-800 flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="px-6 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors flex items-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Personal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModal.open && qrModal.personal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-zinc-800">
              <h3 className="text-xl font-bold text-white">Código de Acceso QR</h3>
              <p className="text-zinc-400 text-sm">{qrModal.personal.nombres} {qrModal.personal.apellidos}</p>
            </div>
            
            <div className="p-8 flex flex-col items-center bg-white">
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                <QRCodeSVG 
                  id="qr-personal-svg"
                  value={`${window.location.origin}/kiosco-personal?code=${qrModal.personal.codigo}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: '/icons/icon-192x192.png',
                    x: undefined,
                    y: undefined,
                    height: 42,
                    width: 42,
                    excavate: true,
                  }}
                />
              </div>
              <p className="mt-6 text-black font-black text-2xl tracking-widest">{qrModal.personal.codigo}</p>
            </div>

            <div className="p-6 space-y-3">
              <button 
                onClick={downloadQR}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" /> Descargar Imagen QR
              </button>

              <button 
                onClick={() => {
                  const text = `Hola ${qrModal.personal.nombres}, este es tu enlace de acceso directo para Mr. Gym: ${window.location.origin}/kiosco-personal?code=${qrModal.personal.codigo}`;
                  const url = `https://wa.me/${qrModal.personal.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                }}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-5 h-5" /> Enviar Enlace por WhatsApp
              </button>
              
              <button 
                onClick={() => setQrModal({ open: false, personal: null })}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
