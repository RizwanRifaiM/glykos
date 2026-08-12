import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Tidak ada proxy dev di sini: konfigurasi lama meneruskan `/api` ke
// http://localhost:4000 padahal tidak ada backend di repo ini sama sekali —
// seluruh data lewat Firebase SDK langsung dari browser.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
