import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Served behind a hosted preview proxy: accept any Host header and keep HMR on the proxied port.
  server: { host: true, port: 5173, strictPort: true, allowedHosts: true, hmr: { clientPort: 443 } },
  preview: { host: true, port: 5173, strictPort: true },
})
