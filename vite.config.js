import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // nova configuração para o replit 
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: {
      port: 5000
    },
    allowedHosts: [
      '34a462a9-2be2-4663-81c9-60dd79904e16-00-19cnz64ozoro9.riker.replit.dev',
      'localhost',
      '.replit.dev'
    ]
  }
})