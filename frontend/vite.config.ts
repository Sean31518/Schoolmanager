import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A custom service worker (src/sw.ts) is required to handle Web Push
      // `push`/`notificationclick` events — the default generateSW strategy
      // only supports declarative runtime-caching config, not custom event
      // listeners. Its runtime caching (see sw.ts) replicates what used to
      // be configured here via `workbox.runtimeCaching`.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Schulmanager',
        short_name: 'Schulmanager',
        description:
          'Selbstgehosteter Schulorganizer für Stundenplan, Hausaufgaben, Notizen und Klausuren.',
        lang: 'de',
        theme_color: '#dfa24a',
        background_color: '#0a0a09',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Enables the richer install dialog (with a preview) on both
        // desktop and mobile - Chrome needs at least one screenshot per
        // form_factor, otherwise it silently falls back to a plain dialog.
        screenshots: [
          {
            src: 'screenshot-wide.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: 'screenshot-narrow.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6969',
        changeOrigin: true,
      },
    },
  },
})
