# Guía de Configuración Hardware: Kiosco Mr. Gym (Raspberry Pi 4)

Esta guía detalla paso a paso cómo preparar tu Raspberry Pi 4 B para que funcione como un sistema de acceso autónomo de "modo kiosco", mostrando únicamente la aplicación de Mr. Gym de forma segura e ininterrumpida.

---

## 1. Instalación del Sistema Operativo

Recomendamos usar la versión oficial completa de Raspberry Pi OS. Al tener entorno de escritorio, es mucho más sencillo configurar la pantalla táctil y el navegador.

1. Desde tu computadora principal (Windows/Mac), descarga el [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. Inserta la **tarjeta MicroSD** en tu computadora.
3. Abre Raspberry Pi Imager.
   - **Dispositivo (Device):** Selecciona *Raspberry Pi 4*.
   - **Sistema Operativo (OS):** Selecciona *Raspberry Pi OS (32-bit o 64-bit)* (La opción predeterminada con entorno de escritorio).
   - **Almacenamiento (Storage):** Elige tu tarjeta MicroSD.
4. **¡Paso clave!** Antes de pulsar "Escribir" (Write), haz clic en el ícono del **engranaje (Ajustes Avanzados)** para preconfigurar el equipo sin necesidad de conectarle teclado:
   - Configura el **Nombre del equipo (hostname):** Ej. `mrgym-kiosk`
   - Habilita **SSH** y usa autenticación con contraseña.
   - Configura un **Nombre de usuario y contraseña:** Ej. Usuario: `admin` / Clave: `adminmrgym`
   - Configura el **Wi-Fi:** Ingresa el nombre de tu red y contraseña (ignora esto si vas a usar cable de red Ethernet).
   - Configura la **Zona horaria y teclado**.
5. Guarda los ajustes y pulsa **Escribir (Write)**. Espera a que termine.

---

## 2. Ensamblaje Físico

Asegúrate de que la Raspberry Pi esté desconectada de la corriente eléctrica.

1. Inserta la **Tarjeta MicroSD**.
2. **Pantalla Anmite 15"**:
   - Conecta el adaptador/cable de **Micro HDMI a HDMI estándar**.
   - Conecta el cable **HDMI** de la pantalla al adaptador en el puerto **HDMI 0**.
   - ¡Importante para la función táctil! Conecta un cable **USB** desde la pantalla a cualquier puerto USB de la Raspberry Pi.
3. **Escáner QR**: Conéctalo a uno de los puertos **USB 2.0** (negros).
4. **Internet**: Conecta cable Ethernet (opcional, si no usas wifi).
5. **Energía**: Conecta la fuente de poder USB-C y enciende.

---

## 3. Preparación del Entorno Kiosco

Mediante la terminal local o a través de SSH (`ssh admin@IP_DE_LA_RASPBERRY`):

### A. Actualizar e instalar `unclutter` (oculta el cursor del mouse)
```bash
sudo apt update
sudo apt install unclutter -y
```

### B. Desactivar el apagado automático de la pantalla
```bash
sudo raspi-config
```
Ve a **Display Options** -> **Screen Blanking** -> Elige **NO**.
Termina la configuración.

---

## 4. Configurar el Arranque Automático (Modo Kiosco)

Edita el archivo de autoinicio usando el editor de textos:
```bash
sudo nano ~/.config/wayfire.ini
```

Agrega esta sección al final del documento (cambia la IP por la de tu PC/servidor):
```ini
[autostart]
panel = false
background = false
chromium = chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --fast --fast-start --disable-pinch --overscroll-history-navigation=0 http://192.168.1.XX:3000/kiosco
unclutter = unclutter -idle 0.5 -root
```

Guarda los cambios (`Ctrl + O`, `Enter`, `Ctrl + X`).

---

## 5. Pruebas Finales

Reinicia el equipo:
```bash
sudo reboot
```

Al encender, la barra de tareas no estará. El navegador abrirá y llenará la pantalla apuntando al sistema de Mr Gym. El cursor debe ocultarse si dejas de tocar la pantalla de 15". El escáner escribirá seguido de un "Enter".
