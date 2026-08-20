// Warna dikunci ke palet brand (index.css :root --glykos-*) atas permintaan
// eksplisit — CVD-separation & normal-vision-floor tetap lolos untuk trio ini
// (divalidasi), tapi chroma/lightness-band & kontras-vs-putih di bawah target
// karena brand ini memang pastel/muted by design. Mitigasinya: tiap kartu
// selalu punya label + unit langsung (bukan cuma warna) sebagai pembeda.
//
// `temperatureDelta` ditambahkan belakangan dan memakai --status-warning
// (#9C6510) — satu-satunya warna di palet yang cukup jauh dari trio di atas
// (amber vs maroon vs hijau vs koral) tanpa keluar dari brand. Perlakuannya
// sama: label + unit selalu menyertai warnanya.
//
// `label` berupa deskriptor `msg` yang diselesaikan pemanggil dengan
// i18n._(config.label) — lihat catatan di constants/thresholds.js. `unit` tidak
// diterjemahkan: kPa, °C, dan % adalah simbol SI yang sama di kedua bahasa, dan
// menerjemahkannya justru membuka peluang salah tulis pada satuan yang jadi
// dasar pembacaan.
import { msg } from '@lingui/core/macro'

export const HISTORY_METRICS_CONFIG = {
  pressure: { label: msg`Tekanan`, unit: 'kPa', color: '#6E1936', max: 300 },
  temperature: { label: msg`Suhu Kulit`, unit: '°C', color: '#446A45', max: 38 },
  temperatureDelta: { label: msg`Selisih Suhu`, unit: '°C', color: '#9C6510', max: 6 },
  humidity: { label: msg`Kelembapan`, unit: '%', color: '#ff7373', max: 100 },
}
