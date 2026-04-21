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

### Acceso Remoto Global Sin Fronteras (Tailscale)
Si el administrador se encuentra fuera de la red local del gimnasio (ej. otro país o ciudad), la Raspberry Pi cuenta con un túnel **Tailscale** activo que atraviesa NAT y routers de forma encriptada sin requerir apertura de puertos.
1. El técnico debe tener Tailscale encendido en su PC de viaje e iniciar sesión con la misma cuenta administradora de Google/Microsoft.
2. Desde la App de Tailscale se obtendrá la "IP Global" de la máquina.
*   **Comando Global**: `ssh jenny@<IP_GLOBAL_DE_TAILSCALE>` *(Se usa la misma clave mencionada arriba).*

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

## 5. Guía de Instalación y Desarrollo Local

Para cualquier desarrollador que reciba el código fuente y desee levantar el sistema en su propia máquina desde cero:

### Requisitos Previos
*   Instalar **Node.js** (v18 o superior).
*   Tener **Git** instalado.

### Pasos de Instalación Inicial
1. Clonar el repositorio: `git clone https://github.com/koichycloud/mr.gym.git`
2. Entrar a la carpeta: `cd mr.gym`
3. Instalar las dependencias de código: `npm install`
4. Generar el cliente de la base de datos local: `npx prisma generate`
5. Crear y sincronizar la base de datos local (SQLite): `npx prisma db push`
6. Levantar el servidor de desarrollo: `npm run dev`

### Comandos de Uso Diario
*   `npm run dev` -> Levanta la web en `http://localhost:3000`
*   `npx prisma studio` -> Abre un panel visual para ver/editar todos los datos de la base de datos local.

---

## 6. Onboarding para Inteligencia Artificial (Prompting para IA)

Si un administrador futuro necesita pedirle a un Agente de Inteligencia Artificial (como ChatGPT, Claude o Antigravity) que modifique, repare o mejore este sistema, debe proporcionarle el siguiente contexto para evitar que la IA dañe la arquitectura.

**Copia y pega este texto a la IA antes de pedirle cambios:**

> "Eres un Arquitecto de Software Experto. Vas a trabajar en mi proyecto 'Mr. Gym'. 
> **Contexto de Arquitectura Obligatorio:**
> 1. Es un proyecto de Next.js 14+ usando App Router (`src/app`).
> 2. NO usamos API Routes. Toda la lógica de servidor y conexión a base de datos se maneja exclusivamente a través de **Server Actions** ubicados en la carpeta `src/app/actions/`.
> 3. Usamos Prisma como ORM. La base de datos local es SQLite y la de producción en Vercel es PostgreSQL (Supabase). No debes cambiar el `provider` en `schema.prisma` manualmente, el archivo `scripts/vercel-build.js` lo hace de forma automática durante el despliegue.
> 4. Los estilos deben seguir estrictamente TailwindCSS.
> 5. El Kiosco físico lee de la ruta `/kiosco`. Está excluida del login obligatorio dentro de `src/middleware.ts`.
> 
> Te adjunto los archivos `MANUAL_TECNICO.md` y `prisma/schema.prisma` para que comprendas el esquema. Con esta base, mi petición es la siguiente: [Inserta aquí tu petición...]"
