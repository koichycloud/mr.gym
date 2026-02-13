import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    let session = null;
    try {
        session = await getServerSession(authOptions);
    } catch (e) {
        console.error("Debug Session Error:", e);
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">Diagnóstico de Sesión (v2)</h1>
            <div className="bg-base-200 p-4 rounded mb-4">
                <p>Si ves esto, la ruta funciona.</p>
                <p>Hora servidor: {new Date().toISOString()}</p>
            </div>

            <pre className="bg-base-300 p-4 rounded-lg overflow-auto">
                {JSON.stringify(session, null, 2)}
            </pre>

            <div className="mt-4">
                <p><strong>Usuario:</strong> {session?.user?.name || 'No identificado'}</p>
                <p><strong>Rol Detectado:</strong> {(session?.user as any)?.role || 'NINGUNO'}</p>
                <p><strong>Es Admin:</strong> {(session?.user as any)?.role === 'ADMIN' ? 'SÍ' : 'NO'}</p>
            </div>
        </div>
    );
}
