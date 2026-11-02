import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages la app se sirve en /<repo>/. Se puede sobrescribir con BASE_PATH.
const base = process.env.BASE_PATH ?? '/FoodControl/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'FoodControl',
        short_name: 'FoodControl',
        description: 'Tu diario de comidas, agua y actividad, con mascota.',
        lang: 'es-ES',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F7FA',
        theme_color: '#F4F7FA',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // Las búsquedas online de Open Food Facts nunca se cachean
        runtimeCaching: []
      }
    })
  ]
});
