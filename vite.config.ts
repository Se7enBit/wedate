import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const BACKGROUND = '#120A18'
const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'

// https://vite.dev/config/
export default defineConfig({
  base: '/wedate/',
  define: { __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version} · ${commit}`) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/wedate/',
        name: 'WeDate',
        short_name: 'WeDate',
        description: 'Date ideas for the two of you: in advance, on the day or right now.',
        lang: 'en',
        start_url: '/wedate/',
        scope: '/wedate/',
        display: 'standalone',
        theme_color: BACKGROUND,
        background_color: BACKGROUND,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell, with fonts and icons, so it looks right offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\//, handler: 'NetworkOnly', method: 'POST' },
          { urlPattern: /^https:\/\/[a-z-]+\.open-meteo\.com\//, handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
})
