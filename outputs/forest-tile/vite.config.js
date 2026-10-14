import { defineConfig } from 'vite';

// Three.js and the post-processing libraries change far less often than the app,
// so they ship as separate chunks that stay cached between deploys.
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], effects: ['postprocessing', 'n8ao'] },
      },
    },
  },
});
