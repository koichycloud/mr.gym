# 🏋️ GUÍA DE HERENCIA Y TRANSFERENCIA DEL SISTEMA DE PRODUCCIÓN MR. GYM

¡Bienvenido al sistema **Mr. Gym**! Este documento contiene toda la información necesaria para asumir el control total, administración, modificación y despliegue del sistema de producción.

---

## ⚡ INSTALACIÓN Y CONFIGURACIÓN RÁPIDA EN ANTIGRAVITY IDE (5 MINUTOS)

Si acabas de recibir el archivo comprimido del proyecto en tu computadora:

1. **Descomprime** la carpeta `mr_gym` en la ubicación que prefieras de tu disco duro.
2. Abre **Antigravity IDE**.
3. Selecciona **File -> Open Folder...** (o Abrir Carpeta) y elige la carpeta `mr_gym`.
4. Abre la **Terminal Integrada** de Antigravity IDE (`Ctrl + ~` o Menú Terminal -> New Terminal).
5. Ejecuta el instalador automático:
   ```cmd
   .\setup-herencia-antigravity.bat
   ```
   *Este script instalará automáticamente todas las librerías necesarias (`npm install`), creará la configuración `.env` conectada a la Base de Datos de Producción en Supabase, compilará el motor de Prisma (`npx prisma generate`) y probará la conexión con la base de datos de producción.*

---

## 🚀 CÓMO TRABAJAR CON EL SISTEMA DESDE ANTIGRAVITY IDE

### 1. Probar y Modificar en Modo Desarrollo (Local)
Para encender el sistema en tu computadora y hacer pruebas locales sin afectar inmediatamente la web pública:
```bash
npm run dev
```
La aplicación estará visible en tu navegador en: `http://localhost:3000`

### 2. Desplegar Cambios a PRODUCCIÓN (Sitio en Vivo en Vercel)
Cuando modifiques código, agregues o elimines funciones desde Antigravity IDE y quieras enviar la actualización a internet en vivo, solo ejecuta estos 3 comandos en la terminal de Antigravity:

```bash
git add .
git commit -m "Nuevas modificaciones del sistema"
git push origin main
```
**Vercel** detectará automáticamente el cambio en GitHub y actualizará la página de producción en aproximadamente **60 segundos**.

---

## 🔐 LISTA DE CHEQUEO DE TRANSFERENCIA DE CUENTAS DE PRODUCCIÓN

Para que la propiedad del sistema sea 100% tuya, el administrador anterior debe realizar la transferencia de las siguientes plataformas principales:

1. **GitHub (Código Fuente):**
   * El dueño anterior va a GitHub -> Repositorio `mr_gym` -> Settings -> Transfer ownership -> Escribe tu usuario de GitHub.
2. **Vercel (Hosting & Despliegue en Vivo):**
   * El dueño anterior va a Vercel -> Proyecto `mr-gym` -> Settings -> General -> Transfer Project -> Escribe tu cuenta de Vercel.
3. **Supabase (Base de Datos PostgreSQL de Producción):**
   * En la consola de Supabase -> Organization Settings -> Members -> Invitarte como **Owner**.
4. **Dominio Personalizado (si aplica):**
   * Transferir o dar acceso al panel DNS del dominio de internet (GoDaddy, Cloudflare, Namecheap, Vercel Domains).

---

## 🗄️ ESTRUCTURA Y TECNOLOGÍAS DEL SISTEMA

* **Framework Principal:** Next.js (TypeScript)
* **Base de Datos:** PostgreSQL en Supabase
* **ORM:** Prisma Client
* **Estilos:** Tailwind CSS & Lucide Icons
* **Hosting:** Vercel

¡Con esta configuración tienes el control total y absoluto para personalizar, modificar, eliminar o hacer crecer el sistema Mr. Gym a tu gusto!
