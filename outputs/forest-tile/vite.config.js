import { defineConfig } from 'vite';

// Three.js and the post-processing libraries change far less often than the app,
// so they ship as separate chunks that stay cached between deploys. The physics
// engine (Rapier, WASM inlined, about 1 MB gzipped) loads on its own after the scene shows.
export default defineConfig({
  // Rapier is imported lazily; pre-bundle it so the dev server never serves a stale copy.
  optimizeDeps: { include: ['@dimforge/rapier3d-compat'] },
  build: {
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
