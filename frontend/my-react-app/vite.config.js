import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // try 5173, if taken use next available
  },
  resolve: {
    dedupe: ['react', 'react-dom'], // prevent @react-oauth/google from bundling its own React
  },
  optimizeDeps: {
    include: ['@react-oauth/google'],
  },
})
