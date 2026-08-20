// src/hooks/useFirestoreSync.js
import { useEffect, useRef, useState } from 'react'
import { addDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../services/firestore'
import { dailyDoc, historyCollection, liveDoc } from '../services/paths'
import { emptyRollup, mergeDailyRollup } from '../utils/dailyRollup'

// Cukup untuk membentuk tren harian di halaman Riwayat, sekaligus menghindari
// kuota write Firestore membengkak (firmware kirim BLE tiap ~300ms — jelas
// terlalu sering untuk ditulis satu-satu ke Firestore).
const SYNC_INTERVAL_MS = 60000

// Firestore menolak `undefined`, jadi area yang tidak terbaca disimpan `null`
// — bukan 0, supaya "sensor tidak mengirim" bisa dibedakan dari "0 °C".
const areaTemp = (points, key) => (Number.isFinite(points?.[key]) ? points[key] : null)

function pickSnapshot(reading, steps, wearMinutes) {
  const rise = reading?.temperatureRise
  if (!reading) return null
  const tempPoints = reading.temperatureObj?.points
  return {
    humidity: reading.humidity,
    temperature: reading.temperature,
    // Suhu PER AREA dari ketiga NTC + selisihnya. Sebelumnya hanya `highest`
    // yang disimpan, sehingga `delta` — prediktor pre-ulkus paling bernilai di
    // sistem ini — dievaluasi live lalu hilang begitu sesi berakhir dan tidak
    // pernah bisa ditampilkan sebagai tren di halaman Riwayat.
    temperatureMetatarsal: areaTemp(tempPoints, 'metatarsal'),
    temperatureHeel: areaTemp(tempPoints, 'heel'),
    temperatureLateral: areaTemp(tempPoints, 'lateral'),
    temperatureDelta: Number.isFinite(reading.temperatureObj?.delta)
      ? reading.temperatureObj.delta
      : 0,
    // KENAIKAN dari awal sesi — tiga angka yang bersama-sama menjelaskan
    // polanya, bukan hanya besarnya.
    //
    // `risenCount` dari `areaCount` inilah yang membedakan panas menyeluruh
    // (semua titik naik, sistemik) dari peradangan setempat (satu titik naik).
    // Menyimpan besar kenaikannya saja akan membuat halaman Riwayat tidak bisa
    // membedakan keduanya sama sekali. Lihat utils/temperatureRise.js.
    temperatureRise: Number.isFinite(rise?.maxRise) ? rise.maxRise : 0,
    temperatureRisenAreas: Number.isFinite(rise?.risenCount) ? rise.risenCount : 0,
    temperatureAreaCount: Number.isFinite(rise?.areaCount) ? rise.areaCount : 0,
    temperatureSystemic: Boolean(rise?.systemic),
    pressure1: reading.pressure1,
    pressure2: reading.pressure2,
    pressure3: reading.pressure3,
    // Langkah KUMULATIF sejak sesi pemakaian ini dimulai (bukan tambahan
    // sejak sync terakhir). Dipasangkan dengan sessionId di bawah supaya
    // rangkuman harian bisa menjumlahkan beberapa sesi dalam satu hari tanpa
    // menghitung ganda — lihat mergeDailyRollup di utils/dailyRollup.js.
    steps: Number(steps) || 0,
    // Lama perangkat terhubung, berpasangan dengan `steps`.
    //
    // Sebelumnya hanya `steps` yang ditulis dan bahkan itu tidak pernah dibaca
    // balik (useSensorData mencari field `activity` yang tidak pernah ada),
    // sehingga kartu Aktivitas jatuh ke nol begitu BLE terputus — padahal
    // langkahnya sungguh-sungguh sudah terjadi hari itu.
    wearMinutes: Number(wearMinutes) || 0,
    tanggal: reading.tanggal,
    waktu: reading.waktu,
  }
}

// Memutakhirkan rangkuman harian di dalam transaksi: dua sesi pada hari yang
// sama (atau dua tab terbuka bersamaan) harus digabung, bukan saling menimpa.
async function updateDailyRollup(uid, deviceId, snapshot, sessionId) {
  const ref = dailyDoc(uid, deviceId, snapshot.tanggal)
  const sample = {
    tanggal: snapshot.tanggal,
    pressurePeak: Math.max(
      Number(snapshot.pressure1) || 0,
      Number(snapshot.pressure2) || 0,
      Number(snapshot.pressure3) || 0,
    ),
    temperature: snapshot.temperature,
    temperatureDelta: snapshot.temperatureDelta,
    temperatureRise: snapshot.temperatureRise,
    temperatureRisenAreas: snapshot.temperatureRisenAreas,
    temperatureAreaCount: snapshot.temperatureAreaCount,
    temperatureSystemic: snapshot.temperatureSystemic,
    humidity: snapshot.humidity,
    steps: snapshot.steps,
    wearMinutes: snapshot.wearMinutes,
    sessionId,
  }

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref)
    const prev = existing.exists() ? existing.data() : emptyRollup(snapshot.tanggal)
    tx.set(ref, { ...mergeDailyRollup(prev, sample), updatedAt: serverTimestamp() })
  })
}

