// src/services/ble.js
// Web Bluetooth client untuk perangkat Glykos (sepatu pintar berbasis ESP32).
// Kontrak firmware (JANGAN diubah — harus cocok persis):
//   - Perangkat BLE bernama "glykos device"
//   - Nordic UART Service (NUS)
//   - Koneksi difilter berdasarkan Service UUID (bukan nama)
//   - Data dikirim sebagai notify: CSV "key:value" dipisah "," diakhiri "\n"
//     contoh: F1:1234,F2:1180,F3:1502,P1:120.0,...,RH:55.2,TA:28.0,AX:0.01,...
//   - Sebagian key bisa TIDAK ADA di satu paket; paket juga bisa terpotong.
//     Parser harus tahan — kita menyimpan nilai terakhir yang valid.

export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
export const NUS_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e' // NOTIFY, ESP -> HP

export function isBleSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

// Galat BLE yang berasal dari kode kita sendiri (bukan dari Web Bluetooth API).
// `code` yang dipetakan ke pesan berbahasa pengguna ada di useBleSensor.js.
export class BleError extends Error {
  constructor(code) {
    super(code)
    this.name = 'BleError'
    this.code = code
  }
}

// Ubah satu baris "K:V,K:V" menjadi { K: number, ... }.
// Pair tanpa ":" atau nilai non-numerik diabaikan (tahan paket rusak).
export function parseCsvLine(line) {
  const out = {}
  if (!line) return out
  for (const pair of line.split(',')) {
    const idx = pair.indexOf(':')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const rawValue = pair.slice(idx + 1).trim()
    if (!key || rawValue === '') continue
    const num = Number(rawValue)
    if (Number.isNaN(num)) continue
    out[key] = num
  }
  return out
}

export class BleSensor {
  constructor({ onReading, onStatus } = {}) {
    this.onReading = onReading
    this.onStatus = onStatus
    this.device = null
    this.characteristic = null
    this._buffer = '' // sisa baris yang belum diakhiri "\n"
    this._last = {} // gabungan nilai valid terakhir dari semua paket

    this._handleDisconnected = this._handleDisconnected.bind(this)
    this._handleValueChanged = this._handleValueChanged.bind(this)
  }

  async connect() {
    if (!isBleSupported()) {
      // KODE, bukan kalimat — berkas ini sengaja tidak memuat teks antarmuka.
      //
      // Pesan yang tampil ke pengguna dirakit useBleSensor.js dari kode ini
      // (pola yang sama seperti utils/authErrors.js untuk kode error Firebase).
      // Alasannya: lapisan servis tidak punya akses ke bahasa yang sedang
      // aktif, dan kalaupun dipaksa punya, ia jadi satu-satunya tempat teks
      // antarmuka hidup di luar komponen — tempat yang paling mudah terlewat
      // saat memeriksa cakupan terjemahan.
      throw new BleError('ble/unsupported')
    }

    this._emitStatus('connecting')
    try {
      // Filter berdasarkan Service UUID sesuai kontrak firmware (bukan nama).
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NUS_SERVICE_UUID] }],
        optionalServices: [NUS_SERVICE_UUID],
      })

      this.device = device
      device.addEventListener('gattserverdisconnected', this._handleDisconnected)

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService(NUS_SERVICE_UUID)
      const characteristic = await service.getCharacteristic(NUS_TX_CHAR_UUID)
      this.characteristic = characteristic

      characteristic.addEventListener('characteristicvaluechanged', this._handleValueChanged)
      await characteristic.startNotifications()

      this._buffer = ''
      this._last = {}
      this._emitStatus('connected', device.name || 'glykos device')
      return device
    } catch (error) {
      this._emitStatus('error', undefined, error)
      throw error
    }
  }

  async disconnect() {
    try {
      if (this.characteristic) {
        this.characteristic.removeEventListener(
          'characteristicvaluechanged',
          this._handleValueChanged,
        )
        try {
          await this.characteristic.stopNotifications()
        } catch {
          // sudah terputus — abaikan
        }
      }
      if (this.device) {
        this.device.removeEventListener('gattserverdisconnected', this._handleDisconnected)
        if (this.device.gatt?.connected) this.device.gatt.disconnect()
      }
    } finally {
      this.characteristic = null
      this.device = null
      this._buffer = ''
      this._emitStatus('disconnected')
    }
  }

  _handleDisconnected() {
    // Dipicu firmware/OS saat koneksi hilang tak terduga.
    this.characteristic = null
    this._emitStatus('disconnected')
  }

  _handleValueChanged(event) {
    const value = event.target?.value
    if (!value) return

    this._buffer += new TextDecoder().decode(value)
    const lines = this._buffer.split('\n')
    this._buffer = lines.pop() ?? '' // baris terakhir mungkin belum lengkap

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const parsed = parseCsvLine(trimmed)
      if (Object.keys(parsed).length === 0) continue

      // Merge: key yang tidak dikirim pada paket ini mempertahankan nilai lama.
      this._last = { ...this._last, ...parsed }
      this.onReading?.({ ...this._last }, parsed)
    }
  }

  _emitStatus(status, deviceName, error) {
    this.onStatus?.({ status, deviceName, error })
  }
}
