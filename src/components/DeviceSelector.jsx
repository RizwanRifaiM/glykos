import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconChevronDown } from './icons'

export default function DeviceSelector({ devices, selectedId, onSelect }) {
  const entries = Object.entries(devices)
  const selected = devices[selectedId]
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <small>{selectedId} · Kaki {selected?.foot === 'left' ? 'Kiri' : 'Kanan'}</small>
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
                  <small>{id} · Kaki {device.foot === 'left' ? 'Kiri' : 'Kanan'}</small>
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
