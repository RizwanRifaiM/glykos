import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { lingui, linguiTransformerBabelPreset } from '@lingui/vite-plugin'

// Tidak ada proxy dev di sini: konfigurasi lama meneruskan `/api` ke
// http://localhost:4000 padahal tidak ada backend di repo ini sama sekali —
// seluruh data lewat Firebase SDK langsung dari browser.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Macro Lingui (`t`, `<Trans>`, `plural`) ikut LINTASAN BABEL YANG SUDAH
    // ADA — yang dipasang untuk React Compiler. Tidak ada pipeline baru:
    // @lingui/vite-plugin memang menyediakan presetnya dalam bentuk yang
    // diminta @rolldown/plugin-babel, dan filter rolldown-nya membuat lintasan
    // ini hanya menyentuh berkas yang benar-benar mengimpor macro.
    babel({ presets: [reactCompilerPreset(), linguiTransformerBabelPreset()] }),
    // Mengubah impor `.po` jadi katalog terkompilasi saat build, jadi
    // `lingui compile` tidak perlu dijalankan manual dan tidak ada berkas
    // hasil compile yang harus ikut di-commit.
    //
    // failOnMissing HANYA saat build. Ini penjaga ketiga (lihat komentar di
    // lingui.config.js): pesan yang sudah terekstrak tapi terjemahan
    // Inggrisnya masih kosong akan MENGGAGALKAN BUILD, bukan diam-diam
    // tampil dalam bahasa Indonesia di antarmuka Inggris. Di `npm run dev`
    // sengaja tidak diaktifkan — saat sedang menulis fitur baru, pesan yang
    // belum diterjemahkan adalah keadaan normal sementara.
    lingui({ failOnMissing: command === 'build', failOnCompileError: true }),
  ],
  test: {
    // Util murni memakai macro `t`/`plural` yang membaca instance i18n global.
    // Berkas ini mengaktifkan locale sumber supaya pesannya jatuh ke teks
    // aslinya alih-alih bergantung pada urutan impor — lihat src/test-setup.js.
    setupFiles: ['./src/test-setup.js'],
  },
}))
