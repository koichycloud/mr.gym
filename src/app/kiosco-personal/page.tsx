import KioscoPersonalClient from "./KioscoPersonalClient";

export const metadata = {
  title: "Kiosco Personal | Mr. Gym",
  description: "Kiosco de asistencia y gestión para el personal de Mr. Gym",
};

export default function KioscoPersonalPage() {
  return (
    <div className="min-h-screen bg-black/95 relative overflow-hidden flex flex-col">
      {/* Background with watermark */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 pointer-events-none">
        <img 
          src="/icons/icon-512x512.png" 
          alt="Mr Gym Background" 
          className="w-full max-w-2xl object-contain opacity-50 grayscale"
        />
      </div>

      <div className="relative z-10 flex-1 p-4 md:p-8 flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img src="/icons/icon-512x512.png" alt="Mr Gym" className="h-24 md:h-32 mb-4" />
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider text-center drop-shadow-lg">
            Portal del <span className="text-yellow-500">Personal</span>
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Ingresa tu código para continuar</p>
        </div>

        {/* Client Component for interaction */}
        <div className="flex-1 flex items-center justify-center">
          <KioscoPersonalClient />
        </div>
      </div>
    </div>
  );
}
