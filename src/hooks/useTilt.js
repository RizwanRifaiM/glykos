import { useEffect } from 'react'

// Memasang vanilla-tilt pada sekumpulan elemen di dalam sebuah container.
//
// Import-nya DINAMIS dan berada di dalam effect, bukan di puncak berkas.
// Landing page adalah rute masuk aplikasi, jadi apa pun yang diimpor statis
// di sini ikut masuk chunk utama dan menunda render pertama. Dengan pola ini
// pustakanya baru diunduh sesudah halaman tampil — dan tidak pernah diunduh
// sama sekali oleh pengguna yang tidak akan merasakan efeknya.
//
// Syarat yang sama dengan usePointerParallax: mati saat reduced-motion, dan
// mati di perangkat tanpa pointer presisi. Di layar sentuh vanilla-tilt akan
// jatuh ke giroskop, yang berarti kartu ikut miring saat ponsel bergerak —
// gerakan yang tidak diminta pengguna dan mengganggu saat membaca.
export function useTilt(containerRef, selector, options) {
  useEffect(() => {
    const root = containerRef.current
    if (!root || typeof window === 'undefined') return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = window.matchMedia('(pointer: fine)')
    if (reduced.matches || !fine.matches) return

    const nodes = Array.from(root.querySelectorAll(selector))
    if (nodes.length === 0) return

    // `cancelled` menutup lomba antara unmount dan selesainya import: tanpa
    // ini, komponen yang dilepas sebelum modulnya tiba tetap memasang tilt
    // pada node yatim yang tidak akan pernah dibersihkan.
    let cancelled = false

    import('vanilla-tilt')
      .then(({ default: VanillaTilt }) => {
        if (cancelled) return
        VanillaTilt.init(nodes, options)
      })
      .catch(() => {
        // Efeknya dekoratif. Kalau chunk-nya gagal dimuat, kartu tetap
        // berfungsi penuh tanpa tilt — tidak ada yang perlu dilaporkan.
      })

    return () => {
      cancelled = true
      nodes.forEach((node) => node.vanillaTilt?.destroy())
    }
  }, [containerRef, selector, options])
}
