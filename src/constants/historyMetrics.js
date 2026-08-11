// Warna dikunci ke palet brand (index.css :root --glykos-*) atas permintaan
// eksplisit — CVD-separation & normal-vision-floor tetap lolos untuk trio ini
// (divalidasi), tapi chroma/lightness-band & kontras-vs-putih di bawah target
// karena brand ini memang pastel/muted by design. Mitigasinya: tiap kartu
// selalu punya label + unit langsung (bukan cuma warna) sebagai pembeda.
export const HISTORY_METRICS_CONFIG = {
  pressure: { label: 'Tekanan', unit: 'kPa', color: '#6E1936', max: 300 },
  temperature: { label: 'Suhu Kulit', unit: '°C', color: '#446A45', max: 38 },
  humidity: { label: 'Kelembapan', unit: '%', color: '#81A283', max: 100 },
}
