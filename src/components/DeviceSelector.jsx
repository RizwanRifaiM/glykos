import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from './icons'

const footLabel = (foot) => (foot === 'left' ? 'Kiri' : 'Kanan')

export default function DeviceSelector({ devices, selectedId, onSelect }) {
  const entries = Object.entries(devices)
  const selected = devices[selectedId]
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // Baru ada satu perangkat: tampilkan sebagai label, bukan dropdown yang
  // membuka satu opsi yang sudah terpilih. Begitu perangkat kedua
  // ditambahkan di useSensorData.js, pemilihnya aktif kembali sendiri.
  const isSingleDevice = entries.length <= 1

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isSingleDevice) {
    return (
      <div className="device-picker">
        <div className="device-picker__trigger device-picker__trigger--static">
          <span className="device-picker__dot" aria-hidden="true" />
          <span className="device-picker__label">
            <strong>{selected?.name ?? selectedId}</strong>
            <small>
              {selectedId} · Kaki {footLabel(selected?.foot)}
            </small>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="device-picker" ref={rootRef}>
      <button
        type="button"
        className="device-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="device-picker__dot" aria-hidden="true" />
        <span className="device-picker__label">
          <strong>{selected?.name ?? selectedId}</strong>
          <small>
            {selectedId} · Kaki {footLabel(selected?.foot)}
          </small>
        </span>
        <IconChevronDown size={16} className="device-picker__chevron" />
      </button>

      {open && (
        <ul className="device-picker__menu" role="listbox">
          {entries.map(([id, device]) => (
            <li key={id}>
              <button
                type="button"
                role="option"
                aria-selected={selectedId === id}
                className="device-picker__option"
                onClick={() => {
                  onSelect(id)
                  setOpen(false)
                }}
              >
                <span className="device-picker__option-label">
                  <strong>{device.name}</strong>
                  <small>
                    {id} · Kaki {footLabel(device.foot)}
                  </small>
                </span>
                {selectedId === id && <IconCheck size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
