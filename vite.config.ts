import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/training-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'icon.svg'],
      manifest: {
        name: 'Training App',
        short_name: 'Training',
        description: 'Rutina de 4 dias con registro local y videos',
        theme_color: '#1d2f3d',
        background_color: '#e8eef2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/training-app/',
        scope: '/training-app/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,mp4,webmanifest}'],
        maximumFileSizeToCacheInBytes: 7 * 1024 * 1024,
      },
    }),
  ],
})
