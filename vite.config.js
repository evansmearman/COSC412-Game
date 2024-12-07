import { defineConfig } from 'vite';
import Terminal from 'vite-plugin-terminal';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    rollupOptions: {
      external: ['/@id/__x00__virtual:terminal/console', 'socket.io-client', '@dimforge/rapier3d-compat']
    }
  },
  optimizeDeps: {
    include: ['socket.io-client', '@dimforge/rapier3d-compat']
  },
  plugins: [
    Terminal({
      console: 'terminal'
    })
  ],
  server: {
    port: 3001,
    proxy: {
      '/register': 'http://127.0.0.1:3000',
      '/login': 'http://127.0.0.1:3000',
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true
      }
    }
  }
});