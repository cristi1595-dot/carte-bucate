import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', // Permite găzduirea pe GitHub Pages (subfolder) sau pe orice domeniu fără erori de căi
  server: {
    host: '0.0.0.0', // Expune explicit pe IPv4 pentru acces direct din rețeaua locală
    port: 5173,
    allowedHosts: true, // Permite accesul prin tuneluri externe (localtunnel, ngrok etc.)
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
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        share_target: {
          action: '/',
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
