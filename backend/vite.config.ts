import { defineConfig } from 'vite';

export default defineConfig({
  root: 'dashboards_bundle',
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  build: {
    outDir: '../dist-dashboards',
    emptyOutDir: true,
  },
});
