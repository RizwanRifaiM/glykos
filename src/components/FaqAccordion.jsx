import { useLingui } from '@lingui/react'
import { FAQ_GROUPS } from '../constants/faq'
import { IconChevronDown } from './icons'

export default function FaqAccordion() {
  // useLingui(), bukan instance global: selain menerjemahkan, ini yang membuat
  // seluruh isi FAQ dirender ulang saat bahasa berganti. Lihat catatan
  // konvensi di utils/locale.js.
  const { i18n } = useLingui()

  return (
    <div className="faq">
      {FAQ_GROUPS.map((group, groupIndex) => (
        // Kunci pakai INDEKS, bukan judulnya. Judulnya sekarang berupa
        // deskriptor pesan (objek), jadi tidak bisa jadi kunci; dan kalaupun
        // dipakai teks hasil terjemahannya, seluruh daftar akan dianggap
        // berubah setiap kali bahasa diganti — React membongkar dan menyusun
        // ulang semuanya, sehingga akordeon yang sedang terbuka menutup
        // sendiri. Urutan grup di sini statis, jadi indeks justru identitas
        // yang paling stabil.
        <div key={groupIndex} className="faq-group">
          <h3 className="faq-group__title">{i18n._(group.title)}</h3>
          <div className="faq-group__list">
            {group.items.map((item, itemIndex) => (
              <details key={itemIndex} className="faq-item">
                <summary className="faq-item__question">
                  <span>{i18n._(item.question)}</span>
                  <IconChevronDown size={16} className="faq-item__chevron" />
                </summary>
                <p className="faq-item__answer">{i18n._(item.answer)}</p>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
