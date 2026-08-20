# Glykos

Web app pemantauan kaki penderita diabetes untuk **perangkat Glykos** — sepatu
pintar berbasis ESP32. Membaca tekanan, suhu kulit, kelembapan, dan gerak langsung
dari perangkat lewat Bluetooth, menampilkannya sebagai dashboard, dan menyimpannya
sebagai riwayat per pengguna.

React 19 + Vite · Firebase Auth & Firestore · Web Bluetooth · Gemini (chatbot) ·
Dua bahasa: Indonesia & Inggris (Lingui).

## Menjalankan

```bash
npm install
cp .env.example .env      # isi kredensial Firebase & Gemini
npm run dev               # http://localhost:5173
```

Perintah lain: `npm run build`, `npm run preview`, `npm run lint`, `npm test`.
Untuk terjemahan: `npm run i18n:extract`, `npm run i18n:fill`, `npm run i18n:check`
(lihat [Dua bahasa](#dua-bahasa)).

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
| `src/i18n.js` | Bahasa aktif: deteksi, pergantian, penyimpanan pilihan |
| `src/locales/{id,en}/messages.po` | Katalog pesan — dihasilkan `lingui extract` |
| `scripts/translations.en.mjs` | Sumber terjemahan Inggris (ditulis manusia) |
| `src/utils/alertMessages.js` | Merakit kalimat peringatan dari data terstruktur |
| `src/utils/dailyReading.js` | Sumber angka kartu & reset tengah malam |
| `src/hooks/useDayKey.js` | Kunci tanggal yang berganti sendiri pukul 00:00 |
| `public/sw.js` | Service worker: jalur notifikasi + cache offline |
| `firestore.rules` | Aturan akses — berpasangan dengan `paths.js` |

## Kenaikan suhu: menyeluruh vs setempat

Pertanyaan yang dijawab pemantauan suhu di sini bukan "seberapa panas kakinya",
melainkan **"apakah panasnya terpusat di satu tempat"**. Bedanya menentukan
segalanya:

- Kaki yang menghangat **merata** di semua titik hampir selalu sistemik —
  ruangan panas, baru berjalan, demam, sepatu tertutup. Menandainya merah hanya
  melatih pengguna mengabaikan peringatan.
- Kaki yang menghangat di **satu titik** sementara yang lain tetap adalah pola
  peradangan setempat, dan itulah yang mendahului ulkus.

Karena itu ambang saja tidak cukup: kenaikan 3 °C di ketiga titik sekaligus
lebih tidak mengkhawatirkan daripada kenaikan 2,3 °C di satu titik saja.

| Kenaikan tertinggi | Status |
|---|---|
| < 1,0 °C | Aman |
| 1,0 – 2,1 °C | Perlu Perhatian |
| ≥ 2,2 °C | Waspada |

**Diturunkan ke Aman** bila seluruh titik yang terukur naik DAN naiknya sama
rata (selisih antar kenaikan < 1,0 °C). Kedua syarat diperlukan: tiga titik yang
naik 3,0 / 1,2 / 1,1 memang semuanya naik, tapi yang pertama jauh lebih tinggi —
dan justru selisih itulah tandanya.

Dengan hanya satu sensor terukur, penilaian **tidak** diturunkan: tidak ada yang
bisa dibandingkan, dan dalam keraguan salah menganggap aman lebih mahal daripada
salah menganggap perlu diperiksa.

### Acuannya awal sesi pemakaian

Kenaikan diukur terhadap suhu tiap area saat perangkat baru tersambung hari itu
(`hooks/useTemperatureRise.js`), dirata-ratakan dari beberapa sampel pertama
supaya derau NTC tidak menentukan acuan seluruh sesi.

Keterbatasannya perlu diingat: kaki yang **sudah** meradang sebelum sepatu
dipakai tidak terdeteksi, karena kondisi itu ikut jadi acuannya. Aturan ini
menangkap peradangan yang **berkembang** selama pemakaian. Untuk yang sudah ada
sebelumnya, selisih antar area (di bawah) tetap jadi jaring keduanya — dan
itulah yang dipakai saat tidak ada sesi BLE berjalan, misalnya setelah halaman
dimuat ulang.

Halaman Riwayat menampilkan kenaikan **terpusat** terbesar tiap hari beserta
polanya ("1 dari 3 titik" / "seragam"). Yang dicatat bukan kenaikan terbesar
begitu saja — kenaikan merata sering lebih besar angkanya tapi bukan itu yang
perlu diperhatikan.

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

## Dua bahasa

Antarmuka tersedia dalam bahasa Indonesia dan Inggris. Bahasa Indonesia adalah
**bahasa sumber**: teksnya ditulis langsung di dalam kode, jadi tidak pernah
bisa "hilang" — yang perlu diisi hanya sisi Inggrisnya.

Pemilih bahasa ada di tiga tempat yang semuanya bisa jadi halaman pertama:
navigasi halaman depan, kartu masuk/daftar, dan topbar dashboard. Pilihannya
disimpan di `localStorage`; tanpa pilihan tersimpan, bahasa mengikuti pengaturan
browser lalu jatuh ke Indonesia.

### Tiga penjaga

Masalah bilingual yang sebenarnya bukan "terjemahannya kurang tepat", melainkan
"ada teks yang tidak ikut berganti". Ada tiga cara teks bisa lolos, dan
masing-masing ditutup oleh satu penjaga yang **menggagalkan perintah**, bukan
sekadar memperingatkan:

| Cara teks lolos | Penjaga | Kapan gagal |
|---|---|---|
| Tidak pernah dibungkus | `eslint-plugin-lingui` (`no-unlocalized-strings`) | `npm run lint` |
| Terekstrak tapi belum diterjemahkan | `failOnMissing` di `vite.config.js` | `npm run build` |
| Diterjemahkan tapi placeholder-nya salah | `scripts/check-catalog.mjs` | `npm run i18n:check` |

Penjaga ketiga ada karena dua yang pertama tidak menangkapnya: `{peakText}` yang
diterjemahkan jadi `{peak}` tetap dianggap terisi dan tetap lolos kompilasi —
lalu di layar angkanya hilang dari kalimat. Pada aplikasi pemantauan, "Peak
pressure kPa" tanpa angkanya lebih menyesatkan daripada kalimat yang tidak
diterjemahkan sama sekali.

### Menambah atau mengubah teks

```bash
npm run i18n:extract   # pindai kode, tarik pesan baru ke katalog
# isi terjemahannya di scripts/translations.en.mjs
npm run i18n:fill      # salin ke katalog + jalankan pemeriksaan
```

Terjemahan ditulis di `scripts/translations.en.mjs`, bukan langsung di berkas
`.po`, karena `lingui extract` menulis ulang `.po` setiap kali ada pesan baru —
satu ekstraksi yang salah jalan sudah cukup menghapus pekerjaan berjam-jam.
Kamusnya bertahan di luar siklus itu, jadi katalog selalu bisa dibangun ulang.

Terjemahannya **ditulis manusia, bukan mesin**. Istilah di aplikasi ini klinis
(pre-ulkus, metatarsal, selisih suhu antar area, maserasi), dan justru di
istilah seperti itu terjemahan mesin paling sering bergeser artinya.

### Konvensi di dalam kode

| Tempat | Bentuk |
|---|---|
| Teks di JSX | `<Trans>…</Trans>` |
| String di dalam komponen | `const { t } = useLingui()` |
| Peta label di `constants/` | `msg\`…\`` (deskriptor), diselesaikan pemanggil dengan `i18n._()` |
| Util murni | macro `t`/`plural` biasa |

Satu aturan yang tidak boleh dilanggar: **komponen yang menampilkan teks hasil
util wajib memanggil `useLingui()`** (atau memuat `<Trans>`). Macro di util
membaca instance i18n global, jadi hasilnya benar segera setelah bahasa
berganti — tapi React tidak tahu harus render ulang. `useLingui()` yang
berlangganan perubahan itu. Tanpanya teks membeku di bahasa lama, dan React
Compiler yang aktif di proyek ini justru memperbesar peluangnya.

### Peringatan tersimpan tidak lagi membawa bahasa

`logAlert()` dulu menyimpan **kalimat jadi** ke Firestore (`message`, `label`,
`value`). Akibatnya bahasa ikut tertulis ke dalam catatan medis: berpindah ke
Inggris tidak mengubah satu pun peringatan lama.

Sekarang yang disimpan hanya `metric` + `status` + `values` (angka), dan
kalimatnya dirakit `utils/alertMessages.js` **saat dibaca** — jadi satu catatan
yang sama tampil dalam bahasa apa pun tanpa datanya pernah disentuh.

Catatan yang ditulis sebelum perubahan ini **tidak dimigrasikan**: ia tetap
tampil apa adanya dalam bahasa Indonesia. Menulis ulang catatan medis demi
kenyamanan terjemahan bukan hal yang dilakukan di sini, dan koleksi `alerts`
memang bersifat append-only.

### Yang di luar React ikut berganti

- `document.title`, meta description, dan atribut `lang` pada `<html>` (`src/i18n.js`)
- Manifest PWA — ada satu per bahasa (`public/manifest.{id,en}.webmanifest`),
  yang ditukar adalah tautannya. Tanpa ini, pengguna berbahasa Inggris memasang
  ikon bernama "Monitoring Kaki Diabetes" di layar utamanya.
- Atribut `lang` pada notifikasi — dipakai OS untuk memilih pelafalan
- Laporan CSV & PDF hasil ekspor, termasuk instruksi sistem chatbot sehingga
  jawabannya ikut bahasa antarmuka

### Angka juga ikut bahasa

Indonesia memakai **koma** desimal ("2,2 °C"), Inggris memakai titik ("2.2 °C").
Semua format tanggal & angka lewat `utils/locale.js`; `toFixed()` dan
`toLocaleString('id-ID')` tidak dipakai lagi untuk teks yang dilihat pengguna.
Field `waktu` yang tersimpan di Firestore justru dibuat **netral bahasa**
(`HH:MM:SS`) — ia data, bukan presentasi.

## Masa berlaku angka di kartu

Angka di kartu dashboard adalah **pembacaan terakhir yang diterima**, dan
berlaku **sepanjang hari itu**. Yang mengakhirinya hanya pergantian hari —
bukan terputusnya koneksi.

Alasannya: koneksi yang putus tidak membatalkan apa pun yang sudah terjadi.
Tekanan 240 kPa yang terbaca pagi tadi tetap diterima kaki pengguna, dan
menghapusnya dari layar begitu Bluetooth dilepas justru menyembunyikan kejadian
yang paling perlu dilihat.

| Peristiwa | Yang terjadi pada kartu |
|---|---|
| Perangkat terputus | Angka **tetap**, badge berubah jadi Offline |
| Halaman dimuat ulang | Angka diambil dari `live/current` (tertinggal ≤ 60 detik) |
| Lewat pukul 00:00 | Kartu **kosong** — hari baru, belum ada pembacaan |
| Tersambung melewati 00:00 | Tetap live; paket berikutnya sudah bertanggal hari baru |

Reset tengah malam **tidak menghapus apa pun** dari Firestore: `live/current`
tetap berisi pembacaan terakhir, hanya berhenti ditampilkan sebagai pembacaan
hari ini. Rangkuman harian di koleksi `daily` juga utuh — halaman Riwayat tidak
terpengaruh.

Aturannya ada di `utils/dailyReading.js` (fungsi murni, diuji), sementara
`hooks/useDayKey.js` yang menyalakan ulang tepat tengah malam — dengan
`setTimeout` ke pergantian hari berikutnya, bukan detak per menit, karena
peristiwanya terjadi sekali sehari.

### Kartu Aktivitas menampilkan total HARI INI

`useStepCounter` mereset hitungannya tiap kali perangkat tersambung ulang — itu
benar untuk keperluannya sendiri (deteksi kelelahan mengukur satu sesi
pemakaian), tapi salah untuk kartu: seseorang yang menyambungkan perangkat lagi
sore hari akan melihat langkah paginya lenyap.

Kartu karena itu memakai rangkuman harian (yang sudah menjumlahkan seluruh sesi
hari ini) ditambah bagian sesi berjalan yang belum tersinkron — tanpa
menghitung ganda, dan dijepit agar totalnya tidak pernah turun.

Sebelumnya kartu ini jatuh ke nol setiap kali BLE putus: `steps` memang ditulis
ke `live/current`, tapi dibaca kembali sebagai field `activity` yang tidak
pernah ada.

### "Waktu Pemakaian", bukan "Waktu Aktif"

Angkanya mengukur **lama perangkat terhubung** (`wearMinutes`), dijumlahkan
seluruh sesi hari itu — bukan lama kaki bergerak.

Labelnya dulu "Waktu Aktif", dan itu menjanjikan hal yang berbeda dari yang
diukurnya: seseorang yang memakai sepatunya delapan jam sambil duduk melihat
"Waktu Aktif 480 menit". Yang diperbaiki labelnya, karena angkanya sendiri
memang berguna — *wear time* adalah istilah baku pada alas kaki diabetik, ukuran
kepatuhan pemakaian yang justru ingin dilihat dokter.

Nama fieldnya ikut diganti dari `activeMinutes` menjadi `wearMinutes`, bukan
hanya labelnya. Nama yang menyiratkan arti berbeda dari isinya adalah jebakan
yang sudah sekali menimbulkan bug di proyek ini (lihat prop `id` di
`SensorFootMap.jsx`). `useSensorData` tetap membaca `activeMinutes` sebagai
cadangan untuk dokumen yang sempat ditulis dengan nama lama.

Angkanya diukur di `hooks/useWearTime.js`, **bukan** di penghitung langkah.
Sebelumnya ia menumpang di `StepCounterSession`, yang keluar ke keadaan kosong
begitu tidak ada data akselerometer — sementara lama perangkat terhubung tidak
ada hubungannya dengan sensor gerak. Akibatnya angkanya jatuh ke nol pada dua
keadaan yang wajar: firmware yang tidak mengirim AX/AY/AZ (kontrak BLE memang
menyebutnya opsional), dan setiap kali sumber data jatuh ke Firestore — yaitu
setiap halaman dimuat ulang, karena `parseSensorReading` tidak menghasilkan
field `accel` sama sekali.

### Data disimpan juga saat sesi berakhir

Sinkronisasi berjalan tiap 60 detik, jadi tanpa penulisan penutup setiap sesi
yang lebih pendek dari itu kehilangan **seluruh** langkahnya — penulisan
pertama saat menyambung selalu berisi nol langkah. `useFirestoreSync` karena
itu menyimpan sekali lagi saat sesi berakhir dan saat halaman disembunyikan
(pindah aplikasi / layar mati di ponsel).

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
antar sesi, **selalu disertai spanduk**, dan **tidak pernah menulis ke Firestore**.

Mode demo **tidak pernah menyala sendiri**. Sebelumnya ada mode otomatis yang
menampilkan data contoh selama pengguna belum punya data, tanpa spanduk penanda
apa pun — dan pada pemakaian nyata angkanya langsung disalahartikan sebagai
pembacaan sungguhan. Di aplikasi yang seluruh gunanya membaca kondisi kaki, itu
kegagalan yang serius.

Penggantinya keadaan kosong yang jujur: kartu bertanda `—` beserta ajakan
menyambungkan perangkat. Spanduknya membedakan dua keadaan yang artinya memang
berbeda — "belum ada data dari perangkat" (belum pernah tersambung) dan "belum
ada pembacaan hari ini" (hari baru, riwayat kemarin tetap utuh).

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
