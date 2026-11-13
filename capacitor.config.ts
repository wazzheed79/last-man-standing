import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wazzheed.lastmanstanding',
  appName: 'Last Man Standing',
  webDir: 'public',
  server: {
    url: 'https://last-man-standing-wazzheed79.vercel.app',
    cleartext: false,
  },
};

export default config;
