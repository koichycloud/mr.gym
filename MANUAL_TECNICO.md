# Manual Técnico y Administrativo - Sistema Mr. Gym

Este documento contiene la información centralizada de la arquitectura, credenciales, y procesos de despliegue del software de gestión de Mr. Gym. Es la hoja de ruta oficial en caso de transición de administrador o soporte técnico futuro.

---

## 1. Arquitectura del Software

El sistema es una aplicación Full-Stack moderna construida con:
*   **Framework**: Next.js 14+ (React)
*   **Estilos**: TailwindCSS y Vanilla CSS (Diseño inmersivo y responsivo)
*   **Base de Datos (ORM)**: Prisma
*   **Alojamiento en la Nube (Hosting)**: Vercel
*   **Base de Datos en Nube**: Supabase (PostgreSQL)

---

## 2. Bases de Datos (El Truco de los Entornos)

El sistema maneja las bases de datos de una forma híbrida para ahorrar costos y permitir desarrollo sin internet:

*   **Entorno Local (Desarrollo)**: Usa una base local llamada `dev.db` (SQLite). 
*   **Entorno Producción (Nube)**: Usa una base de datos segura en Supabase (PostgreSQL).
    *   *Despliegue Inteligente:* El sistema posee un script automático (`scripts/vercel-build.js`) que al detectar los servidores de Vercel (Cloud), traduce silenciosamente la orden de SQLite a PostgreSQL en milisegundos. Gracias a esto, **NO es necesario alterar ningún archivo de base de datos jamás**; lo que programas en SQLite localmente sube y se acopla a la nube sin intervención.

---

## 3. Despliegue en la Nube (Vercel)

La página oficial pública vive en los servidores de Vercel (Ej. `https://mr-gym-dev.vercel.app`).
Las actualizaciones al sistema están totalmente automatizadas y unificadas con GitHub.

Para subir una nueva versión del sistema a la nube pública, simplemente debes enviar el código a Github como lo harías normalmente:
1. `git add .`
2. `git commit -m "Descripción de tu actualización"`
3. `git push`

*Nota:* Vercel interceptará tu comando, leerá el nuevo código y compilará la aplicación. En caso de que Github y Vercel se llegasen a desvincular (muy inusual), puedes forzar la actualización desde tu PC escribiendo `npx vercel --prod`.

---

## 4. El Kiosco Autónomo (Raspberry Pi 4)

El gimnasio cuenta con una placa Raspberry Pi 4 configurada como un sistema "cerrado y blindado" (Kiosk Mode) para procesar la entrada de los socios de forma desatendida mediante un Escáner QR.

### Datos de Acceso por SSH (Terminal Remota)
Para darle mantenimiento sin conectar teclados, se debe estar en la misma red Wi-Fi y ejecutar desde una PC:
*   **Comando SSH**: `ssh jenny@<IP_ASIGNADA>` *(Ej. ssh jenny@10.153.221.40)*
*   **Usuario**: `jenny`
*   **Contraseña**: `Mr-gym-jenny`

### Reglas de Mantenimiento de la Raspberry Pi
La memoria de la Raspberry está **Congelada (OverlayFS)**. Esto significa que está protegida contra escritura; si la desconectan de la electricidad de golpe, nunca se dañará el sistema operativo.

**Si necesitas hacer una actualización (Ej. Instalar programas, reconfigurar Firefox, cambiar WiFi):**
1. Entrar por SSH.
2. Quitar el escudo: Lanzar `sudo raspi-config` -> *Performance Options* -> *Overlay File System* -> *Disable (NO)*.
3. Reiniciar y hacer los cambios deseados.
4. Volver a activar el escudo usando la misma opción repitiéndolo a *Enable (YES)* y reiniciar.

### Motor Gráfico y Lógica del Kiosco
*   **Auto-arranque**: Se maneja bajo el motor moderno `Labwc`. El código que abre automáticamente el Kiosco al encender reside en: `~/.config/labwc/autostart`.
*   **Navegador**: Se utiliza **Firefox** en modo `--kiosk` forzando la apertura de la ruta `/kiosco`.
*   **Ruta Kiosco**: La URL del kiosco NO requiere login gracias al puente (bypass) programado en el archivo `middleware.ts`. Esto permite a Firefox abrir y escanear inmediatamente.

---

## 5. Comandos Locales Diarios

Para quien reciba el proyecto y desee arrancar el entorno en su PC:

*   **Levantar el Sistema de Prueba**: `npm run dev`
*   **Ver/Editar Usuarios de Prueba (Base local)**: `npx prisma studio`
*   **Empujar Base de Datos a la Nube**: Consultar documentación oficial de Prisma y Supabase.
