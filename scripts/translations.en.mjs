// scripts/translations.en.mjs
// Terjemahan Inggris, ditulis manusia — BUKAN hasil terjemahan mesin.
//
// Alasannya bukan idealisme: istilah di aplikasi ini klinis (pre-ulkus,
// metatarsal, hallux, selisih suhu antar area, maserasi), dan terjemahan mesin
// paling sering keliru justru pada istilah seperti itu. Di aplikasi pemantauan
// kaki diabetik, kata yang bergeser artinya bisa berarti tindakan yang salah.
//
// Berkas ini sumbernya; `npm run i18n:fill` yang memindahkannya ke
// src/locales/en/messages.po. Lihat catatan di scripts/fill-catalog.mjs untuk
// alasan pemisahan itu.
//
// ATURAN YANG TIDAK BOLEH DILANGGAR SAAT MENYUNTING:
//   1. Placeholder harus SAMA PERSIS — {peakText}, {0}, <0>…</0>. Salah nama
//      berarti pesannya gagal dirakit saat dijalankan.
//   2. Struktur plural ICU dipertahankan, dan bentuk `one`/`other` sisi Inggris
//      memang harus BERBEDA ("1 day" vs "5 days") — di situlah gunanya.
//   3. Angka & satuan tidak diterjemahkan.

