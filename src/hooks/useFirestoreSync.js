// src/hooks/useFirestoreSync.js
import { useEffect, useRef } from 'react'
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

function pickSnapshot(reading, steps) {
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
    pressure1: reading.pressure1,
    pressure2: reading.pressure2,
    pressure3: reading.pressure3,
    // Langkah KUMULATIF sejak sesi pemakaian ini dimulai (bukan tambahan
    // sejak sync terakhir). Dipasangkan dengan sessionId di bawah supaya
    // rangkuman harian bisa menjumlahkan beberapa sesi dalam satu hari tanpa
    // menghitung ganda — lihat mergeDailyRollup di utils/dailyRollup.js.
    steps: Number(steps) || 0,
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
    humidity: snapshot.humidity,
    steps: snapshot.steps,
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
export function useFirestoreSync(uid, deviceId, bleReading, bleActive, steps = 0) {
  const latestReading = useRef(null)
  const latestSteps = useRef(0)

  useEffect(() => {
    latestReading.current = bleReading
  }, [bleReading])

  useEffect(() => {
    latestSteps.current = steps
  }, [steps])

  useEffect(() => {
    if (!bleActive || !uid || !deviceId) return

    // Satu id per koneksi BLE. Dibuat di dalam effect ini supaya nilainya
    // berganti tiap kali perangkat tersambung ulang — itulah yang menandai
    // batas antar "sesi pemakaian", karena hitungan langkah direset di
    // useStepCounter setiap sesi baru dimulai.
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    let cancelled = false

    async function sync() {
      const snapshot = pickSnapshot(latestReading.current, latestSteps.current)
      if (!snapshot || cancelled) return
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
      } catch (err) {
        console.warn('Gagal menyimpan data BLE ke Firestore:', err)
      }
    }

    sync() // tulis segera saat konek, jangan tunggu interval pertama
    const intervalId = setInterval(sync, SYNC_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [uid, deviceId, bleActive])
}
