import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.markitch.app',
  appName: 'MarkItch',
  webDir: 'public',
  // Next.js hier nutzt Server Actions/SSR (Login, Uploads, Feed) — die App
  // läuft nicht als statisches Bundle, sondern lädt live von Vercel, wie ein
  // normaler Browser es auch tun würde. webDir bleibt nur als Pflichtfeld
  // von Capacitor bestehen, wird für diesen Modus nicht tatsächlich genutzt.
  server: {
    url: 'https://markitch.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
  },
  backgroundColor: '#000000',
};

export default config;
