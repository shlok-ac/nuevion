import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard Vite + React config. Nothing custom needed for Version 1.
export default defineConfig({
  plugins: [react()],
})
