import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/CREATIVE_AI/',
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'rete-vendor': [
            'rete',
            'rete-area-plugin',
            'rete-connection-plugin',
            'rete-react-plugin',
            'rete-render-utils',
            'rete-scopes-plugin',
          ],
          'three-vendor': ['three', 'rete-area-3d-plugin'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})
