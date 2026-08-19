# Glykos

Web app pemantauan kaki penderita diabetes untuk **perangkat Glykos** — sepatu
pintar berbasis ESP32. Membaca tekanan, suhu kulit, kelembapan, dan gerak langsung
dari perangkat lewat Bluetooth, menampilkannya sebagai dashboard, dan menyimpannya
sebagai riwayat per pengguna.

React 19 + Vite · Firebase Auth & Firestore · Web Bluetooth · Gemini (chatbot).

## Menjalankan

```bash
npm install
cp .env.example .env      # isi kredensial Firebase & Gemini
npm run dev               # http://localhost:5173
```

Perintah lain: `npm run build`, `npm run preview`, `npm run lint`, `npm test`.

> Web Bluetooth hanya berjalan di **Chrome/Edge** (desktop atau Android) dan hanya
> lewat `http://localhost` atau HTTPS — tidak lewat `file://`. Safari/iOS tidak
> didukung. Versi ter-deploy memenuhi syarat karena Firebase Hosting memakai HTTPS.

## Alur data

Firmware ESP32 **tidak punya WiFi**, jadi browser inilah satu-satunya jalur data:

```
ESP32 ──BLE (Nordic UART, CSV)──> services/ble.js ──> useBleSensor (normalisasi)
                                                          │
                                          useFirestoreSync │ tiap 60 detik
                                                          ▼
   users/{uid}/devices/{deviceId}/live/current    kondisi sekarang
                                  /history/{id}   catatan mentah, append-only
                                  /daily/{tanggal} rangkuman → halaman Riwayat
                                  /alerts/{id}    peringatan
```

Halaman Riwayat membaca **rangkuman harian**, bukan koleksi mentah — 30 hari berarti
30 dokumen, bukan puluhan ribu.

Kontrak BLE (UUID, format CSV, arti tiap key, keterbatasan yang diketahui)
didokumentasikan lengkap di [`PROMPT_BLE_WEBAPP.md`](./PROMPT_BLE_WEBAPP.md).
Bagian itu harus cocok persis dengan firmware.

## Struktur

| Path | Isi |
|------|-----|
| `src/services/ble.js` | Web Bluetooth: UUID, parser CSV, kelas `BleSensor` |
| `src/services/paths.js` | Satu-satunya tempat bentuk path Firestore ditentukan |
| `src/services/firebase.js` / `firestore.js` | Auth dan Firestore sengaja dipisah demi ukuran bundle |
| `src/hooks/` | Sumber data & logika sesi (BLE, sinkronisasi, langkah, kelelahan, peringatan) |
| `src/constants/thresholds.js` | Ambang tekanan/suhu/kelembapan yang dipakai seluruh UI |
| `src/utils/temperatureTrend.js` | Aturan selisih suhu yang bertahan antar hari (lihat di bawah) |
| `src/utils/sensorContext.js` | Ringkasan sensor yang dikirim ke chatbot — sekaligus batas privasinya |
| `public/sw.js` | Service worker: jalur notifikasi + cache offline |
| `firestore.rules` | Aturan akses — berpasangan dengan `paths.js` |

## Selisih suhu antar area

Selisih suhu antar titik pada kaki yang sama adalah prediktor pre-ulkus paling
bernilai di sistem ini. Ada **dua aturan** yang berbeda, dan keduanya perlu:

| Aturan | Sumber data | Berkas |
|--------|-------------|--------|
| Selisih ≥ 2,2 °C pada pembacaan sekarang | pembacaan live | `utils/alertRules.js` |
| Selisih bertahan **2 hari berturut-turut** | rangkuman harian | `utils/temperatureTrend.js` |

Yang kedua yang memicu saran mengurangi beban. Hari tanpa pemakaian tidak
menjembatani rangkaian — tanpa pembacaan, tidak ada dasar menyebut selisihnya
bertahan.

## Notifikasi & wake lock

Notifikasi dikirim lewat `registration.showNotification()` pada service worker.
Konstruktor `new Notification()` ditolak Chrome di Android, jadi jalur lama
gagal diam-diam persis di perangkat yang paling mungkin dipakai. Ada tombol
**Kirim Notifikasi Uji** di halaman Profil untuk memastikannya benar-benar
sampai.

Service worker **hanya aktif di build produksi**. Di `npm run dev` ia justru
dibatalkan pendaftarannya beserta cache-nya — lapisan cache di antara kode dan
tampilan membuat perubahan yang sudah benar terlihat tidak berubah. Untuk
menguji notifikasi secara lokal:

```bash
npm run build && npm run preview
```

Selama BLE tersambung, layar ditahan menyala (Screen Wake Lock) — layar mati
membekukan halaman, dan halaman inilah satu-satunya jalur data perangkat.
Statusnya terlihat sebagai penanda "Layar aktif" di topbar.

## Keamanan data

Seluruh data sensor berada di bawah `users/{uid}`, dan `firestore.rules` hanya
mengizinkan pemiliknya membaca/menulis. Riwayat & peringatan bersifat append-only:
klien tidak boleh menghapus catatan medis.

Deploy rules setiap kali `paths.js` berubah:

```bash
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## Mode demo

`?demo=1` mengisi dashboard dengan data contoh untuk meninjau tampilan tanpa
perangkat. Sengaja hanya lewat query string — selalu terlihat di URL, tidak lengket
antar sesi, selalu disertai banner, dan **tidak pernah menulis ke Firestore**.

## Keterbatasan yang diketahui

- **Kunci Gemini ikut ter-bundle** (`VITE_GEMINI_API_KEY`) — hanya boleh key
  free-tier dengan HTTP referrer restriction. Perbaikan tuntasnya adalah backend proxy.
  Sejak chatbot ikut mengirim ringkasan sensor, taruhannya naik dari kuota ke
  privasi: yang dikirim dibatasi pada **angka sensor agregat** — tanpa nama,
  uid, id perangkat, atau isi profil medis (`utils/sensorContext.js`, diuji di
  `sensorContext.test.js`). Backend proxy jadi lebih layak didahulukan.
- **Fallback FSR belum dikalibrasi** — `FSR_MV_TO_KPA` masih placeholder linear,
  hanya terpakai bila firmware tidak mengirim `P1/P2/P3`.
- **Laju paket BLE ~3,3 Hz** membatasi penghitungan langkah; lihat catatan sample
  rate di `src/hooks/useStepCounter.js`.
- **`signalStrength` hardcoded** — Web Bluetooth tidak mengekspos RSSI setelah tersambung.
- **Peringatan hanya berjalan saat dashboard terbuka** — notifikasi saat aplikasi
  tertutup butuh Cloud Function + push, belum diaktifkan.
