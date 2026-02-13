import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrgym.app',
  appName: 'MrGym',
  webDir: 'public',
  server: {
    // Reemplaza esto con tu URL real de Netlify cuando la tengas
    url: 'https://TU-SITIO-EN-NETLIFY.netlify.app',
    cleartext: true
  }
};

export default config;
