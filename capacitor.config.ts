import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrgym.app',
  appName: 'MrGym',
  webDir: 'public',
  server: {
    url: 'https://mrgymperu.netlify.app',
    allowNavigation: ['mrgymperu.netlify.app']
  }
};

export default config;
