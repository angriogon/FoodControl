import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages la app se sirve en /<repo>/. Se puede sobrescribir con BASE_PATH.
const base = process.env.BASE_PATH ?? '/FoodControl/';

// Política de seguridad de contenido (solo en la build publicada: el servidor
// de desarrollo inyecta scripts en línea para la recarga en caliente).
// GitHub Pages no permite cabeceras HTTP propias, así que va como <meta>.
const CSP = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' permite compilar WebAssembly (lector de códigos de
  // barras) sin habilitar eval() de JavaScript
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: mediastream:",
  "connect-src 'self' https://world.openfoodfacts.org",
  "manifest-src 'self'",
  "worker-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');

const cspPlugin: Plugin = {
  name: 'foodcontrol-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
};

export default defineConfig({
  base,
  plugins: [
    react(),
    cspPlugin,
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
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // El lector de códigos (~1 MB) no se precarga: se guarda la primera vez
        // que se usa y desde entonces funciona sin conexión.
        // Las búsquedas online de Open Food Facts nunca se cachean.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'foodcontrol-wasm', expiration: { maxEntries: 3 } }
          }
        ]
      }
    })
  ]
});
