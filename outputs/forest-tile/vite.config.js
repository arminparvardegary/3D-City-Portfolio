import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Three.js and the post-processing libraries change far less often than the app,
// so they ship as separate chunks that stay cached between deploys. The physics
// engine (Rapier, WASM inlined, about 1 MB gzipped) loads on its own after the scene shows.
export default defineConfig({
  // The store blocks are React Three Fiber components (.tsx): automatic JSX runtime.
  esbuild: { jsx: 'automatic' },
  // Installable app with an offline cache (the 3D assets are cached as they load).
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'og.png', 'keel/*'],
    manifest: {
      name: 'Armin Parvardegary', short_name: 'Armin', description: 'Drive through my New York: my experience, my skills and Keel.',
      theme_color: '#2f6bff', background_color: '#ffffff', display: 'fullscreen', orientation: 'any',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    workbox: { maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, globPatterns: ['**/*.{js,css,html,png,svg,webp,jpg,wasm}'] },
  })],
  // Rapier is imported lazily; pre-bundle it so the dev server never serves a stale copy.
  optimizeDeps: { include: ['@dimforge/rapier3d-compat'] },
  build: {
    target: 'es2022',   // main.js loads the car models with a top level await
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      // Pages: the map (index), the corner block and New York.
      input: { main: 'index.html', block: 'block.html', nyc: 'nyc.html' },
      output: {
        manualChunks: { three: ['three'], effects: ['postprocessing', 'n8ao'] },
      },
    },
  },
});
