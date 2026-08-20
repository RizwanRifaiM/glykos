import { msg } from '@lingui/core/macro'

// Pertanyaan dikelompokkan berdasarkan sumber masalah nyata di app ini
// (kontrak BLE, perilaku sinkronisasi Firestore, keterbatasan algoritma
// langkah/kelelahan yang didokumentasikan di hooks masing-masing) — bukan
// FAQ generik.
//
// Judul, pertanyaan, dan jawaban semuanya deskriptor `msg` yang diselesaikan
// FaqAccordion lewat i18n._(). Lihat alasannya di constants/thresholds.js.
//
// Beberapa jawaban menyebut "insole" untuk hal yang sebenarnya SEPATU utuh
// ("kalau insole di luar jangkauan", "baru pertama kali memakai insole").
// Diperbaiki di sini: perangkat Glykos adalah sepatu, dan "insole" dipakai
// hanya untuk komponen di dalamnya. Istilah yang bergeser di teks bantuan
// justru paling mahal — halaman inilah yang dibaca orang saat sedang bingung.
export const FAQ_GROUPS = [
  {
    title: msg`Koneksi & Perangkat`,
    items: [
      {
        question: msg`Tombol "Sambungkan" tidak menemukan perangkat saya`,
        answer: msg`Web Bluetooth hanya berjalan di Chrome atau Edge (desktop maupun Android) — Safari dan browser iOS tidak didukung. Halaman juga harus dibuka lewat HTTPS atau http://localhost, bukan file://. Pastikan Bluetooth di perangkat Anda aktif dan browser sudah diberi izin akses Bluetooth, lalu pilih perangkat bernama "glykos device" di jendela pemilih yang muncul.`,
      },
      {
        question: msg`Perangkat terputus sendiri saat dipakai`,
        answer: msg`Koneksi Bluetooth Low Energy bisa putus kalau sepatu di luar jangkauan (±10 m), baterai perangkat lemah, atau tab browser lama tidak aktif di latar belakang. Sambungkan kembali lewat tombol Bluetooth di bagian atas dashboard — data yang sempat tersimpan sebelum putus tidak hilang.`,
      },
      {
        question: msg`Indikator "Live" tidak menyala meski perangkat sudah tersambung`,
        answer: msg`Badge "Live" menyala saat ada paket data baru dari BLE. Jika belum menyala, cek status koneksi di pojok kanan atas dashboard — kemungkinan perangkat masih dalam proses pairing atau notifikasi karakteristik belum aktif. Coba putuskan lalu sambungkan ulang.`,
      },
      {
        question: msg`Sebagian angka (kelembapan, suhu udara, akselerasi) terus menampilkan 0`,
        answer: msg`Beberapa sensor pada firmware (RH, TA, serta AX/AY/AZ) hanya mengirim datanya kalau modul tersebut terdeteksi saat startup. Kalau salah satu sensor tidak terpasang atau gagal diinisialisasi, key-nya memang tidak dikirim dan web app menampilkannya sebagai 0 — ini bukan galat di aplikasi, melainkan kondisi perangkat keras.`,
      },
    ],
  },
  {
    title: msg`Data & Fitur`,
    items: [
      {
        question: msg`Grafik dan tabel di halaman Riwayat kosong`,
        answer: msg`Riwayat hanya terisi dari sesi yang benar-benar tersambung BLE — web app menulis data ke Firestore kira-kira tiap 1 menit selama perangkat aktif. Kalau baru pertama kali memakai sepatu Glykos atau sesi pemakaian sangat singkat, hari tersebut memang belum punya catatan.`,
      },
      {
        question: msg`Jumlah langkah terasa kurang akurat, terutama saat jalan cepat atau lari`,
        answer: msg`Jumlah langkah dihitung dari data akselerasi yang dikirim firmware sekitar 3 kali per detik. Untuk jalan santai angka ini cukup akurat, tapi pada cadence cepat beberapa langkah bisa tidak terhitung karena keterbatasan laju pengiriman data tersebut — bukan kesalahan pada algoritmanya.`,
      },
      {
        question: msg`Apakah status "Risiko Kelelahan" adalah diagnosis medis?`,
        answer: msg`Bukan. Indikator kelelahan adalah heuristik transparan yang menggabungkan durasi beban tekanan tinggi, pergeseran distribusi tekanan, kenaikan suhu, dan jumlah langkah dalam satu sesi pemakaian. Ini sinyal pendukung untuk mengingatkan Anda beristirahat, bukan pengukuran klinis kelelahan otot — tetap konsultasikan kondisi kaki Anda ke tenaga medis.`,
      },
      {
        question: msg`Chatbot tidak menjawab atau muncul pesan kuota penuh`,
        answer: msg`Chatbot memakai model AI gratis yang punya batas pemakaian harian; pesan "Kuota AI sedang penuh" atau "Model AI sedang sibuk" berarti perlu mencoba lagi beberapa saat kemudian. Chatbot ini juga sengaja dibatasi hanya menjawab topik seputar Glykos dan kesehatan kaki diabetes.`,
      },
      {
        question: msg`Notifikasi peringatan tidak pernah muncul`,
        answer: msg`Notifikasi perlu diaktifkan manual lewat tombol "Aktifkan Notifikasi" di halaman ini, dan browser Anda harus mendukung Notification API. Jika status menunjukkan "diblokir", izinnya harus diubah lewat pengaturan situs pada browser (ikon gembok di address bar), bukan dari dalam aplikasi.`,
      },
      {
        question: msg`Apakah data kaki saya aman dan siapa yang bisa melihatnya?`,
        answer: msg`Setiap pembacaan sensor dan profil kesehatan tersimpan di Firestore terikat ke akun Anda, dan seluruh halaman dashboard hanya bisa diakses setelah login. Jangan bagikan kredensial akun Anda ke orang lain untuk menjaga data tetap privat.`,
      },
    ],
  },
]
