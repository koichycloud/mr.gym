import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrgym.app',
  appName: 'MrGym',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3002', // Desarrollo: Android Emulator. Producción: https://tu-dominio.com
    cleartext: true
  }
};

export default config;
