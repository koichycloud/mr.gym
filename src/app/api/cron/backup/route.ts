import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // 1. Validar autorización (Cron Secret)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.BACKUP_CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[BACKUP CRON] Intento de acceso no autorizado.");
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[BACKUP CRON] Iniciando proceso de respaldo automático...");

    // 2. Extraer datos de todas las tablas principales
    const [
      users,
      socios,
      codigos,
      suscripciones,
      planes,
      medidas,
      asistencias,
      pagos,
      logs,
      personal,
      asistenciaPersonal,
      productoPersonal,
      consumoPersonal,
      adelantoPersonal,
      pagoPersonal
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.socio.findMany(),
      prisma.codigoHistorial.findMany(),
      prisma.suscripcion.findMany(),
      prisma.plan.findMany(),
      prisma.medidaFisica.findMany(),
      prisma.asistencia.findMany(),
      prisma.pago.findMany(),
      prisma.auditLog.findMany(),
      prisma.personal.findMany(),
      prisma.asistenciaPersonal.findMany(),
      prisma.productoPersonal.findMany(),
      prisma.consumoPersonal.findMany(),
      prisma.adelantoPersonal.findMany(),
      prisma.pagoPersonal.findMany()
    ]);

    const backupPayload = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        User: users,
        Socio: socios,
        CodigoHistorial: codigos,
        Suscripcion: suscripciones,
        Plan: planes,
        MedidaFisica: medidas,
        Asistencia: asistencias,
        Pago: pagos,
        AuditLog: logs,
        Personal: personal,
        AsistenciaPersonal: asistenciaPersonal,
        ProductoPersonal: productoPersonal,
        ConsumoPersonal: consumoPersonal,
        AdelantoPersonal: adelantoPersonal,
        PagoPersonal: pagoPersonal
      }
    };

    const filename = `db_backup_${new Date().toISOString().split('T')[0]}.json`;

    // 3. Subir el respaldo a Supabase Storage
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[BACKUP CRON] Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
      // Devolvemos el backup en el body para depuración en desarrollo si no hay variables de Supabase
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ 
          success: false, 
          error: "Supabase config missing, returning backup data in response",
          backupPayload 
        });
      }
      return NextResponse.json({ success: false, error: "Cloud storage configuration missing" }, { status: 500 });
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/backups/${filename}`;
    
    // Usamos PUT con upsert para permitir sobreescritura si corre de nuevo el mismo día
    console.log(`[BACKUP CRON] Subiendo ${filename} a Supabase Storage...`);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
        "x-upsert": "true"
      },
      body: JSON.stringify(backupPayload)
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error(`[BACKUP CRON] Error al subir el respaldo: ${uploadRes.statusText}`, errorText);
      return NextResponse.json({ success: false, error: "Failed to upload backup to cloud storage" }, { status: 500 });
    }

    console.log("[BACKUP CRON] Respaldo subido correctamente.");

    // 4. Limpieza: Eliminar respaldos con antigüedad superior a 30 días
    console.log("[BACKUP CRON] Evaluando retención de 30 días...");
    const listUrl = `${supabaseUrl}/storage/v1/object/list/backups`;
    const listRes = await fetch(listUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prefix: "",
        limit: 100,
        sortBy: { column: "name", order: "asc" }
      })
    });

    if (listRes.ok) {
      const files = await listRes.json();
      if (Array.isArray(files)) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const filesToDelete = files.filter((file: any) => {
          if (!file.name.startsWith("db_backup_") || !file.name.endsWith(".json")) return false;
          // El nombre del archivo es db_backup_YYYY-MM-DD.json (largo 25)
          // La fecha está entre la posición 10 y 20
          const dateStr = file.name.substring(10, 20);
          const fileDate = new Date(dateStr);
          // Si la fecha del archivo no es válida, no lo borramos por seguridad
          if (isNaN(fileDate.getTime())) return false;
          return fileDate < thirtyDaysAgo;
        });

        if (filesToDelete.length > 0) {
          console.log(`[BACKUP CRON] Eliminando ${filesToDelete.length} respaldos antiguos...`);
          const deleteUrl = `${supabaseUrl}/storage/v1/object/backups`;
          const deleteRes = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${serviceRoleKey}`,
              "apikey": serviceRoleKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prefixes: filesToDelete.map((f: any) => f.name)
            })
          });

          if (deleteRes.ok) {
            console.log("[BACKUP CRON] Eliminación completada con éxito.");
          } else {
            console.warn("[BACKUP CRON] Error al ejecutar eliminación de archivos antiguos:", await deleteRes.text());
          }
        } else {
          console.log("[BACKUP CRON] No se encontraron archivos que superen los 30 días de antigüedad.");
        }
      }
    } else {
      console.warn("[BACKUP CRON] No se pudo obtener la lista de archivos para limpieza:", await listRes.text());
    }

    // Registrar en la bitácora de auditoría
    await prisma.auditLog.create({
      data: {
        usuario: "SISTEMA_CRON",
        accion: "RESPALDO_AUTOMATICO",
        detalles: `Respaldo exitoso creado en Supabase Storage: ${filename}`
      }
    });

    return NextResponse.json({ success: true, filename });

  } catch (error: any) {
    console.error("[BACKUP CRON] Error general en el endpoint de respaldo:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
