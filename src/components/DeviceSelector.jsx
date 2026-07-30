import Button from './Button'

export default function DeviceSelector({ devices, selectedId, onSelect }) {
  const entries = Object.entries(devices)

  return (
    <section className="panel device-selector">
      <h2 className="panel__title">Perangkat &amp; Pengguna</h2>
      <div className="device-selector__list">
        {entries.map(([id, device], index) => (
          <Button
            key={id}
            variantIndex={index}
            active={selectedId === id}
            onClick={() => onSelect(id)}
            className="device-selector__btn"
          >
            <span className="device-selector__id">{id}</span>
            <span className="device-selector__name">{device.name}</span>
            <span className="device-selector__foot">
              Kaki {device.foot === 'left' ? 'Kiri' : 'Kanan'}
            </span>
          </Button>
        ))}
      </div>
    </section>
  )
}
