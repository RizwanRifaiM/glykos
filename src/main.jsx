import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '@lingui/react'

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
import { i18n, initI18n } from './i18n'
import { registerServiceWorker } from './utils/registerServiceWorker'

registerServiceWorker()

// Bahasa diaktifkan SEBELUM render pertama, bukan di dalam effect.
//
// Kalau katalognya dimuat setelah render, halaman sempat tampil dalam bahasa
// sumber (Indonesia) lalu berkedip ke bahasa yang sebenarnya dipilih. Untuk
// pengguna berbahasa Inggris, kedipan itu terjadi di SETIAP pemuatan halaman —
// dan pada koneksi lambat bukan sekadar kedipan, tapi beberapa detik teks yang
// tidak ia mengerti. Menunggu satu katalog (beberapa kB) jauh lebih murah
// daripada itu.
await initI18n()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
)
