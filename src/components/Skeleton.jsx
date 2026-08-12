// Skeleton screen — kerangka abu-abu yang meniru bentuk konten yang sedang
// dimuat, menggantikan tulisan "Memuat…" di tengah kotak kosong.
//
// Alasannya bukan sekadar gaya: kerangka yang GEOMETRINYA SAMA dengan konten
// aslinya membuat tata letak tidak melompat saat data tiba, dan pengguna sudah
// bisa membaca strukturnya (ada tabel 7 kolom, ada daftar) sebelum angkanya
// ada. Karena itu tiap kerangka di bawah dibuat mengikuti markup aslinya, dan
// harus ikut diperbarui kalau markup itu berubah.
//
// Aksesibilitas: seluruh kerangka `aria-hidden` — pembaca layar tidak perlu
// mendengar deretan kotak kosong. Yang diumumkan hanyalah satu teks status di
// wadahnya, lewat komponen SkeletonRegion.

export function Skeleton({ width, height, radius, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}

// Wadah yang mengumumkan keadaan memuat sekali saja ke pembaca layar.
export function SkeletonRegion({ label, className = '', children }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  )
}

// Baris tabel kerangka. Dipakai LANGSUNG di dalam <tbody> halaman Riwayat
// supaya lebar kolomnya persis sama dengan tabel berisi data.
export function SkeletonTableRows({ rows = 7, columns = 7 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={rowIndex} className="skeleton-row" aria-hidden="true">
      {Array.from({ length: columns }, (_, colIndex) => (
        <td key={colIndex}>
          <Skeleton
            height={14}
            // Lebar dibuat bervariasi mengikuti isi kolom aslinya: kolom
            // pertama tanggal, kolom angka lebih pendek, dua kolom terakhir
            // berisi pil status.
            width={colIndex === 0 ? '72%' : colIndex >= columns - 2 ? '84%' : '46%'}
            radius={colIndex >= columns - 2 ? 999 : 6}
          />
        </td>
      ))}
    </tr>
  ))
}

// Daftar peringatan kerangka — meniru ikon bulat + dua baris teks + pil status.
export function SkeletonAlertList({ items = 4 }) {
  return (
    <SkeletonRegion label="Memuat riwayat peringatan" className="skeleton-list">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="skeleton-list__item" aria-hidden="true">
          <Skeleton width={38} height={38} radius={999} />
          <div className="skeleton-list__body">
            <Skeleton height={13} width={`${68 - index * 6}%`} />
            <Skeleton height={11} width={`${44 - index * 4}%`} />
          </div>
          <Skeleton width={82} height={24} radius={999} />
        </div>
      ))}
    </SkeletonRegion>
  )
}

// Kerangka satu halaman dashboard, dipakai sebagai fallback Suspense untuk
// rute anak (Ringkasan/Riwayat/Peringatan/Profil).
//
// Sengaja BUKAN AppLoader: AppLoader menutupi seluruh layar, yang tepat saat
// belum ada apa-apa di belakangnya, tapi salah saat berpindah antar halaman —
// sidebar dan topbar sudah ada di layar dan tidak perlu ikut hilang. Yang
// berganti hanya area konten, jadi hanya area itu yang berkerangka.
export function SkeletonPage() {
  return (
    <SkeletonRegion label="Memuat halaman" className="skeleton-page">
      <div className="skeleton-page__header" aria-hidden="true">
        <div className="skeleton-page__heading">
          <Skeleton height={22} width={180} />
          <Skeleton height={13} width={260} />
        </div>
        <Skeleton height={38} width={168} radius={999} />
      </div>

      <div className="skeleton-page__cards" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-page__card">
            <Skeleton height={12} width="42%" />
            <Skeleton height={34} width="62%" />
            <Skeleton height={11} width="80%" />
            <Skeleton height={54} radius={12} />
          </div>
        ))}
      </div>

      <div className="skeleton-page__panel" aria-hidden="true">
        <Skeleton height={14} width={200} />
        <Skeleton height={190} radius={16} />
      </div>
    </SkeletonRegion>
  )
}

// Form profil kerangka — meniru grid label + input.
export function SkeletonForm({ fields = 4 }) {
  return (
    <SkeletonRegion label="Memuat profil" className="skeleton-form">
      {Array.from({ length: fields }, (_, index) => (
        <div
          key={index}
          className={`skeleton-form__field${index >= 2 ? ' skeleton-form__field--full' : ''}`}
          aria-hidden="true"
        >
          <Skeleton height={12} width={index % 2 === 0 ? 108 : 132} />
          <Skeleton height={index >= 2 ? 76 : 42} radius={12} />
        </div>
      ))}
    </SkeletonRegion>
  )
}
