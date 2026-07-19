import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // publicado no GitHub Pages em https://rubiooangelica-ai.github.io/Mysocial/
  base: '/Mysocial/',
  plugins: [react()],
})
