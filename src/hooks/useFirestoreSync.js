// src/hooks/useFirestoreSync.js
import { useEffect, useRef } from 'react'
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

// Cukup untuk membentuk tren harian di halaman Riwayat, sekaligus menghindari
// kuota write Firestore membengkak (firmware kirim BLE tiap ~300ms — jelas
// terlalu sering untuk ditulis satu-satu ke Firestore).
const SYNC_INTERVAL_MS = 60000

function pickSnapshot(reading) {
  if (!reading) return null
  return {
    humidity: reading.humidity,
    temperature: reading.temperature,
    pressure1: reading.pressure1,
    pressure2: reading.pressure2,
    pressure3: reading.pressure3,
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
export function useFirestoreSync(deviceId, bleReading, bleActive) {
  const latestReading = useRef(null)

  useEffect(() => {
    latestReading.current = bleReading
  }, [bleReading])

  useEffect(() => {
    if (!bleActive || !deviceId) return

    async function sync() {
      const snapshot = pickSnapshot(latestReading.current)
      if (!snapshot) return
      try {
        await setDoc(doc(db, 'devices', deviceId, 'live', 'current'), {
          ...snapshot,
          updatedAt: serverTimestamp(),
        })
        await addDoc(collection(db, 'devices', deviceId, 'history'), {
          ...snapshot,
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
