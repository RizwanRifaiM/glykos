// Kontrol pilihan bersegmen untuk 2–3 opsi pendek (ya/tidak/tidak tahu).
//
// Menggantikan <select> untuk pertanyaan seperti "Pernah ulkus?": semua
// pilihan terlihat sekaligus dan dijawab dengan satu ketukan, alih-alih
// membuka menu untuk dua kata. Di baliknya tetap radio button sungguhan
// dalam <fieldset> — navigasi panah, pembaca layar, dan validasi formulir
// bekerja tanpa kode tambahan.
//
// `options[].label` sudah berupa TEKS (pemanggil menyelesaikan deskriptornya),
// sesuai aturan "komponen selalu menerima teks" di eslint.config.js.
export default function SegmentedControl({ name, legend, hint, value, options, onChange }) {
  return (
    <fieldset className="segmented">
      <legend className="segmented__legend">{legend}</legend>
      <div className="segmented__track">
        {options.map((option) => (
          <label
            key={option.value}
            className={`segmented__option${value === option.value ? ' segmented__option--active' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="profile-field__hint">{hint}</p>}
    </fieldset>
  )
}
