import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { activateLocale, LOCALE_NAMES, LOCALES } from '../i18n'

// Pemilih bahasa.
//
// Bentuknya dua tombol, bukan <select>: hanya ada dua bahasa, dan seorang
// pengguna yang tersesat di bahasa yang tidak ia mengerti harus bisa melihat
// pilihannya SEKALIGUS tanpa membuka menu dulu. Dropdown menyembunyikan jalan
// keluarnya di balik satu ketukan tambahan.
//
// Label memakai endonim ("English", "Bahasa Indonesia" — lihat LOCALE_NAMES),
// jadi keduanya selalu terbaca oleh penuturnya masing-masing apa pun bahasa
// yang sedang aktif.
export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useLingui()
  const [switching, setSwitching] = useState(null)

  async function handleSelect(locale) {
    if (locale === i18n.locale || switching) return
    setSwitching(locale)
    try {
      await activateLocale(locale)
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div
      className={`lang-switch ${compact ? 'lang-switch--compact' : ''}`}
      role="group"
      // Diberi label dalam KEDUA bahasa dengan sengaja, jadi TIDAK
      // diterjemahkan. Ini satu-satunya kontrol yang perlu dikenali justru oleh
      // orang yang tidak mengerti bahasa yang sedang aktif — termasuk lewat
      // pembaca layar.
      // eslint-disable-next-line lingui/no-unlocalized-strings
      aria-label="Bahasa / Language"
    >
      {LOCALES.map((locale) => {
        const active = i18n.locale === locale
        return (
          <button
            key={locale}
            type="button"
            className={`lang-switch__btn ${active ? 'lang-switch__btn--active' : ''}`}
            onClick={() => handleSelect(locale)}
            // aria-pressed, bukan aria-current: ini tombol pilihan dua arah,
            // bukan penanda posisi navigasi.
            aria-pressed={active}
            disabled={switching !== null}
            lang={locale}
          >
            {compact ? locale.toUpperCase() : LOCALE_NAMES[locale]}
          </button>
        )
      })}
    </div>
  )
}
