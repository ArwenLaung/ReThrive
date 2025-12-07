import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(), // Must be called as a function
        autoprefixer(), // Must be called as a function
      ],
    }
  }
})