// src/hooks/useFirestoreSync.js
import { useEffect, useRef } from 'react'
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

// Cukup untuk membentuk tren harian di halaman Riwayat, sekaligus menghindari
// kuota write Firestore membengkak (firmware kirim BLE tiap ~300ms — jelas
// terlalu sering untuk ditulis satu-satu ke Firestore).
const SYNC_INTERVAL_MS = 60000

function pickSnapshot(reading, steps) {
  if (!reading) return null
  return {
    humidity: reading.humidity,
    temperature: reading.temperature,
    pressure1: reading.pressure1,
    pressure2: reading.pressure2,
    pressure3: reading.pressure3,
    // Langkah KUMULATIF sejak sesi pemakaian ini dimulai (bukan tambahan
    // sejak sync terakhir). Dipasangkan dengan sessionId di bawah supaya
    // useHistoryData bisa menjumlahkan beberapa sesi dalam satu hari tanpa
    // menghitung ganda — lihat agregasi di sana.
    steps: Number(steps) || 0,
    tanggal: reading.tanggal,
    waktu: reading.waktu,
  }
}

// Firmware ESP32 tidak punya WiFi — tidak bisa menulis langsung ke Firestore.
// Satu-satunya jalur data nyata adalah BLE ke browser ini. Supaya halaman
// Riwayat (useHistoryData.js) punya tren sungguhan (bukan simulasi), WEB APP
// ini yang menuliskan pembacaan BLE ke Firestore selama perangkat tersambung
// — ke `devices/{deviceId}/live/current` (dibaca useSensorData.js) dan
// `devices/{deviceId}/history` (dibaca useHistoryData.js), keduanya memakai
// bentuk field yang sama persis: humidity/temperature/pressure1-3/tanggal/waktu.
export function useFirestoreSync(deviceId, bleReading, bleActive, steps = 0) {
  const latestReading = useRef(null)
  const latestSteps = useRef(0)

  useEffect(() => {
    latestReading.current = bleReading
  }, [bleReading])

  useEffect(() => {
    latestSteps.current = steps
  }, [steps])

  useEffect(() => {
    if (!bleActive || !deviceId) return

    // Satu id per koneksi BLE. Dibuat di dalam effect ini supaya nilainya
    // berganti tiap kali perangkat tersambung ulang — itulah yang menandai
    // batas antar "sesi pemakaian", karena hitungan langkah direset di
    // useStepCounter setiap sesi baru dimulai.
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    async function sync() {
      const snapshot = pickSnapshot(latestReading.current, latestSteps.current)
      if (!snapshot) return
      try {
        await setDoc(doc(db, 'devices', deviceId, 'live', 'current'), {
          ...snapshot,
          updatedAt: serverTimestamp(),
        })
        await addDoc(collection(db, 'devices', deviceId, 'history'), {
          ...snapshot,
          sessionId,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        console.warn('Gagal menyimpan data BLE ke Firestore:', err)
      }
    }

    sync() // tulis segera saat konek, jangan tunggu interval pertama
    const intervalId = setInterval(sync, SYNC_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [deviceId, bleActive])
}
