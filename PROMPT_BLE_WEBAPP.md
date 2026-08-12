# Prompt Claude CLI — Terima Data BLE ESP32 di Web App

Dokumen ini berisi **kontrak BLE** firmware ESP32 Smart Insole sebagai acuan, plus
**prompt siap-tempel** untuk Claude CLI kalau penerima BLE perlu dibangun dari nol
di project lain.

> **Untuk project ini (`glykos`), bagian 1 tidak perlu dipakai.** Ini aplikasi
> React + Vite, bukan single-file HTML — `index.html` di root hanya entry point
> Vite (`<div id="root">`). Implementasi Web Bluetooth ada di
> **`src/services/ble.js`** (parser + `BleSensor`) dan **`src/hooks/useBleSensor.js`**
> (normalisasi ke bentuk yang dipakai dashboard). Yang tetap berlaku untuk semua
> project adalah **kontrak BLE di bagian 2** — itu bagian yang harus cocok persis
> dengan firmware.

---

## 1. Prompt siap-tempel

Salin blok di bawah ini ke Claude CLI di project web app Anda:

```
Pastikan web app (index.html) bisa menerima dan menampilkan data BLE dari
ESP32 firmware Smart Insole. Gunakan Web Bluetooth API. Spesifikasi BLE dari
firmware (jangan diubah, harus cocok persis):

- Perangkat BLE bernama: "glykos device"
- Nordic UART Service (NUS):
    Service UUID  : 6e400001-b5a3-f393-e0a9-e50e24dcca9e
    Characteristic TX (NOTIFY, ESP -> HP): 6e400003-b5a3-f393-e0a9-e50e24dcca9e
- Koneksi difilter berdasarkan Service UUID (bukan nama).
- Data dikirim sebagai notify, format CSV per paket, diakhiri "\n", contoh:
    F1:1234,F2:1180,F3:1502,P1:120.0,P2:80.0,P3:150.0,T1:29.4,T2:30.1,T3:28.9,RH:55.2,TA:28.0,AX:0.01,AY:0.02,AZ:0.98
  Arti key:
    F1/F2/F3 = tegangan mentah FSR (mV)
    P1/P2/P3 = tekanan siap pakai (kPa) untuk Hallux/Metatarsal1/Tumit
    T1/T2/T3 = suhu TIGA sensor NTC forefoot/tumit/lateral (Celsius, sudah
               dihitung di ESP32 pakai Beta 3950 — bukan mV mentah)
    RH       = kelembapan (%),  TA = suhu udara (Celsius)
    AX/AY/AZ = akselerasi MPU6050 (g)
  Catatan: sebagian key bisa TIDAK ADA di satu paket kalau sensornya tidak
  terdeteksi (mis. tanpa RH/TA/AX/AY/AZ). Parser harus tahan terhadap key
  yang hilang dan terhadap paket yang terpotong sebagian (jangan crash,
  pakai nilai terakhir yang valid).
  Catatan NTC: firmware LAMA hanya mengirim T1/T2. Perlakukan T3 sebagai
  opsional — kalau tidak ada, dua titik lainnya harus tetap jalan normal.
  Kalau sebuah NTC lepas/short, firmware mengirim literal "nan" (dari
  String(NAN,1) di Arduino) — nilai itu harus ditolak, bukan ditampilkan.

Yang harus dipastikan ada / berfungsi:
1. Tombol connect yang memanggil navigator.bluetooth.requestDevice dengan
   filter Service UUID di atas, lalu startNotifications di karakteristik TX.
2. Listener characteristicvaluechanged yang men-decode TextDecoder, split
   per baris ("\n") lalu per "," lalu "key:value", dan menaruh ke UI.
3. Prioritaskan P1/P2/P3 (kPa siap pakai) jika ada; fallback hitung dari
   F1/F2/F3 hanya kalau P tidak dikirim.
4. Tampilkan status koneksi (tersambung / terputus / gagal) dan tangani event
   gattserverdisconnected.
5. Ingatkan syarat Web Bluetooth: hanya jalan di Chrome/Edge dan lewat
   http://localhost atau HTTPS (bukan file://).

Cek dulu apakah index.html SUDAH punya implementasi ini. Kalau sudah, jangan
ditulis ulang -- cukup verifikasi kecocokan UUID/format dan perbaiki bagian
yang salah saja. Jangan ubah UUID atau nama key CSV.
```

---

## 2. Kontrak BLE firmware (acuan)

| Item | Nilai |
|------|-------|
| Nama perangkat | `glykos device` |
| Service UUID | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Characteristic TX (NOTIFY, ESP → HP) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Filter koneksi | berdasarkan **Service UUID** (bukan nama) |
| Format | CSV `key:value` dipisah `,` diakhiri `\n` |
| MTU | firmware minta 200 (`BLEDevice::setMTU(200)`) agar paket panjang tidak terpotong |

### Arti key CSV

