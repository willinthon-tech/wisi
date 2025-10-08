import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    force: true
  },
  optimizeDeps: {
    force: true
  }
});

