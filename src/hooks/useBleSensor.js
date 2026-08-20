// src/hooks/useBleSensor.js
// Membungkus BleSensor menjadi state React dan menormalkan paket CSV BLE ke
// bentuk "reading" yang sama dengan useSensorData, sehingga seluruh komponen
// dashboard (MetricCards, InsoleIllustration, alert monitor, export) bekerja
// tanpa perubahan.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { msg } from '@lingui/core/macro'
import { BleSensor, isBleSupported } from '../services/ble'
import { toDateKey, toTimeKey } from '../utils/formatTime'

// Baru ada satu perangkat, dipasang di kaki KANAN.
const DEVICE_META = { id: 'glykos-device', name: 'Glykos Device', foot: 'right' }

// Pemetaan lokasi sesuai kontrak firmware:
//   P1 = Hallux (jari kaki),  P2 = Metatarsal1,  P3 = Tumit
// F1/F2/F3 = tegangan mentah FSR (mV) — hanya dipakai kalau P tidak dikirim.
// Faktor konversi ini PLACEHOLDER; ganti dengan kurva kalibrasi FSR nyata.
const FSR_MV_TO_KPA = 0.1

const round1 = (n) => Math.round(n * 10) / 10

// Ambil kPa: utamakan P (siap pakai); fallback estimasi dari F (mV).
function toKpa(pValue, fValue) {
  if (typeof pValue === 'number') return round1(pValue)
  if (typeof fValue === 'number') return round1(fValue * FSR_MV_TO_KPA)
  return 0
}

function normalizeBleReading(raw, receivedAt, isConnected) {
  const toe = toKpa(raw.P1, raw.F1) // Hallux
  const metatarsal = toKpa(raw.P2, raw.F2) // Metatarsal1
  const heel = toKpa(raw.P3, raw.F3) // Tumit

  const peak = Math.max(heel, metatarsal, toe)
  let location = 'metatarsal'
  if (peak === heel) location = 'heel'
  else if (peak === toe) location = 'toe'

  // Suhu NTC — firmware mengirim TIGA sensor (GPIO 35/32/33), sudah dalam
  // derajat Celsius (dihitung di ESP32 pakai Beta 3950), bukan mV mentah.
  //   T1 = forefoot -> metatarsal
  //   T2 = tumit    -> heel
  //   T3 = lateral  -> lateral  (sisi LUAR telapak, bukan jari kaki)
  //
  // Dua area pertama sengaja memakai kunci yang sama dengan pressure.points
  // supaya kartu Tekanan & Suhu menyebut area yang sama dengan nama yang sama
  // (lihat LOCATION_LABELS di constants/thresholds.js). `lateral` TIDAK punya
  // pasangan sensor tekanan — memang tidak ada FSR di sisi luar telapak — jadi
  // wajar kalau point-grid kedua kartu tidak identik.
  //
  // Selisih terbesar antar area yang tersedia adalah prediktor pre-ulkus
  // (dipakai oleh threshold TEMP_DELTA_WARNING). Dengan tiga titik, rentang
  // yang tercakup jadi lebih luas daripada saat masih dua titik.
  //
  // Number.isFinite (bukan typeof): NaN lolos dari `typeof x === 'number'`.
  // parseCsvLine sudah membuang "nan" yang dikirim firmware saat NTC lepas/
  // short, jadi key-nya hilang — tapi guard ini menutup jalur itu di sisi sini
  // juga, supaya NaN tidak pernah sampai ke perhitungan atau ke SVG.
  const t1 = Number.isFinite(raw.T1) ? round1(raw.T1) : null
  const t2 = Number.isFinite(raw.T2) ? round1(raw.T2) : null
  const t3 = Number.isFinite(raw.T3) ? round1(raw.T3) : null
  const tempAreas = [
    { key: 'metatarsal', value: t1 },
    { key: 'heel', value: t2 },
    { key: 'lateral', value: t3 },
  ].filter((area) => area.value !== null)

  const temps = tempAreas.map((area) => area.value)
  const highest = temps.length ? Math.max(...temps) : 0
  const lowest = temps.length ? Math.min(...temps) : 0
  const delta = temps.length >= 2 ? round1(highest - lowest) : 0
  const tempLocation = tempAreas.find((area) => area.value === highest)?.key ?? 'metatarsal'

  const tempPoints = {}
  tempAreas.forEach((area) => {
    tempPoints[area.key] = area.value
  })

  const humidity = typeof raw.RH === 'number' ? round1(raw.RH) : 0
  const now = receivedAt ? new Date(receivedAt) : new Date()

  return {
    // Field standar (selaras dengan useSensorData)
    id: DEVICE_META.id,
    deviceId: DEVICE_META.id,
    device: DEVICE_META,
    humidity,
    temperature: highest,
    pressure1: heel,
    pressure2: metatarsal,
    pressure3: toe,
    tanggal: toDateKey(now),
    waktu: toTimeKey(now),

    connection: {
      wifi: isConnected, // memicu badge "Live" pada ConnectionBar
      signalStrength: -50,
      lastUpdate: now,
    },
    pressure: {
      // Lihat catatan yang sama di useSensorData.js: jangan tambahkan alias
      // pressure1/2/3 di sini — PressureCard me-render seluruh isi `points`.
      peak,
      location,
      points: {
        heel,
        metatarsal,
        toe,
      },
    },
    temperatureObj: {
      // T1/T2/T3 = forefoot/tumit/lateral pada SATU kaki (kanan) — tiga titik
      // pada kaki yang SAMA, bukan perbandingan kaki kiri vs kanan.
      // Perangkatnya cuma satu. Nilai per area ada di `points`; yang tersisa
      // di sini hanyalah nilai turunan (highest & delta).
      highest,
      location: tempLocation,
      points: tempPoints,
      delta,
    },
    // Firmware hanya mengirim akselerasi mentah (AX/AY/AZ), belum langkah kaki.
    activity: null,
    airTemperature: typeof raw.TA === 'number' ? round1(raw.TA) : null,
    accel: {
      x: raw.AX ?? null,
      y: raw.AY ?? null,
      z: raw.AZ ?? null,
    },
  }
}

