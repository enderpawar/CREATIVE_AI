import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/CREATIVE_AI/', // GitHub repository 이름으로 변경
  worker: {
    format: 'es',
  },
})
