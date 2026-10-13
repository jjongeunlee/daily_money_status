import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
const base = process.env.VITE_BASE_PATH || '/'
export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
    manifest: {
      name: '하루 가계부', short_name: '하루 가계부', description: '나의 예산과 일상의 지출 기록',
      lang: 'ko', theme_color: '#255c4c', background_color: '#f6f8f7', display: 'standalone', start_url: base, scope: base,
      icons: [{ src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' }],
    },
    workbox: { navigateFallback: `${base}index.html`, globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'] },
  })],
})