// Pesan galat BLE dipetakan dari KODE (lihat BleError di services/ble.js),
// bukan disimpan sebagai kalimat.
//
// Bedanya terasa saat pengguna mengganti bahasa selagi pesan galatnya masih
// tampil di layar: kalau yang tersimpan di state sudah berupa kalimat, ia
// tertinggal di bahasa lama sementara tombol dan penjelasan di sekitarnya sudah
// berganti.
const BLE_ERROR_MESSAGES = {
  'ble/unsupported': msg`Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge lewat http://localhost atau HTTPS.`,
}

export function useBleSensor() {
  const [status, setStatus] = useState('idle') // idle|connecting|connected|disconnected|error
  const [deviceName, setDeviceName] = useState(null)
  // { code } untuk galat kita sendiri, { text } untuk pesan dari Web Bluetooth
  // API yang memang tidak bisa kita terjemahkan.
  const [errorState, setErrorState] = useState(null)
  const [raw, setRaw] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const sensorRef = useRef(null)
  const { i18n } = useLingui()

  useEffect(() => {
    const sensor = new BleSensor({
      onReading: (merged) => {
        setRaw(merged)
        setUpdatedAt(Date.now())
      },
      onStatus: ({ status: next, deviceName: name, error: err }) => {
        setStatus(next)
        if (name) setDeviceName(name)
        if (err) {
          setErrorState(err.code ? { code: err.code } : { text: err.message || String(err) })
        } else if (next === 'connecting' || next === 'connected') {
          setErrorState(null)
        }
      },
    })
    sensorRef.current = sensor
    return () => {
      sensor.disconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    setErrorState(null)
    try {
      await sensorRef.current?.connect()
    } catch (err) {
      // Pengguna menutup dialog pemilih perangkat -> NotFoundError, bukan error nyata.
      if (err?.name === 'NotFoundError') {
        setStatus('idle')
        setErrorState(null)
      }
      // Error lain sudah dilaporkan lewat onStatus('error').
    }
  }, [])

  const disconnect = useCallback(async () => {
    await sensorRef.current?.disconnect()
    setRaw(null)
    setUpdatedAt(null)
  }, [])

  const isConnected = status === 'connected'

  const reading = useMemo(() => {
    if (!raw) return null
    return normalizeBleReading(raw, updatedAt, isConnected)
  }, [raw, updatedAt, isConnected])

  // Diterjemahkan saat DIBACA, bukan saat disimpan — jadi pesan yang sedang
  // tampil ikut berganti begitu bahasa diubah.
  const error = errorState?.code
    ? i18n._(BLE_ERROR_MESSAGES[errorState.code] ?? BLE_ERROR_MESSAGES['ble/unsupported'])
    : (errorState?.text ?? null)

  return {
    supported: isBleSupported(),
    status,
    isConnected,
    deviceName,
    error,
    reading,
    connect,
    disconnect,
  }
}
