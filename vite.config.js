// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If VITE_BASE is unset, default to root '/'
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  plugins: [react()],
  base,
})