// Firmware ESP32 tidak punya WiFi — tidak bisa menulis langsung ke Firestore.
// Satu-satunya jalur data nyata adalah BLE ke browser ini. Supaya halaman
// Riwayat punya tren sungguhan (bukan simulasi), WEB APP ini yang menuliskan
// pembacaan BLE ke Firestore selama perangkat tersambung, ke tiga tempat:
//   live/current      -> dibaca useSensorData.js (kondisi sekarang)
//   history/{id}      -> catatan mentah per menit, append-only
//   daily/{tanggal}   -> rangkuman yang dibaca useHistoryData.js
export function useFirestoreSync(uid, deviceId, bleReading, bleActive, steps = 0, wearMinutes = 0) {
  const latestReading = useRef(null)
  const latestSteps = useRef(0)
  const latestWearMinutes = useRef(0)
  // Berapa langkah sesi ini yang SUDAH ikut tertulis ke rangkuman harian.
  //
  // Dipakai pemanggil untuk menghitung total hari ini tanpa menghitung ganda:
  // rangkuman sudah memuat nilai terakhir yang disinkronkan, jadi yang perlu
  // ditambahkan hanyalah selisih sejak penulisan itu. Lihat DashboardLayout.jsx.
  //
  // TIDAK direset ke 0 saat sesi baru dimulai, meski nilainya lalu sempat
  // membawa sisa sesi sebelumnya sampai sinkronisasi pertama selesai. Meresetnya
  // di badan effect melanggar react-hooks/set-state-in-effect, dan jendela
  // salahnya tertutup di sisi pemakai: total hari ini dijepit agar tidak pernah
  // turun di bawah angka rangkuman harian (lihat DashboardLayout.jsx).
  const [syncedSteps, setSyncedSteps] = useState(0)
  const [syncedWearMinutes, setSyncedWearMinutes] = useState(0)

  useEffect(() => {
    latestReading.current = bleReading
  }, [bleReading])

  useEffect(() => {
    latestSteps.current = steps
  }, [steps])

  useEffect(() => {
    latestWearMinutes.current = wearMinutes
  }, [wearMinutes])

  useEffect(() => {
    if (!bleActive || !uid || !deviceId) return

    // Satu id per koneksi BLE. Dibuat di dalam effect ini supaya nilainya
    // berganti tiap kali perangkat tersambung ulang — itulah yang menandai
    // batas antar "sesi pemakaian", karena hitungan langkah direset di
    // useStepCounter setiap sesi baru dimulai.
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    let cancelled = false

    // `force` melewati penjaga `cancelled`.
    //
    // Dipakai oleh penyimpanan terakhir saat sesi berakhir: pada saat itu
    // effect-nya memang sudah dibongkar, tapi justru penulisan itulah yang
    // paling tidak boleh dilewatkan. Firestore SDK mengantre tulisan secara
    // lokal, jadi memanggilnya tanpa menunggu tetap sampai.
    async function sync({ force = false } = {}) {
      const snapshot = pickSnapshot(
        latestReading.current,
        latestSteps.current,
        latestWearMinutes.current,
      )
      if (!snapshot || (cancelled && !force)) return
      try {
        await setDoc(liveDoc(uid, deviceId), {
          ...snapshot,
          updatedAt: serverTimestamp(),
        })
        await addDoc(historyCollection(uid, deviceId), {
          ...snapshot,
          sessionId,
          createdAt: serverTimestamp(),
        })
        await updateDailyRollup(uid, deviceId, snapshot, sessionId)
        if (!cancelled) {
          setSyncedSteps(snapshot.steps)
          setSyncedWearMinutes(snapshot.wearMinutes)
        }
      } catch (err) {
        console.warn('Gagal menyimpan data BLE ke Firestore:', err)
      }
    }

    sync() // tulis segera saat konek, jangan tunggu interval pertama
    // Dibungkus arrow, bukan `setInterval(sync, …)` langsung: setInterval
    // mengoper id timer sebagai argumen pertama, dan argumen pertama sync()
    // adalah objek opsi. Saat ini tidak merusak apa-apa (angka yang
    // di-destructure menghasilkan force=false), tapi itu kebetulan, bukan
    // desain.
    const intervalId = setInterval(() => sync(), SYNC_INTERVAL_MS)
    // Simpan sekali lagi begitu halaman disembunyikan.
    //
    // Di ponsel, berpindah aplikasi atau mematikan layar membekukan halaman —
    // dan halaman inilah satu-satunya jalur data perangkat. Tanpa ini, langkah
    // sejak penulisan terakhir hilang begitu saja saat pengguna membuka
    // aplikasi lain sebentar.
    //
    // Hanya pada 'hidden', bukan setiap perubahan: kembali terlihat tidak
    // menghasilkan data baru yang perlu disimpan.
    function handleVisibility() {
      if (document.visibilityState === 'hidden') sync({ force: true })
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)

      // PENYIMPANAN TERAKHIR SAAT SESI BERAKHIR.
      //
      // Tanpa ini, seluruh langkah sejak penulisan terakhir hilang — dan untuk
      // sesi yang lebih pendek dari SYNC_INTERVAL_MS, itu berarti SELURUH
      // langkah sesi itu. Penulisan pertama saat menyambung selalu berisi nol
      // langkah (belum ada yang terhitung), jadi sesi 45 detik dulu tidak
      // meninggalkan jejak sama sekali.
      //
      // Ref masih memegang nilai lama di sini: React menjalankan seluruh
      // cleanup sebelum badan effect, jadi `latestSteps.current` belum sempat
      // diturunkan ke nol oleh useStepCounter yang mereset sesi.
      sync({ force: true })
      cancelled = true
    }
  }, [uid, deviceId, bleActive])

  return { syncedSteps, syncedWearMinutes }
}
