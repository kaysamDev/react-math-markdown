import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'demo'),
  resolve: {
    alias: {
      'react-math-markdown': resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