| Key | Arti | Satuan |
|-----|------|--------|
| `F1` `F2` `F3` | Tegangan mentah FSR (Hallux / Metatarsal1 / Tumit) | mV |
| `P1` `P2` `P3` | Tekanan siap pakai (Hallux / Metatarsal1 / Tumit) | kPa |
| `T1` `T2` `T3` | Suhu NTC (forefoot / tumit / lateral) | °C |
| `RH` | Kelembapan udara | % |
| `TA` | Suhu udara | °C |
| `AX` `AY` `AZ` | Akselerasi MPU6050 | g |

> **Catatan:** key `RH`, `TA`, `AX`, `AY`, `AZ` **hanya dikirim jika sensornya terdeteksi**.
> Parser web app harus tahan terhadap key yang tidak ada.

### Sensor suhu NTC (3 titik)

Firmware dinaikkan dari 2 menjadi **3 NTC**. Nilainya sudah dalam °C (Beta 3950,
1 desimal) — dipakai langsung tanpa konversi.

| Sensor | Pin ESP32 | Key | Posisi |
|--------|-----------|-----|--------|
| NTC1 | GPIO 35 | `T1` | Forefoot |
| NTC2 | GPIO 32 | `T2` | Tumit |
| NTC3 | GPIO 33 | `T3` | Lateral (sisi luar telapak) |

> **Kompatibilitas mundur:** firmware lama hanya mengirim `T1`/`T2`, jadi `T3`
> harus diperlakukan opsional.
>
> **Nilai `nan`:** kalau NTC lepas atau short, `ntcTempC()` mengembalikan `NAN`
> dan `String(NAN,1)` di Arduino menghasilkan string literal `"nan"`. Parser
> harus menolaknya, bukan menampilkannya sebagai angka.

> **Perhatikan:** `T3` = **lateral**, BUKAN jari kaki. Sensor tekanan punya titik
> `toe` (dari `P1`/Hallux) yang tidak punya pasangan NTC, dan sensor suhu punya
> titik `lateral` yang tidak punya pasangan FSR. Jadi wajar kalau daftar area di
> kartu Tekanan dan kartu Suhu tidak identik.

---

## 3. Syarat menjalankan (Web Bluetooth)

- Browser: **Chrome / Edge** (desktop atau Android). Safari / iOS tidak didukung.
- Halaman harus dibuka lewat **`http://localhost`** atau **HTTPS** — **bukan** `file://`.
- Project ini (Vite):
  ```
  npm run dev
  ```
  lalu buka `http://localhost:5173` di Chrome. Versi ter-deploy juga memenuhi
  syarat karena Firebase Hosting menyajikannya lewat HTTPS.
- Project static single-file: `python -m http.server 8000`, lalu
  `http://localhost:8000`.

---

## 4. Status implementasi di project ini

Penerima BLE **sudah lengkap** dan cocok dengan kontrak di atas:

| Berkas | Peran |
|--------|-------|
| `src/services/ble.js` | UUID, `parseCsvLine`, kelas `BleSensor` — buffering baris terpotong, merge nilai terakhir yang valid, tangani `gattserverdisconnected` |
| `src/hooks/useBleSensor.js` | Normalisasi paket mentah ke bentuk `reading` yang dipakai dashboard |
| `src/components/BleConnectButton.jsx` | Tombol sambung/putus + status koneksi |
| `src/hooks/useFirestoreSync.js` | Menulis pembacaan BLE ke Firestore (firmware tidak punya WiFi) — ke `users/{uid}/devices/{deviceId}/…`, lihat `src/services/paths.js` |

Untuk menjalankan: `npm run dev`, buka `http://localhost:5173` di Chrome, klik
tombol Bluetooth di topbar, pilih **"glykos device"**.

Ketiga NTC (`T1`/`T2`/`T3`) sudah didukung penuh — dipetakan ke area
`metatarsal`/`heel`/`lateral`, ditampilkan di kartu Suhu & peta sensor, dan
disimpan per area ke Firestore beserta `temperatureDelta`.

### Batasan yang diketahui

- **Fallback FSR belum dikalibrasi.** `FSR_MV_TO_KPA = 0.1` di
  `useBleSensor.js` masih placeholder linear; hanya terpakai kalau `P1/P2/P3`
  tidak dikirim.
- **Tidak ada batas usia per-KEY.** Sesuai kontrak, key yang hilang
  mempertahankan nilai valid terakhir — tapi tanpa timeout per key. Kalau satu
  sensor berhenti mengirim di tengah sesi sementara sensor lain terus jalan,
  angka lama sensor itu masih tampil tanpa penanda.
  Yang **sudah** ditangani adalah kebasian seluruh pembacaan: dokumen
  `live/current` yang tidak diperbarui lebih dari `STALE_AFTER_MS`
  (`src/hooks/useSensorData.js`, 2 menit) berhenti dihitung sebagai live dan
  dashboard menampilkan `StaleDataBanner` berisi waktu pembaruan terakhir.
- **Laju paket ~300 ms (~3,3 Hz)** membatasi penghitungan langkah dari
  `AX/AY/AZ` — lihat catatan sample rate di `src/hooks/useStepCounter.js`.
- **`signalStrength` hardcoded `-50`**, bukan RSSI sungguhan; Web Bluetooth
  tidak mengekspos RSSI setelah tersambung.
