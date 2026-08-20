// Menyiapkan i18n untuk pengujian.
//
// Macro `t`/`plural` di util murni memanggil instance i18n global. Tanpa locale
// yang aktif, panggilan itu mengeluarkan peringatan dan hasilnya bergantung
// pada keadaan modul — jadi diaktifkan di sini supaya setiap berkas uji berdiri
// pada keadaan yang sama.
//
// Katalog dibiarkan KOSONG dengan sengaja. Bahasa Indonesia adalah sourceLocale
// (lihat lingui.config.js), jadi pesan yang tidak ada di katalog jatuh ke teks
// aslinya — yang memang bahasa Indonesia. Dengan begitu pengujian menguji
// LOGIKANYA, bukan isi katalog yang akan terus berubah setiap kali ada teks
// baru ditambahkan.
import { i18n } from '@lingui/core'

i18n.loadAndActivate({ locale: 'id', messages: {} })
