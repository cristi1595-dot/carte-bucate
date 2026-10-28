import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/carte-bucate/', // Calea de bază pentru GitHub Pages
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Cartea Mea de Bucate',
        short_name: 'CarteBucate',
        description: 'Cartea ta de bucate digitală, inteligentă și offline-first',
        theme_color: '#ea580c',
        background_color: '#fcfaf6',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/carte-bucate/',
        start_url: '/carte-bucate/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        share_target: {
          action: '/carte-bucate/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      }
    })
  ]
})
