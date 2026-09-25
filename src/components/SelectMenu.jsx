import { useEffect, useId, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from './icons'

// Pengganti <select> dengan daftar pilihan yang bisa ditata.
//
// KENAPA TIDAK <select> BIASA
// Menu yang muncul saat <select> dibuka digambar oleh sistem operasi, bukan
// oleh halaman: CSS tidak bisa menyentuhnya. Di Windows hasilnya daftar
// abu-abu bergaya lama di tengah antarmuka yang lain sama sekali, dan tidak
// ada tempat untuk keterangan per pilihan ("Tipe 2 — tubuh tidak memakai
// insulin secara efektif").
//
// POLA ARIA: "select-only combobox" (WAI-ARIA Authoring Practices)
// Fokus TETAP di tombol pemicu; pilihan yang sedang disorot diumumkan lewat
// aria-activedescendant. Tidak ada fokus yang berpindah ke dalam daftar, jadi
// tidak ada fokus yang bisa hilang saat daftar ditutup.
//
// Keyboard (sama dengan <select> bawaan, supaya tidak ada yang perlu
// dipelajari ulang):
//   Tertutup  ↓ ↑ Enter Spasi — buka; Home/End — buka di ujung; huruf — lompat
//   Terbuka   ↓ ↑ Home End — sorot; Enter/Spasi — pilih; Esc/Tab — tutup;
//             huruf — lompat ke pilihan yang diawali huruf itu
//
// `options[].label` & `.description` sudah berupa TEKS — komponen tidak
// menyentuh deskriptor pesan (lihat eslint.config.js).
export default function SelectMenu({ id, value, options, placeholder, onChange }) {
  const generatedId = useId()
  const baseId = id ?? generatedId
  const listId = `${baseId}-list`
  const optionId = (index) => `${baseId}-opt-${index}`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef(null)
  const listRef = useRef(null)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = options[selectedIndex]

  // Klik/ketuk di luar menutup daftar. pointerdown, bukan click: daftar harus
  // sudah tertutup sebelum elemen lain menerima kliknya.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Pilihan yang disorot selalu terlihat di dalam daftar yang bisa digulir.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function openAt(index) {
    setActiveIndex(index)
    setOpen(true)
  }

  function choose(index) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  // Lompat ke pilihan berikutnya yang diawali huruf yang diketik, berputar
  // dari posisi sekarang — perilaku yang sama dengan <select> bawaan.
  function matchFrom(start, char) {
    const lower = char.toLowerCase()
    for (let step = 1; step <= options.length; step += 1) {
      const index = (start + step) % options.length
      if (options[index].label.toLowerCase().startsWith(lower)) return index
    }
    return -1
  }

  function handleKeyDown(event) {
    const last = options.length - 1
    const current = open ? activeIndex : selectedIndex

    if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey) {
      const match = matchFrom(current < 0 ? -1 : current, event.key)
      if (match >= 0) {
        event.preventDefault()
        if (open) setActiveIndex(match)
        else onChange(options[match].value)
      }
      return
    }

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openAt(selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowUp' ? last : 0)
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        openAt(event.key === 'Home' ? 0 : last)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, last))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      default:
    }
  }

  return (
    <div className={`select-menu${open ? ' select-menu--open' : ''}`} ref={rootRef}>
      <button
        id={baseId}
        type="button"
        role="combobox"
        className="select-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? 'select-menu__value' : 'select-menu__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevronDown size={16} className="select-menu__chevron" />
      </button>

      {/* Daftar tetap ada di DOM saat tertutup (hanya disembunyikan) supaya
          aria-controls selalu menunjuk elemen yang nyata. */}
      <ul
        id={listId}
        ref={listRef}
        role="listbox"
        className="select-menu__list"
        hidden={!open}
        tabIndex={-1}
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex
          const isActive = index === activeIndex
          return (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              data-index={index}
              aria-selected={isSelected}
              className={[
                'select-menu__option',
                isActive ? 'select-menu__option--active' : '',
                isSelected ? 'select-menu__option--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onPointerMove={() => setActiveIndex(index)}
              // mousedown dicegah supaya fokus tidak pindah dari tombol
              // pemicu — keyboard tetap bekerja setelah memilih dengan mouse.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span className="select-menu__option-text">
                <span className="select-menu__option-label">{option.label}</span>
                {option.description && (
                  <span className="select-menu__option-description">{option.description}</span>
                )}
              </span>
              <IconCheck size={16} className="select-menu__check" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
