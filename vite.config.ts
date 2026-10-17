import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production' || command === 'build';

  return {
    plugins: [
      react(),
      tailwindcss(),
      // In dev mode inside iframe with HMR disabled, safely intercept any residual requests to pwa-entry-point-loaded
      {
        name: 'safe-pwa-dev-stub',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.includes('pwa-entry-point-loaded')) {
              res.setHeader('Content-Type', 'text/javascript');
              res.end('export default function registerDevSW() {};');
              return;
            }
            next();
          });
        },
      },
      VitePWA({
        disable: !isProduction,
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Mahada Indonesia - Personal Business Project Manager',
          short_name: 'Mahada Indonesia',
          description: 'Aplikasi manajemen proyek bisnis personal & produktivitas Mahada Indonesia dengan arsitektur PWA offline-first.',
          theme_color: '#181b20',
          background_color: '#121316',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
