import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.santamarialuis.linkmote',
  appName: 'LinkMote',
  webDir: 'dist',
  // CapacitorHttp intercepts window.fetch and XMLHttpRequest in the native webview.
  // This bypasses CORS restrictions, allowing direct HTTP calls to local network devices
  // (like Roku on port 8060) without needing a backend proxy.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    // Allow cleartext (non-HTTPS) traffic to local network IPs on Android
    // This is required to communicate with Roku at http://192.168.x.x:8060
    cleartext: true,
    androidScheme: 'http',
  },
};

export default config;
