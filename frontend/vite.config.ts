import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

const isHttps = process.env.HTTPS === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    isHttps ? basicSsl() : null,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'みんなの安全マップ',
        short_name: '安全マップ',
        description: 'こどもから おとなまで みんなで まちの あんぜんを まもる マップアプリ',
        theme_color: '#2C3E50',
        background_color: '#F0F4F8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            // OpenStreetMapのタイル画像をローカルにキャッシュ (オフライン・高速表示)
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30日
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // バックエンドAPIのキャッシュ (NetworkFirstで最新優先)
            urlPattern: /\/api\/hazards.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-hazards-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1日
              },
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true, // スマホ実機(同一LAN)からアクセス可能にする
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
