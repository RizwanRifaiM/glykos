import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Font di-self-host lewat @fontsource, bukan <link> ke fonts.googleapis.com.
// Tag itu render-blocking dan menambah dua koneksi ke origin pihak ketiga di
// jalur kritis — mahal justru pada koneksi seluler lambat, yang persis
// kondisi pemakaian aplikasi ini. Subset latin saja; Geist Mono hanya 400/500
// karena cuma dipakai untuk angka pembacaan sensor.
import '@fontsource/geist-sans/latin-400.css'
import '@fontsource/geist-sans/latin-500.css'
import '@fontsource/geist-sans/latin-600.css'
import '@fontsource/geist-sans/latin-700.css'
import '@fontsource/geist-mono/latin-400.css'
import '@fontsource/geist-mono/latin-500.css'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './utils/registerServiceWorker'

registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
