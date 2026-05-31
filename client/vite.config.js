import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'FluxD — Sistema Financeiro',
        short_name: 'FluxD',
        description: 'ERP Financeiro para gestão de empresas',
        theme_color: '#1E3A5F',
        background_color: '#EFF8FC',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        shortcuts: [
          { name: 'Lançamentos', url: '/lancamentos', icons: [{ src: '/favicon.svg', sizes: 'any' }] },
          { name: 'Contas a Pagar', url: '/contas-pagar', icons: [{ src: '/favicon.svg', sizes: 'any' }] },
          { name: 'Dashboard', url: '/', icons: [{ src: '/favicon.svg', sizes: 'any' }] },
        ],
      },
      workbox: {
        // Cache de assets estáticos
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        // API nunca cacheada — sempre vai para a rede
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
