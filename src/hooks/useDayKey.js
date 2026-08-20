// src/hooks/useDayKey.js
// Kunci tanggal hari ini ('YYYY-MM-DD'), yang berganti sendiri tepat pukul 00:00.
//
// KENAPA PERLU HOOK, BUKAN toDateKey(new Date()) DI TEMPAT PEMAKAIAN
// Dashboard ini dirancang untuk ditinggal terbuka seharian — wake lock bahkan
// sengaja menahan layar tetap menyala selama perangkat tersambung (lihat
// useWakeLock.js). Jadi halaman yang dibuka jam 23.50 masih halaman yang sama
// pada jam 00.10, dan `toDateKey(new Date())` yang dihitung saat render tidak
// akan pernah dihitung ulang dengan sendirinya. Tanpa hook ini, "hari ini"
// membeku pada tanggal saat halaman dibuka, dan pembacaan kemarin terus tampil
// sebagai pembacaan hari ini.
//
// KENAPA setTimeout KE TENGAH MALAM, BUKAN setInterval TIAP MENIT
// Detak per menit berarti 1.440 render ulang sehari untuk satu peristiwa yang
// terjadi sekali. Timer ini menembak tepat sekali, lalu menjadwalkan dirinya
// lagi untuk tengah malam berikutnya.
//
// Zona waktu mengikuti perangkat pengguna — sama seperti toDateKey, dan sama
// seperti tanggal yang tertulis di dokumen Firestore. Ketiganya harus memakai
// acuan yang sama, kalau tidak batas harinya bergeser di antara mereka.
import { useEffect, useState } from 'react'
import { toDateKey } from '../utils/formatTime'

// Milidetik dari `now` sampai tengah malam berikutnya waktu LOKAL.
//
// Dihitung lewat konstruktor Date pada tanggal+1, bukan dengan menambah
// 86.400.000 ms: pergeseran DST membuat sebagian hari berdurasi 23 atau 25 jam,
// dan penambahan tetap akan meleset sejam pada hari-hari itu.
export function msUntilNextMidnight(now = new Date()) {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  // Minimal 1 ms supaya timer tidak pernah dijadwalkan dengan 0 dan menembak
  // berulang dalam satu tick.
  return Math.max(1, nextMidnight.getTime() - now.getTime())
}

export function useDayKey() {
  const [dayKey, setDayKey] = useState(() => toDateKey(new Date()))

  useEffect(() => {
    let timeoutId

    function scheduleNext() {
      timeoutId = setTimeout(() => {
        // Dihitung ulang dari jam sistem, bukan diturunkan dari nilai
        // sebelumnya: perangkat yang tidur lalu bangun beberapa hari kemudian
        // akan melewatkan timer-nya, dan menaikkan tanggal satu per satu dari
        // nilai lama justru menghasilkan tanggal yang salah.
        setDayKey(toDateKey(new Date()))
        scheduleNext()
      }, msUntilNextMidnight())
    }

    scheduleNext()
    return () => clearTimeout(timeoutId)
  }, [])

  return dayKey
}
