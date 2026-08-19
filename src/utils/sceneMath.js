// src/utils/sceneMath.js
// Matematika kecil yang dipakai scene 3D landing page — fungsi murni, tanpa
// three.js maupun DOM, supaya bisa diuji langsung (sceneMath.test.js).
//
// Sengaja tidak mengimpor three.js: file ini ikut chunk landing page yang
// dimuat langsung, sementara three.js baru diunduh saat scene-nya mendekati
// layar. Satu import saja akan menarik ~180 kB gzip itu ke jalur kritis.

export const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)

export const lerp = (from, to, t) => from + (to - from) * t

// Peredam yang TIDAK bergantung pada frame rate. `lerp(a, b, 0.1)` tiap frame
// berarti layar 120 Hz mengejar dua kali lebih cepat daripada 60 Hz — animasi
// yang sama terasa berbeda di perangkat berbeda. `smoothing` adalah bagian
// jarak yang TERSISA setelah satu detik, jadi hasilnya sama di frame rate mana
// pun.
export function damp(from, to, smoothing, deltaSec) {
  if (!Number.isFinite(deltaSec) || deltaSec <= 0) return from
  return lerp(from, to, 1 - Math.pow(smoothing, deltaSec))
}

// Sejauh mana sebuah elemen sudah melintasi viewport.
//   0   = tepi atasnya baru saja muncul dari bawah layar
//   0.5 = pusatnya tepat di tengah layar
//   1   = tepi bawahnya baru saja keluar lewat atas layar
//
// Dipakai untuk menggerakkan kamera & jarak urai mengikuti gulir. Rentangnya
// dibuat berdasarkan pusat elemen, bukan tepinya, supaya elemen yang lebih
// tinggi dari viewport tetap memakai seluruh rentang 0..1 — kalau memakai
// tepi, elemen setinggi itu tidak pernah mencapai salah satu ujungnya.
export function viewportProgress(rect, viewportHeight) {
  if (!rect || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0
  const center = rect.top + rect.height / 2
  const travel = viewportHeight + rect.height
  if (travel <= 0) return 0
  // center = viewportHeight + rect.height/2  -> tepat sebelum masuk  -> 0
  // center = -rect.height/2                  -> tepat setelah keluar -> 1
  return clamp01((viewportHeight + rect.height / 2 - center) / travel)
}

// Titik sensor menempel di permukaan sepatu yang BERPUTAR, jadi separuh
// waktunya berada di sisi yang membelakangi kamera. Label yang tetap terbaca
// penuh di sana terlihat melayang lepas dari modelnya.
//
// `dot` = hasil dot product antara normal permukaan titik itu dan arah menuju
// kamera, keduanya ternormalisasi. Positif berarti menghadap kamera.
// Ambangnya dimulai sedikit di atas nol supaya titik tepat di siluet — yang
// paling tipis dan paling mudah salah baca posisinya — sudah memudar duluan.
export function facingOpacity(dot, start = 0.08, full = 0.4) {
  if (!Number.isFinite(dot)) return 0
  if (dot <= start) return 0
  if (dot >= full) return 1
  return (dot - start) / (full - start)
}

// Memetakan progres gulir ke jarak urai (exploded view).
//
// Bagian awal dan akhir sengaja DIBUANG: saat section baru muncul di tepi
// bawah layar, pengguna belum benar-benar melihatnya, dan mengurai di sana
// berarti gerakan terbaiknya terjadi di luar perhatian. Rentang efektifnya
// dipusatkan, lalu diberi easing supaya berhenti melambat di kedua ujung
// alih-alih berhenti mendadak.
export function explodeAmount(progress, from = 0.2, to = 0.68) {
  const span = to - from
  if (span <= 0) return 0
  const t = clamp01((clamp01(progress) - from) / span)
  // smoothstep
  return t * t * (3 - 2 * t)
}

// Easing dengan lewatan (overshoot): nilainya menembus 1 sedikit lalu kembali.
// Dipakai untuk kemunculan titik sensor — tumbuh lurus ke ukuran akhir terbaca
// sebagai elemen yang "di-set", sementara sedikit lewatan terbaca sebagai
// benda yang mendarat. Itu perbedaan antara tampilan yang hidup dan yang
// sekadar berubah keadaan.
export function easeOutBack(t, overshoot = 1.9) {
  const x = clamp01(t)
  const c3 = overshoot + 1
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2)
}

// Progres satu elemen dalam urutan bertahap.
//
// Tiga titik sensor yang muncul BERSAMAAN terbaca sebagai satu kejadian; yang
// muncul berurutan terbaca sebagai tiga sensor yang berbeda — dan itu memang
// yang ingin disampaikan. `offset` menunda seluruh urutan sampai animasi masuk
// modelnya selesai, supaya keduanya tidak bertabrakan.
export function staggerProgress(elapsedSec, index, { offset = 0, delay = 0.18, duration = 0.5 }) {
  if (duration <= 0) return 1
  return clamp01((elapsedSec - offset - index * delay) / duration)
}

// Ayunan mengambang. Dua gelombang dengan frekuensi yang TIDAK kelipatan satu
// sama lain, jadi pola gabungannya tidak pernah terlihat berulang persis —
// gerak yang periodenya kentara justru menarik perhatian ke sifat mekanisnya.
export function bob(elapsedSec, amplitude, speed = 1, phase = 0) {
  const t = elapsedSec * speed + phase
  return (Math.sin(t) * 0.7 + Math.sin(t * 1.618) * 0.3) * amplitude
}
