import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  base: '/business-crm/', // REPLACE 'business-crm' with your actual repo name
})