export default {
  // ---------------------------------------------------------------- auth
  'Popup login diblokir oleh browser. Izinkan popup lalu coba lagi.':
    'The browser blocked the sign-in popup. Allow popups, then try again.',
  'Format email tidak valid.': 'That email address is not valid.',
  'Akun ini telah dinonaktifkan.': 'This account has been disabled.',
  'Email atau kata sandi salah.': 'Incorrect email or password.',
  'Email ini sudah terdaftar. Silakan masuk.':
    'This email is already registered. Please sign in.',
  'Login dengan Google dibatalkan.': 'Google sign-in was cancelled.',
  'Gagal terhubung ke jaringan. Coba lagi.': 'Could not reach the network. Please try again.',
  'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.':
    'Too many attempts. Please try again in a little while.',
  'Terjadi kesalahan. Silakan coba lagi.': 'Something went wrong. Please try again.',
  'Konfirmasi kata sandi tidak cocok.': 'Password confirmation does not match.',
  'Kata sandi minimal 6 karakter.': 'Password must be at least 6 characters.',
  'Masuk ke akun Anda': 'Sign in to your account',
  'Pantau kondisi kaki secara real-time setelah masuk.':
    'Monitor your foot condition in real time once you sign in.',
  Email: 'Email',
  'Kata Sandi': 'Password',
  'Memproses…': 'Working…',
  atau: 'or',
  'Masuk dengan Google': 'Sign in with Google',
  'Belum punya akun? <0>Daftar di sini</0>': "Don't have an account? <0>Sign up here</0>",
  'Buat akun baru': 'Create a new account',
  'Daftar untuk mulai memantau kondisi kaki secara real-time.':
    'Sign up to start monitoring your foot condition in real time.',
  'Nama Lengkap': 'Full Name',
  'Nama Anda': 'Your name',
  'Minimal 6 karakter': 'At least 6 characters',
  'Konfirmasi Kata Sandi': 'Confirm Password',
  'Ulangi kata sandi': 'Re-enter password',
  Daftar: 'Sign Up',
  'Daftar dengan Google': 'Sign up with Google',
  'Sudah punya akun? <0>Masuk di sini</0>': 'Already have an account? <0>Sign in here</0>',
  Masuk: 'Sign In',
  'Daftar Gratis': 'Sign Up Free',
  'Buka Dashboard': 'Open Dashboard',

  // ---------------------------------------------------------------- document
  'Glykos — Monitoring Kaki Diabetes': 'Glykos — Diabetic Foot Monitoring',
  'Glykos — dashboard pemantauan sepatu pintar untuk deteksi dini risiko ulkus diabetik.':
    'Glykos — smart shoe monitoring dashboard for early detection of diabetic foot ulcer risk.',

  // ---------------------------------------------------------------- loader & shell
  'Memuat halaman…': 'Loading page…',
  'Menyiapkan dashboard…': 'Preparing your dashboard…',
  'Memeriksa sesi…': 'Checking your session…',
  'Memuat riwayat peringatan': 'Loading alert history',
  'Memuat halaman': 'Loading page',
  'Memuat profil': 'Loading profile',
  Ringkasan: 'Overview',
  Chatbot: 'Chatbot',
  Riwayat: 'History',
  Profil: 'Profile',
  Pengguna: 'User',
  'Keluar ({label})': 'Sign out ({label})',
  Keluar: 'Sign out',
  'Navigasi dashboard': 'Dashboard navigation',
  'Layar ditahan menyala selama sepatu tersambung, supaya data tidak terputus saat layar mati.':
    'The screen is kept awake while the shoe is connected, so the data stream is not cut off when the screen turns off.',
  'Layar aktif': 'Screen awake',
  'Glykos — pemantauan kaki diabetes': 'Glykos — diabetic foot monitoring',

  // ---------------------------------------------------------------- BLE
  'Web Bluetooth hanya didukung di Chrome/Edge lewat http://localhost atau HTTPS':
    'Web Bluetooth is only supported in Chrome/Edge over http://localhost or HTTPS',
  'BLE tak didukung': 'BLE unsupported',
  'perangkat BLE': 'the BLE device',
  'Terhubung ke {target} — klik untuk memutuskan':
    'Connected to {target} — click to disconnect',
  Terhubung: 'Connected',
  'Sambungkan ke perangkat Glykos via Bluetooth': 'Connect to your Glykos device over Bluetooth',
  'Menyambungkan…': 'Connecting…',
  'Sambungkan BLE': 'Connect BLE',
  'Terhubung ke perangkat': 'Connected to the device',
  'Perangkat belum terhubung': 'Device not connected',
  Live: 'Live',
  Offline: 'Offline',
  'Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge lewat http://localhost atau HTTPS.':
    'Web Bluetooth is not supported in this browser. Use Chrome or Edge over http://localhost or HTTPS.',
  'Bluetooth: {bleError}': 'Bluetooth: {bleError}',
  'Sambungkan Ulang': 'Reconnect',
  'Sambungkan Perangkat': 'Connect Device',

  // ---------------------------------------------------------------- demo mode
  '<0>Mode Demo aktif.</0> Semua angka, grafik, dan peringatan di halaman ini adalah <1>data contoh</1> — bukan pembacaan sensor dari perangkat Anda dan tidak tersimpan ke basis data.':
    '<0>Demo mode is on.</0> Every number, chart, and alert on this page is <1>sample data</1> — not a sensor reading from your device, and nothing is saved to the database.',
  'Keluar Mode Demo': 'Exit Demo Mode',
  'Lihat Contoh Tampilan': 'See Sample View',
  '“Lihat Contoh Tampilan” mengisi dashboard dengan <0>data contoh</0> supaya Anda bisa melihat bentuk grafik & kartu tanpa perangkat. Angkanya tidak tersimpan ke basis data.':
    '“See Sample View” fills the dashboard with <0>sample data</0> so you can see how the charts and cards look without a device. Those numbers are never saved to the database.',

  // ---------------------------------------------------------------- device / onboarding
  'Belum ada data dari perangkat': 'No data from your device yet',
  'Belum ada pembacaan hari ini': 'No readings yet today',
  'Sambungkan perangkat Glykos Anda lewat Bluetooth untuk mulai memantau tekanan, suhu, dan kelembapan kaki secara real-time. Tanda “—” di bawah berarti belum ada pembacaan, bukan hasil pengukuran.':
    'Connect your Glykos device over Bluetooth to start monitoring foot pressure, temperature, and humidity in real time. The “—” below means there is no reading yet, not a measured value.',
  'Pembacaan Anda sebelumnya tetap tersimpan dan bisa dilihat di halaman Riwayat. Sambungkan perangkat Glykos untuk mulai memantau hari ini — tanda “—” di bawah berarti belum ada yang terukur hari ini, bukan nol.':
    'Your earlier readings are still saved and can be seen on the History page. Connect your Glykos device to start monitoring today — the “—” below means nothing has been measured today, not zero.',
  'Browser ini tidak mendukung Web Bluetooth. Buka halaman ini lewat Chrome atau Edge (desktop/Android) untuk bisa menyambungkan perangkat.':
    'This browser does not support Web Bluetooth. Open this page in Chrome or Edge (desktop or Android) to connect a device.',
  Kiri: 'Left',
  Kanan: 'Right',
  'Kaki {selectedFoot}': '{selectedFoot} foot',
  'Kaki {deviceFoot}': '{deviceFoot} foot',

  // ---------------------------------------------------------------- 3D scenes
  'Badan sepatu': 'Shoe body',
  'Insole bersensor<i>3 titik tekanan</i>': 'Sensor insole<i>3 pressure points</i>',
  'Modul sensor &amp; Bluetooth': 'Sensor &amp; Bluetooth module',
  'Tampilan terurai sepatu Glykos: badan sepatu di lapisan atas, insole bersensor berisi tiga titik tekanan di tengah, dan modul sensor Bluetooth di lapisan bawah':
    'Exploded view of the Glykos shoe: the shoe body on the top layer, the sensor insole with three pressure points in the middle, and the Bluetooth sensor module on the bottom layer',
  'Sepatu Glykos terdiri dari tiga bagian: badan sepatunya, insole bersensor berisi tiga titik tekanan, dan modul sensor Bluetooth di sisi luar.':
    'The Glykos shoe has three parts: the shoe body, the sensor insole with three pressure points, and the Bluetooth sensor module on the outer side.',
  'Modul sensor Bluetooth Glykos berputar pelan, dengan LED indikator pengiriman data':
    'The Glykos Bluetooth sensor module rotating slowly, with an LED indicating data transmission',
  'Insole Glykos dengan tiga titik tekanan pada tiga status berbeda: 150 kPa aman, 225 kPa perlu perhatian, dan 300 kPa risiko ulkus':
    'The Glykos insole with three pressure points at three different statuses: 150 kPa safe, 225 kPa needs attention, and 300 kPa ulcer risk',
  'Ilustrasi insole Glykos dengan titik sensor tekanan':
    'Illustration of the Glykos insole with its pressure sensor points',
  'Model tiga dimensi sepatu pintar Glykos dengan modul sensor di sisi luarnya, disertai tiga titik sensor tekanan pada tumit, metatarsal, dan jari kaki':
    'A three-dimensional model of the Glykos smart shoe with the sensor module on its outer side, plus three pressure sensor points at the heel, metatarsal, and toe',
  'Pratinjau 3D tidak tersedia di peramban ini.': '3D preview is not available in this browser.',
  'Seret ke samping & ke atas untuk memutar': 'Drag sideways and up to rotate',
  'Contoh pembacaan: 150 / 225 / 300 kPa': 'Sample readings: 150 / 225 / 300 kPa',
  'Gulir untuk memisahkan ketiga bagiannya: badan sepatu, insole bersensor dengan tiga titik tekanan, dan modul sensor di sisi luar.':
    'Scroll to separate the three parts: the shoe body, the sensor insole with three pressure points, and the sensor module on the outer side.',

  // ---------------------------------------------------------------- metric cards
  Aman: 'Safe',
  Perhatian: 'Attention',
  Risiko: 'Risk',
  'Perlu Perhatian': 'Needs Attention',
  'Risiko Ulkus': 'Ulcer Risk',
  'Risiko Tinggi': 'High Risk',
  Normal: 'Normal',
  Ideal: 'Ideal',
  Rendah: 'Low',
  Sedang: 'Moderate',
  Tinggi: 'High',
  'Perlu Tindakan': 'Action Needed',
  Tumit: 'Heel',
  Metatarsal: 'Metatarsal',
  'Jari Kaki': 'Toe',
  Lateral: 'Lateral',
  'Belum ada data': 'No data yet',
  'Tekanan Puncak': 'Peak Pressure',
  'Titik tertinggi: {location} · {statusText}': 'Highest point: {location} · {statusText}',
  'Ambang: <{safeText} kPa aman · {safeText}–{warnText} perhatian · >{warnText} risiko ulkus':
    'Thresholds: <{safeText} kPa safe · {safeText}–{warnText} attention · >{warnText} ulcer risk',
  'Suhu Kulit': 'Skin Temperature',
  'Area terpanas: {location}': 'Warmest area: {location}',
  'Belum ada pembacaan dari sensor NTC. Sambungkan perangkat lewat Bluetooth untuk melihat suhu per area ({areaList}).':
    'No readings from the NTC sensors yet. Connect the device over Bluetooth to see per-area temperatures ({areaList}).',
  'Selisih suhu antar area': 'Temperature spread between areas',
  'Selisih suhu >{thresholdText}°C — prediktor kuat pre-ulkus':
    'Temperature spread >{thresholdText}°C — a strong pre-ulcer predictor',
  'Kelembapan Sepatu': 'In-Shoe Humidity',
  'Kelembapan udara di dalam sepatu': 'Air humidity inside the shoe',
  'Sensor kelembapan belum mengirim data. Sambungkan perangkat lewat Bluetooth.':
    'The humidity sensor has not sent any data yet. Connect the device over Bluetooth.',
  'Ideal {idealMin}–{idealMax}%': 'Ideal {idealMin}–{idealMax}%',
  '>70% RH meningkatkan risiko maserasi, jamur & infeksi':
    '>70% RH raises the risk of maceration, fungal growth, and infection',
  'Suhu udara sekitar: {airText}°C': 'Ambient air temperature: {airText}°C',

  // ---------------------------------------------------------------- kelembapan
  // "Dew point" dan "skin surface" istilah bakunya; sengaja tidak diperhalus
  // jadi kata sehari-hari karena keduanya besaran teknis yang tepat.
  'Setara {skinRhText}% di permukaan kulit — itulah yang dinilai statusnya':
    'Equivalent to {skinRhText}% at the skin surface — that is what the status is based on',
  'Titik embun {dewText}°C — kulit hanya {marginText}°C di atasnya, keringat nyaris tidak bisa menguap':
    'Dew point {dewText}°C — the skin is only {marginText}°C above it, so sweat can barely evaporate',
  'Titik embun {dewText}°C — kulit masih {marginText}°C di atasnya':
    'Dew point {dewText}°C — the skin is still {marginText}°C above it',
  'Kelembapan sepatu {humidityText} % RH — setara {skinText} % di permukaan kulit':
    'In-shoe humidity {humidityText} % RH — equivalent to {skinText} % at the skin surface',

  // ---------------------------------------------------------------- activity & fatigue
  'Indikasi Kelelahan': 'Fatigue Indication',
  'Belum ada data sesi pemakaian.': 'No wear-session data yet.',
  'Beban tinggi berkelanjutan: {sustainedText} menit':
    'Sustained high load: {sustainedText} minutes',
  'Belum ada indikasi kelelahan berarti.': 'No meaningful fatigue indication yet.',
  'Estimasi berbasis pola sensor, bukan pengukuran klinis kelelahan otot.':
    'An estimate based on sensor patterns, not a clinical measurement of muscle fatigue.',
  'Aktivitas Harian': 'Daily Activity',
  'Pola gerak & beban kaki harian': 'Daily movement patterns & foot load',
  'Belum ada data langkah dari perangkat ini — sensor gerak belum terdeteksi atau belum mengirim data.':
    'No step data from this device yet — the motion sensor has not been detected or has not sent data.',
  'Total Langkah': 'Total Steps',
  '{hoursText}j {minsText}m': '{hoursText}h {minsText}m',
  '{minsText}m': '{minsText}m',
  // "Wear time" adalah istilah baku pada alas kaki diabetik: ukuran seberapa
  // patuh pasien memakainya, dan justru itu yang berguna dilihat dokter.
  'Waktu Pemakaian': 'Wear Time',
  'Jumlah langkah adalah estimasi dari data gerak kaki, bisa terhitung lebih sedikit saat berjalan cepat atau berlari.':
    'The step count is estimated from foot motion data and may undercount when you walk fast or run.',
  'Beban tinggi berkelanjutan {minutesText} menit':
    'Sustained high load for {minutesText} minutes',
  'Distribusi tekanan bergeser ke metatarsal +{ppText}pp':
    'Pressure distribution shifted toward the metatarsal by {ppText}pp',
  'Distribusi tekanan mulai bergeser ke metatarsal +{ppText}pp':
    'Pressure distribution starting to shift toward the metatarsal by {ppText}pp',
  'Suhu kaki naik {riseText} °C selama sesi (sinyal sekunder)':
    'Foot temperature rose {riseText} °C during the session (secondary signal)',
  'Total {stepsText} langkah dalam sesi ini': '{stepsText} steps total this session',
  'Indikasi kelelahan: {levelText}': 'Fatigue indication: {levelText}',

  // ---------------------------------------------------------------- charts & history
  'Grafik {label} — nilai terakhir {lastValue} {unit}':
    '{label} chart — latest value {lastValue} {unit}',
  'Belum ada data pada rentang ini.': 'No data in this range yet.',
  'Berdasarkan {daysText} dari {totalText} hari yang tercatat':
    'Based on {daysText} of {totalText} recorded days',
  'Rata-rata Tekanan — {rangeLabel}': 'Average Pressure — {rangeLabel}',
  'Rata-rata Suhu Kulit — {rangeLabel}': 'Average Skin Temperature — {rangeLabel}',
  'Rata-rata Kelembapan — {rangeLabel}': 'Average Humidity — {rangeLabel}',
  Tekanan: 'Pressure',
  Suhu: 'Temperature',
  Kelembapan: 'Humidity',
  'Selisih Suhu': 'Temp. Spread',
  Kelelahan: 'Fatigue',
  'Selisih Suhu Menetap': 'Persistent Temp. Spread',
  'Kondisi kaki & sepatu secara real-time': 'Your foot & shoe condition in real time',
  Refresh: 'Refresh',
  'Peta Sensor Insole': 'Insole Sensor Map',
  'Titik tekanan & suhu per sensor pada insole secara real-time':
    'Per-sensor pressure & temperature points on the insole, in real time',
  'Histori Tren': 'Trend History',
  'Pola tekanan, suhu, selisih suhu & kelembapan — 7 hari terakhir':
    'Pressure, temperature, temperature spread & humidity patterns — last 7 days',
  'Lihat Selengkapnya': 'See More',
  '{rangeDays, plural, one {# hari} other {# hari}}':
    '{rangeDays, plural, one {# day} other {# days}}',
  '{rangeDays, plural, one {# Hari Terakhir} other {# Hari Terakhir}}':
    '{rangeDays, plural, one {Last # Day} other {Last # Days}}',
  Terbaru: 'Newest',
  Terlama: 'Oldest',
  'Data historis tekanan, suhu & kelembapan sepatu':
    'Historical pressure, temperature & humidity data from the shoe',
  'Rentang waktu': 'Time range',
  '7 Hari': '7 Days',
  '30 Hari': '30 Days',
  'Tren Historis': 'Historical Trends',
  'Pola tekanan, suhu, selisih suhu & kelembapan — {rangeText} terakhir':
    'Pressure, temperature, temperature spread & humidity patterns — last {rangeText}',
  'Tampilkan metrik': 'Show metrics',
  'Tabel Data': 'Data Table',
  'Memuat data…': 'Loading data…',
  '{entryCount} entri dalam {rangeText} terakhir':
    '{entryCount} entries in the last {rangeText}',
  'Urutkan: {sortLabel}': 'Sort: {sortLabel}',
  'Export CSV': 'Export CSV',
  'Export PDF': 'Export PDF',
  Tanggal: 'Date',
  'Tekanan (kPa)': 'Pressure (kPa)',
  'Suhu (°C)': 'Temperature (°C)',
  'Selisih (°C)': 'Spread (°C)',
  'Kelembapan (%RH)': 'Humidity (%RH)',
  Langkah: 'Steps',
  Status: 'Status',
  'Tidak ada log': 'No log',
  '{0, plural, one {# peringatan} other {# peringatan}}':
    '{0, plural, one {# alert} other {# alerts}}',
  'Tidak ada': 'None',
  'Belum ada data histori.': 'No history data yet.',

  // ---------------------------------------------------------------- alerts page
  Semua: 'All',
  'Hari Ini': 'Today',
  Kemarin: 'Yesterday',
  'Waktu tidak diketahui': 'Unknown time',
  Peringatan: 'Alerts',
  'Dipicu saat tekanan, suhu, atau kelembapan memasuki status Perhatian/Risiko':
    'Triggered when pressure, temperature, or humidity enters Attention/Risk status',
  'Total Peringatan': 'Total Alerts',
  entri: 'entries',
  'Peringatan terakhir: {lastAlertAt}': 'Last alert: {lastAlertAt}',
  'Status mendekati ambang risiko': 'Status approaching the risk threshold',
  'Risiko Terdeteksi': 'Risk Detected',
  'Melewati ambang aman — perlu tindakan': 'Past the safe threshold — action needed',
  'Riwayat Peringatan': 'Alert History',
  'Memuat riwayat peringatan…': 'Loading alert history…',
  '{shownCount} dari {totalCount} entri': '{shownCount} of {totalCount} entries',
  'Filter tingkat keparahan': 'Filter by severity',
  'Belum ada peringatan tercatat. Semua parameter masih dalam batas aman.':
    'No alerts recorded yet. All parameters are still within safe limits.',
  'Tidak ada peringatan dengan filter ini.': 'No alerts match this filter.',
  'Lokasi: {areaName}': 'Location: {areaName}',
  'Catatan hanya dibuat saat dashboard sedang dibuka di browser. Untuk peringatan yang tetap terkirim saat aplikasi tertutup, diperlukan pemantauan sisi server (Cloud Function + push notification) yang belum diaktifkan pada proyek ini.':
    'Records are only created while the dashboard is open in a browser. Alerts that still arrive when the app is closed would require server-side monitoring (a Cloud Function plus push notifications), which is not enabled in this project yet.',
  'Glykos — {label} Berisiko': 'Glykos — {label} at Risk',
  'Glykos — Selisih Suhu Menetap': 'Glykos — Persistent Temperature Spread',

  // ---------------------------------------------------------------- alert messages
  '{peakText} kPa': '{peakText} kPa',
  'Tekanan puncak {peakText} kPa ({statusText})': 'Peak pressure {peakText} kPa ({statusText})',
  '{highestText} °C': '{highestText} °C',
  'Selisih suhu {deltaText} °C antar area — prediktor pre-ulkus':
    'Temperature spread of {deltaText} °C between areas — a pre-ulcer predictor',
  'Suhu tertinggi {highestText} °C': 'Highest temperature {highestText} °C',
  '{humidityText} % RH': '{humidityText} % RH',
  'Kelembapan sepatu {humidityText} % RH': 'In-shoe humidity {humidityText} % RH',
  '{maxDeltaText} °C · {daysText} hari': '{maxDeltaText} °C · {daysText} days',
  'Selisih suhu antar area bertahan di atas {thresholdText} °C selama {daysText} hari berturut-turut (tertinggi {maxDeltaText} °C).':
    'The temperature spread between areas has stayed above {thresholdText} °C for {daysText} consecutive days (peak {maxDeltaText} °C).',

  // ---------------------------------------------------------------- kenaikan suhu
  // "Pola menyeluruh" (systemic) vs "peradangan setempat" (focal) adalah
  // pembedaan klinis inti aturan ini — istilah Inggrisnya dipilih supaya
  // perbedaan itu tetap tegas: whole-foot vs localised.
  'Naik {riseText}°C merata di semua titik — pola menyeluruh, bukan peradangan setempat':
    'Up {riseText}°C evenly across all points — a whole-foot pattern, not localised inflammation',
  'Naik {riseText}°C hanya di {risenText} dari {areaText} titik — pola peradangan setempat':
    'Up {riseText}°C at only {risenText} of {areaText} points — a localised inflammation pattern',
  'Suhu naik {riseText} °C merata di semua titik — pola menyeluruh, bukan peradangan setempat':
    'Temperature up {riseText} °C evenly across all points — a whole-foot pattern, not localised inflammation',
  'Suhu naik {riseText} °C hanya di {risenText} dari {areaText} titik — pola peradangan setempat':
    'Temperature up {riseText} °C at only {risenText} of {areaText} points — a localised inflammation pattern',
  'Titik naik': 'Points risen',
  '{risenText} dari {areaText} titik': '{risenText} of {areaText} points',
  seragam: 'even',

  // ---------------------------------------------------------------- temperature trend
  'Selisih Suhu Antar Area': 'Temperature Spread Between Areas',
  'Hari yang terpantau: <0>{period}</0>': 'Days monitored: <0>{period}</0>',
  'Periksa kaki secara visual hari ini — cari kemerahan, lecet, atau kulit yang terasa lebih hangat.':
    'Check your feet visually today — look for redness, blisters, or skin that feels warmer than usual.',
  'Pakai sepatu Glykos lagi besok supaya polanya bisa dipastikan, bukan sekadar satu hari yang panas.':
    'Wear your Glykos shoes again tomorrow so the pattern can be confirmed, rather than just one warm day.',
  'Kurangi beban pada kaki tersebut: batasi berdiri dan berjalan lama selama beberapa hari.':
    'Reduce the load on that foot: limit prolonged standing and walking for a few days.',
  'Periksa kaki dua kali sehari — kemerahan, lecet, atau luka sekecil apa pun.':
    'Check your feet twice a day — for redness, blisters, or any wound, however small.',
  'Hubungi tenaga kesehatan bila selisih ini bertahan, atau bila ada luka, nanah, atau demam.':
    'Contact a healthcare professional if this spread persists, or if there is a wound, pus, or fever.',
  'Indikator pemantauan, bukan diagnosis. Keputusan penanganan tetap ada pada tenaga kesehatan Anda.':
    'A monitoring indicator, not a diagnosis. Treatment decisions remain with your healthcare professional.',
  'Selisih suhu antar area kaki dalam batas normal.':
    'The temperature spread between foot areas is within normal limits.',
  'Selisih suhu antar area bertahan di atas {thresholdText} °C selama {daysText} hari berturut-turut (tertinggi {deltaText} °C).':
    'The temperature spread between areas has stayed above {thresholdText} °C for {daysText} consecutive days (peak {deltaText} °C).',
  'Selisih suhu antar area mencapai {deltaText} °C hari ini, di atas ambang {thresholdText} °C.':
    'The temperature spread between areas reached {deltaText} °C today, above the {thresholdText} °C threshold.',

  // ---------------------------------------------------------------- stale data
  'Data tidak diperbarui': 'Data is not updating',
  'Perangkat sedang tidak mengirim data. Angka di bawah adalah pembacaan terakhir yang tersimpan <0>{lastSeen}</0>, bukan kondisi kaki Anda saat ini.':
    'The device is not sending data right now. The numbers below are the last reading saved <0>{lastSeen}</0>, not your current foot condition.',
  'Update terakhir {lastUpdateText}': 'Last updated {lastUpdateText}',
  'baru saja': 'just now',
  '{minutes, plural, one {# menit lalu} other {# menit lalu}}':
    '{minutes, plural, one {# minute ago} other {# minutes ago}}',
  '{hours, plural, one {# jam lalu} other {# jam lalu}}':
    '{hours, plural, one {# hour ago} other {# hours ago}}',
  '{days, plural, one {# hari lalu} other {# hari lalu}}':
    '{days, plural, one {# day ago} other {# days ago}}',

  // ---------------------------------------------------------------- chatbot
  'Halo! Saya asisten Glykos. Saya bisa membaca angka sensor sepatu Anda — tanyakan kondisi kaki Anda hari ini, arti tekanan/suhu/kelembapan yang terbaca, atau perawatan kaki diabetes pada umumnya.':
    "Hello! I'm the Glykos assistant. I can read your shoe's sensor numbers — ask me about your foot condition today, what the pressure/temperature/humidity readings mean, or diabetic foot care in general.",
  'Bagaimana kondisi kaki saya hari ini?': 'How are my feet doing today?',
  'Apa yang perlu saya perhatikan dari data minggu ini?':
    "What should I watch out for in this week's data?",
  'Kenapa suhu kulit dipantau?': 'Why is skin temperature monitored?',
  'Mengapa kelembapan dalam sepatu berbahaya?': 'Why is humidity inside the shoe harmful?',
  'Terjadi kesalahan saat mengirim pesan.': 'Something went wrong while sending your message.',
  'Asisten Glykos': 'Glykos Assistant',
  'Ditenagai AI · Online': 'AI-powered · Online',
  'Asisten sedang mengetik': 'The assistant is typing',
  'Pertanyaan cepat': 'Quick questions',
  'Tulis pertanyaan Anda…': 'Type your question…',
  'Kirim pesan': 'Send message',
  'Jawaban memakai pembacaan sensor sepatu Anda (tekanan, suhu, kelembapan, langkah). Data profil seperti nama, HbA1c, dan riwayat luka tidak dikirim. Informasi bersifat edukatif dan bukan pengganti diagnosis dokter.':
    "Answers use your shoe's sensor readings (pressure, temperature, humidity, steps). Profile data such as your name, HbA1c, and wound history is not sent. This information is educational and is not a substitute for a doctor's diagnosis.",

  // ---------------------------------------------------------------- Gemini prompt
  // Kalimat perintah bahasanya sengaja MENYEBUT bahasa Inggris di sini — itulah
  // yang membuat model menjawab dalam bahasa antarmuka tanpa logika tambahan.
  // Lihat catatan di services/gemini.js.
  'Anda adalah asisten untuk proyek sepatu pintar diabetes Glykos. Jawablah hanya pertanyaan yang berkaitan dengan proyek ini, kesehatan kaki penderita diabetes, sensor sepatu pintar, serta pemantauan tekanan, suhu, dan kelembapan. Gunakan bahasa Indonesia dalam semua jawaban. Jangan menjawab pertanyaan di luar cakupan tersebut.':
    'You are an assistant for the Glykos diabetic smart shoe project. Only answer questions related to this project, diabetic foot health, smart shoe sensors, and the monitoring of pressure, temperature, and humidity. Answer in English in all replies. Do not answer questions outside that scope.',
  'Anda diberi ringkasan pembacaan sensor milik pengguna di bawah ini.':
    "You are given a summary of the user's own sensor readings below.",
  'Pakai angka tersebut bila relevan: sebut nilainya, bandingkan dengan ambangnya, dan jelaskan artinya dengan bahasa sehari-hari.':
    'Use those numbers when relevant: state the values, compare them with their thresholds, and explain what they mean in plain language.',
  'JANGAN pernah menyebut angka pembacaan yang tidak ada dalam ringkasan ini. Kalau pengguna menanyakan sesuatu yang tidak tercakup, katakan terus terang bahwa datanya tidak tersedia.':
    'NEVER cite a reading that is not present in this summary. If the user asks about something not covered, say plainly that the data is not available.',
  'JANGAN memberi diagnosis, vonis, atau instruksi pengobatan. Untuk pola yang menetap atau tanda luka, arahkan pengguna memeriksakan diri ke tenaga kesehatan.':
    'DO NOT give a diagnosis, a verdict, or treatment instructions. For persistent patterns or signs of a wound, direct the user to see a healthcare professional.',
  'Konfigurasi AI belum lengkap. VITE_GEMINI_API_KEY belum diatur.':
    'The AI configuration is incomplete. VITE_GEMINI_API_KEY is not set.',
  'Kuota AI sedang penuh. Silakan coba lagi beberapa saat.':
    'The AI quota is currently full. Please try again shortly.',
  'Model AI sedang sibuk. Silakan coba lagi sebentar.':
    'The AI model is busy. Please try again in a moment.',
  'Permintaan gagal (status {httpStatus}).': 'Request failed (status {httpStatus}).',
  'Maaf, tidak ada jawaban yang bisa ditampilkan saat ini.':
    'Sorry, there is no answer to show right now.',

  // ---------------------------------------------------------------- sensor context
  aman: 'safe',
  'perlu perhatian': 'needs attention',
  berisiko: 'at risk',
  tinggi: 'high',
  sedang: 'moderate',
  rendah: 'low',
  'tidak diketahui': 'unknown',
  'pembacaan langsung': 'live reading',
  'pembacaan tersimpan terakhir': 'last saved reading',
  'PERHATIAN: angka di bawah adalah DATA CONTOH, bukan pembacaan perangkat pengguna. Sebutkan hal ini kalau pengguna bertanya tentang kondisinya sendiri.':
    "NOTE: the numbers below are SAMPLE DATA, not readings from the user's device. Say so if the user asks about their own condition.",
  'KONDISI TERKINI (dari sepatu milik pengguna):': "CURRENT CONDITION (from the user's shoe):",
  '- Sumber data: {sourceText}': '- Data source: {sourceText}',
  '- Tekanan puncak: {peakText} kPa di {where} ({state}; aman < {0} kPa, risiko ulkus > {1} kPa)':
    '- Peak pressure: {peakText} kPa at the {where} ({state}; safe < {0} kPa, ulcer risk > {1} kPa)',
  '- Suhu kulit tertinggi: {highestText} °C di {where} (rentang normal {0}–{1} °C)':
    '- Highest skin temperature: {highestText} °C at the {where} (normal range {0}–{1} °C)',
  '- Selisih suhu antar area: {deltaText} °C (ambang perhatian {0} °C — selisih yang bertahan berhari-hari adalah prediktor pre-ulkus)':
    '- Temperature spread between areas: {deltaText} °C (attention threshold {0} °C — a spread that persists for days is a pre-ulcer predictor)',
  '- Kelembapan dalam sepatu: {humidityText} % RH ({state}; ideal {0}–{1} %, risiko > {2} %)':
    '- In-shoe humidity: {humidityText} % RH ({state}; ideal {0}–{1} %, risk > {2} %)',
  '- Aktivitas hari ini: {stepsText} langkah, {minutesText} menit pemakaian':
    '- Today: {stepsText} steps, {minutesText} minutes of wear',
  '- Indikasi kelelahan kaki: {levelText}': '- Foot fatigue indication: {levelText}',
  'RANGKUMAN {rangeText} HARI TERAKHIR ({recordedText} hari tercatat):':
    'SUMMARY OF THE LAST {rangeText} DAYS ({recordedText} days recorded):',
  '- Tekanan puncak: rata-rata {avgPressure} kPa, tertinggi {maxPressure} kPa':
    '- Peak pressure: {avgPressure} kPa on average, {maxPressure} kPa highest',
  '- Selisih suhu: rata-rata {avgDelta} °C, {overText} dari {recordedText} hari di atas ambang {0} °C':
    '- Temperature spread: {avgDelta} °C on average, {overText} of {recordedText} days above the {0} °C threshold',
  '- Kelembapan: rata-rata {avgHumidity} % RH': '- Humidity: {avgHumidity} % RH on average',
  '- Total langkah tercatat: {totalStepsText}': '- Total steps recorded: {totalStepsText}',
  'POLA YANG SEDANG BERJALAN: selisih suhu di atas ambang selama {daysText} hari berturut-turut (tertinggi {maxDeltaText} °C) — status "{levelText}".':
    'ONGOING PATTERN: temperature spread above the threshold for {daysText} consecutive days (peak {maxDeltaText} °C) — status "{levelText}".',

  // ---------------------------------------------------------------- profile page
  'Terkirim — periksa notifikasi perangkat Anda.': 'Sent — check your device notifications.',
  'Gagal dikirim. Periksa izin notifikasi di pengaturan browser atau sistem.':
    'Failed to send. Check notification permissions in your browser or system settings.',
  'Tipe 1': 'Type 1',
  'Tipe 2': 'Type 2',
  Gestasional: 'Gestational',
  'Glykos — Notifikasi Uji': 'Glykos — Test Notification',
  'Notifikasi berhasil dikirim. Peringatan sungguhan akan tampil seperti ini.':
    'Notification sent successfully. Real alerts will look like this.',
  'Profil Pasien': 'Patient Profile',
  'Perangkat terpasang: {deviceName}': 'Device in use: {deviceName}',
  'Tipe Diabetes': 'Diabetes Type',
  'Pilih tipe': 'Select a type',
  'HbA1c Terakhir (%)': 'Latest HbA1c (%)',
  'mis. 7.2': 'e.g. 7.2',
  'Riwayat Luka / Ulkus': 'Wound / Ulcer History',
  'Catatan riwayat luka kaki, operasi, atau amputasi sebelumnya':
    'Notes on previous foot wounds, surgery, or amputation',
  'Kontak Darurat': 'Emergency Contact',
  'Nama & nomor telepon': 'Name & phone number',
  'Menyimpan…': 'Saving…',
  'Simpan Profil': 'Save Profile',
  'Tersimpan {savedTime}': 'Saved at {savedTime}',
  'Notifikasi Peringatan': 'Alert Notifications',
  'Izinkan notifikasi browser untuk mendapat peringatan instan saat status berubah menjadi Risiko.':
    'Allow browser notifications to get an instant alert when a status changes to Risk.',
  'Browser ini tidak mendukung notifikasi.': 'This browser does not support notifications.',
  'Notifikasi aktif di browser ini.': 'Notifications are enabled in this browser.',
  'Kirim Notifikasi Uji': 'Send Test Notification',
  'Notifikasi diblokir. Aktifkan lewat pengaturan izin situs pada browser Anda.':
    'Notifications are blocked. Enable them through your browser’s site permission settings.',
  'Aktifkan Notifikasi': 'Enable Notifications',
  'Bantuan & Pertanyaan Umum': 'Help & Frequently Asked Questions',
  'Masalah yang sering dialami pengguna seputar koneksi perangkat dan fitur aplikasi.':
    'Problems users commonly run into with device connectivity and app features.',

  // ---------------------------------------------------------------- FAQ
  'Koneksi & Perangkat': 'Connectivity & Device',
  'Tombol "Sambungkan" tidak menemukan perangkat saya':
    'The "Connect" button cannot find my device',
  'Web Bluetooth hanya berjalan di Chrome atau Edge (desktop maupun Android) — Safari dan browser iOS tidak didukung. Halaman juga harus dibuka lewat HTTPS atau http://localhost, bukan file://. Pastikan Bluetooth di perangkat Anda aktif dan browser sudah diberi izin akses Bluetooth, lalu pilih perangkat bernama "glykos device" di jendela pemilih yang muncul.':
    'Web Bluetooth only runs in Chrome or Edge (desktop and Android) — Safari and iOS browsers are not supported. The page must also be opened over HTTPS or http://localhost, not file://. Make sure Bluetooth is on and the browser has Bluetooth permission, then pick the device named "glykos device" in the chooser window that appears.',
  'Perangkat terputus sendiri saat dipakai': 'The device disconnects on its own during use',
  'Koneksi Bluetooth Low Energy bisa putus kalau sepatu di luar jangkauan (±10 m), baterai perangkat lemah, atau tab browser lama tidak aktif di latar belakang. Sambungkan kembali lewat tombol Bluetooth di bagian atas dashboard — data yang sempat tersimpan sebelum putus tidak hilang.':
    'A Bluetooth Low Energy connection can drop if the shoe goes out of range (about 10 m), the device battery is low, or the browser tab sits inactive in the background for a long time. Reconnect using the Bluetooth button at the top of the dashboard — data saved before the drop is not lost.',
  'Indikator "Live" tidak menyala meski perangkat sudah tersambung':
    'The "Live" indicator stays off even though the device is connected',
  'Badge "Live" menyala saat ada paket data baru dari BLE. Jika belum menyala, cek status koneksi di pojok kanan atas dashboard — kemungkinan perangkat masih dalam proses pairing atau notifikasi karakteristik belum aktif. Coba putuskan lalu sambungkan ulang.':
    'The "Live" badge lights up when a new data packet arrives over BLE. If it has not, check the connection status in the top-right corner of the dashboard — the device may still be pairing, or characteristic notifications may not be active yet. Try disconnecting and reconnecting.',
  'Sebagian angka (kelembapan, suhu udara, akselerasi) terus menampilkan 0':
    'Some numbers (humidity, air temperature, acceleration) keep showing 0',
  'Beberapa sensor pada firmware (RH, TA, serta AX/AY/AZ) hanya mengirim datanya kalau modul tersebut terdeteksi saat startup. Kalau salah satu sensor tidak terpasang atau gagal diinisialisasi, key-nya memang tidak dikirim dan web app menampilkannya sebagai 0 — ini bukan galat di aplikasi, melainkan kondisi perangkat keras.':
    'Some firmware sensors (RH, TA, and AX/AY/AZ) only send data if their module is detected at startup. If one of them is not fitted or fails to initialise, its key is simply not sent and the web app shows it as 0 — that is a hardware condition, not an app error.',
  'Data & Fitur': 'Data & Features',
  'Grafik dan tabel di halaman Riwayat kosong':
    'The charts and table on the History page are empty',
  'Riwayat hanya terisi dari sesi yang benar-benar tersambung BLE — web app menulis data ke Firestore kira-kira tiap 1 menit selama perangkat aktif. Kalau baru pertama kali memakai sepatu Glykos atau sesi pemakaian sangat singkat, hari tersebut memang belum punya catatan.':
    'History is only filled from sessions that were actually connected over BLE — the web app writes to Firestore roughly once a minute while the device is active. If this is your first time wearing the Glykos shoe, or the session was very short, that day genuinely has no record yet.',
  'Jumlah langkah terasa kurang akurat, terutama saat jalan cepat atau lari':
    'The step count feels inaccurate, especially when walking fast or running',
  'Jumlah langkah dihitung dari data akselerasi yang dikirim firmware sekitar 3 kali per detik. Untuk jalan santai angka ini cukup akurat, tapi pada cadence cepat beberapa langkah bisa tidak terhitung karena keterbatasan laju pengiriman data tersebut — bukan kesalahan pada algoritmanya.':
    'The step count is computed from acceleration data the firmware sends about three times per second. For relaxed walking it is reasonably accurate, but at a fast cadence some steps can be missed because of that transmission rate — not because of a flaw in the algorithm.',
  'Apakah status "Risiko Kelelahan" adalah diagnosis medis?':
    'Is the "Fatigue Risk" status a medical diagnosis?',
  'Bukan. Indikator kelelahan adalah heuristik transparan yang menggabungkan durasi beban tekanan tinggi, pergeseran distribusi tekanan, kenaikan suhu, dan jumlah langkah dalam satu sesi pemakaian. Ini sinyal pendukung untuk mengingatkan Anda beristirahat, bukan pengukuran klinis kelelahan otot — tetap konsultasikan kondisi kaki Anda ke tenaga medis.':
    'No. The fatigue indicator is a transparent heuristic combining how long pressure stayed high, how the pressure distribution shifted, temperature rise, and step count within a single wear session. It is a supporting signal to remind you to rest, not a clinical measurement of muscle fatigue — still discuss your foot condition with a medical professional.',
  'Chatbot tidak menjawab atau muncul pesan kuota penuh':
    'The chatbot does not answer, or shows a quota-full message',
  'Chatbot memakai model AI gratis yang punya batas pemakaian harian; pesan "Kuota AI sedang penuh" atau "Model AI sedang sibuk" berarti perlu mencoba lagi beberapa saat kemudian. Chatbot ini juga sengaja dibatasi hanya menjawab topik seputar Glykos dan kesehatan kaki diabetes.':
    'The chatbot uses a free AI model with a daily usage limit; "The AI quota is currently full" or "The AI model is busy" means you should try again a little later. The chatbot is also deliberately restricted to topics around Glykos and diabetic foot health.',
  'Notifikasi peringatan tidak pernah muncul': 'Alert notifications never appear',
  'Notifikasi perlu diaktifkan manual lewat tombol "Aktifkan Notifikasi" di halaman ini, dan browser Anda harus mendukung Notification API. Jika status menunjukkan "diblokir", izinnya harus diubah lewat pengaturan situs pada browser (ikon gembok di address bar), bukan dari dalam aplikasi.':
    'Notifications must be enabled manually with the "Enable Notifications" button on this page, and your browser must support the Notification API. If the status shows "blocked", the permission has to be changed through your browser’s site settings (the padlock icon in the address bar), not from inside the app.',
  'Apakah data kaki saya aman dan siapa yang bisa melihatnya?':
    'Is my foot data safe, and who can see it?',
  'Setiap pembacaan sensor dan profil kesehatan tersimpan di Firestore terikat ke akun Anda, dan seluruh halaman dashboard hanya bisa diakses setelah login. Jangan bagikan kredensial akun Anda ke orang lain untuk menjaga data tetap privat.':
    'Every sensor reading and health profile is stored in Firestore bound to your account, and all dashboard pages require signing in. Do not share your account credentials with anyone, so your data stays private.',

  // ---------------------------------------------------------------- landing page
  'Pemantauan Tekanan Plantar': 'Plantar Pressure Monitoring',
  'Sensor pada titik tumit, metatarsal & jari kaki mendeteksi tekanan berlebih yang berisiko memicu luka.':
    'Sensors at the heel, metatarsal, and toe detect excess pressure that risks triggering a wound.',
  'Deteksi Selisih Suhu Kaki': 'Foot Temperature Spread Detection',
  'Selisih suhu antar area adalah salah satu prediktor dini peradangan sebelum luka terlihat kasat mata.':
    'The temperature spread between areas is one of the earliest predictors of inflammation, before a wound is visible.',
  'Kelembapan Dalam Sepatu': 'In-Shoe Humidity',
  'Kelembapan berlebih meningkatkan risiko maserasi & infeksi jamur pada kulit yang sudah rentan.':
    'Excess humidity raises the risk of maceration and fungal infection on already vulnerable skin.',
  'Aktivitas & Pola Gerak': 'Activity & Movement Patterns',
  'Rekam jumlah langkah dan waktu aktif harian untuk memahami beban yang diterima kaki sepanjang hari.':
    'Record daily step count and active time to understand the load your feet carry through the day.',
  'Dashboard Real-time': 'Real-Time Dashboard',
  'Semua data sensor tersaji dalam satu dashboard yang mudah dibaca, kapan saja dan di mana saja.':
    'All sensor data in one easy-to-read dashboard, any time and anywhere.',
  'Export Laporan Medis': 'Medical Report Export',
  'Unduh riwayat data dalam format CSV atau PDF untuk dibawa ke konsultasi dengan dokter.':
    'Download your data history as CSV or PDF to bring to a consultation with your doctor.',
  'Selisih suhu antar area': 'Temperature spread between areas',
  'Selisih suhu di atas ambang ini dikenal dalam literatur kaki diabetik sebagai penanda pre-ulkus — sering muncul sebelum luka terlihat.':
    'A temperature spread above this threshold is known in the diabetic foot literature as a pre-ulcer marker — it often appears before a wound is visible.',
  'Batas tekanan plantar': 'Plantar pressure limit',
  'Di bawah 200 kPa ditandai aman, 200–250 kPa perlu perhatian, di atas 250 kPa ditandai sebagai risiko ulkus pada dashboard.':
    'Below 200 kPa is marked safe, 200–250 kPa needs attention, and above 250 kPa is marked as ulcer risk on the dashboard.',
  'Batas kelembapan sepatu': 'In-shoe humidity limit',
  'Kelembapan di atas ambang ini meningkatkan risiko maserasi kulit dan infeksi jamur pada kaki yang sudah rentan.':
    'Humidity above this threshold raises the risk of skin maceration and fungal infection on already vulnerable feet.',
  'Pakai Sepatu Glykos': 'Wear the Glykos Shoe',
  'Pakai seperti sepatu biasa — insole bersensor sudah terpasang di dalamnya, tidak ada yang perlu dirakit sendiri.':
    'Wear it like an ordinary shoe — the sensor insole is already fitted inside, with nothing for you to assemble.',
  'Sensor Merekam Kondisi Kaki': 'Sensors Record Your Foot Condition',
  'Tekanan, suhu, kelembapan & aktivitas terekam otomatis dan dikirim ke ponsel lewat Bluetooth.':
    'Pressure, temperature, humidity, and activity are recorded automatically and sent to your phone over Bluetooth.',
  'Pantau & Tindak Lanjuti': 'Monitor & Follow Up',
  'Anda, keluarga, atau dokter dapat memantau dashboard dan mengambil tindakan preventif lebih awal.':
    'You, your family, or your doctor can watch the dashboard and take preventive action earlier.',
  'Jenis sensor': 'Sensor types',
  'Titik tekanan': 'Pressure points',
  'Real-time': 'Real-time',
  'Kirim via Bluetooth': 'Sent over Bluetooth',
  'Mengapa Glykos': 'Why Glykos',
  'Dasar Pemantauan': 'Monitoring Basis',
  Fitur: 'Features',
  'Cara Kerja': 'How It Works',
  Tim: 'Team',
  'Lompat ke konten utama': 'Skip to main content',
  'Navigasi halaman': 'Page navigation',
  'Buka menu navigasi': 'Open navigation menu',
  'Tutup menu': 'Close menu',
  'Wearable Health-Tech': 'Wearable Health-Tech',
  'Sepatu Pintar Pendeteksi Dini <0>Risiko Ulkus Diabetik</0>':
    'A Smart Shoe for Early Detection of <0>Diabetic Ulcer Risk</0>',
  'Glykos adalah sepatu pintar yang memantau tekanan, suhu, kelembapan, dan aktivitas kaki secara real-time — membantu penderita diabetes dengan neuropati mendeteksi tanda awal luka sebelum menjadi masalah serius.':
    'Glykos is a smart shoe that monitors foot pressure, temperature, humidity, and activity in real time — helping people with diabetic neuropathy spot the first signs of a wound before it becomes serious.',
  'Lihat Cara Kerja': 'See How It Works',
  'Spesifikasi ringkas': 'At a glance',
  'Mengapa Kaki Diabetes Butuh Perhatian Ekstra?':
    'Why Do Diabetic Feet Need Extra Attention?',
  'Banyak penderita diabetes mengalami neuropati — mati rasa pada saraf kaki — sehingga tidak menyadari tekanan berlebih atau peradangan dini yang berisiko menjadi ulkus diabetik. Glykos hadir sebagai “indera pengganti” yang bekerja diam-diam di dalam sepatu.':
    'Many people with diabetes develop neuropathy — numbness in the nerves of the foot — and so never feel the excess pressure or early inflammation that can turn into a diabetic ulcer. Glykos acts as a “substitute sense” working quietly inside the shoe.',
  'Sulit Disadari Sejak Dini': 'Hard to Notice Early',
  'Neuropati membuat tanda-tanda awal luka — tekanan berlebih, panas, dan lembap — sulit dirasakan langsung oleh penderita.':
    'Neuropathy makes the earliest signs of a wound — excess pressure, heat, and moisture — hard for the person to feel directly.',
  'Berisiko Menjadi Luka Kronis': 'Risks Becoming a Chronic Wound',
  'Tanpa deteksi dini, cedera kecil dapat berkembang menjadi luka yang sulit sembuh dan berisiko komplikasi lebih lanjut.':
    'Without early detection, a small injury can grow into a wound that heals poorly and risks further complications.',
  'Perlu Pemantauan Berkelanjutan': 'Needs Continuous Monitoring',
  'Pemantauan rutin membantu pasien, keluarga, dan dokter mengambil tindakan preventif sebelum kondisi memburuk.':
    'Routine monitoring helps patients, families, and doctors take preventive action before things get worse.',
  'Ambang yang Dipakai Glykos': 'The Thresholds Glykos Uses',
  'Setiap status “aman”, “perhatian”, dan “risiko” pada dashboard dihitung dari ambang berikut — bukan penilaian samar, sehingga bisa Anda periksa dan diskusikan dengan dokter.':
    'Every “safe”, “attention”, and “risk” status on the dashboard is computed from the thresholds below — not a vague judgement, so you can check them and discuss them with your doctor.',
  'Semua yang Dibutuhkan untuk Memantau Kaki': 'Everything You Need to Monitor Your Feet',
  'Empat jenis sensor, satu dashboard, dipantau kapan saja.':
    'Four sensor types, one dashboard, watchable any time.',
  'Unit sensor<0>Bluetooth Low Energy</0>': 'Sensor unit<0>Bluetooth Low Energy</0>',
  'Tiga Langkah Menuju Kaki yang Terpantau': 'Three Steps to Monitored Feet',
  'Dari memakai sepatunya sampai membaca hasilnya di dashboard.':
    'From putting the shoes on to reading the results on the dashboard.',
  'Tim di Balik Glykos': 'The Team Behind Glykos',
  'Tim inti yang membangun Glykos dari riset hingga produk.':
    'The core team that built Glykos from research to product.',
  'Mulai hari ini': 'Start today',
  'Mulai Pantau Kesehatan Kaki Anda Hari Ini': 'Start Monitoring Your Foot Health Today',
  'Gratis untuk mendaftar — hubungkan perangkat Glykos Anda dalam hitungan menit.':
    'Free to sign up — connect your Glykos device in minutes.',
  'Sepatu pintar pemantau tekanan, suhu, dan kelembapan kaki untuk membantu deteksi dini risiko ulkus diabetik.':
    'A smart shoe monitoring foot pressure, temperature, and humidity to help detect diabetic ulcer risk early.',
  'Navigasi footer': 'Footer navigation',
  Produk: 'Product',
  Akun: 'Account',
  Dashboard: 'Dashboard',
  '<0>Catatan penting:</0> Glykos adalah alat bantu pemantauan, bukan alat diagnosis medis. Data yang ditampilkan tidak menggantikan pemeriksaan, diagnosis, atau saran tenaga kesehatan profesional. Segera hubungi dokter jika Anda menemukan luka, perubahan warna, atau nyeri pada kaki.':
    '<0>Important note:</0> Glykos is a monitoring aid, not a medical diagnostic device. The data shown does not replace examination, diagnosis, or advice from a healthcare professional. Contact a doctor promptly if you find a wound, a change in colour, or pain in your foot.',
  'Sepatu pintar untuk pemantauan kaki diabetes': 'A smart shoe for diabetic foot monitoring',

  // ---------------------------------------------------------------- export report
  'Glykos — Laporan Monitoring Kaki Diabetes': 'Glykos — Diabetic Foot Monitoring Report',
  Diekspor: 'Exported',
  Perangkat: 'Device',
  'Parameter Saat Ini': 'Current Parameters',
  'Tekanan Puncak (kPa)': 'Peak Pressure (kPa)',
  'Lokasi Tekanan': 'Pressure Location',
  'Suhu Tertinggi (°C)': 'Highest Temperature (°C)',
  'Lokasi Suhu': 'Temperature Location',
  'Waktu Pemakaian (menit)': 'Wear Time (minutes)',
  Histori: 'History',
  'Selisih Suhu (°C)': 'Temperature Spread (°C)',
  'Glykos — Laporan Monitoring': 'Glykos — Monitoring Report',
  'Laporan Glykos': 'Glykos Report',
  'Suhu Tertinggi': 'Highest Temperature',
}
