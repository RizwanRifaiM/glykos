import { t } from '@lingui/core/macro'

// Memanggil Gemini langsung dari browser (tanpa backend proxy).
//
// Catatan: VITE_GEMINI_API_KEY ikut ter-bundle ke sisi klien, jadi key ini
// bersifat publik — siapa pun bisa membacanya dari bundle. Gunakan HANYA key
// free-tier (tanpa billing) dan batasi key dengan HTTP referrer restriction di
// Google Cloud Console. Satu-satunya perbaikan tuntas adalah memindahkan
// panggilan ini ke backend (mis. Cloud Function) yang menyimpan key di sisi
// server; selama chatbot dipanggil langsung dari browser, batasan referrer
// adalah pengaman terbaik yang tersedia.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Berapa banyak pesan lampau yang ikut dikirim. Cukup untuk pertanyaan susulan
// ("kenapa begitu?", "berapa angka amannya?") tanpa membuat tiap permintaan
// membengkak — percakapan panjang akan memakan kuota free-tier dengan cepat.
const MAX_HISTORY_MESSAGES = 12

// Instruksi sistem ikut bahasa antarmuka.
//
// KENAPA INI PENTING, BUKAN SEKADAR KONSISTENSI
// Kalimat "Gunakan bahasa Indonesia dalam semua jawaban" dulu di-hardcode di
// sini. Akibatnya antarmuka bisa berbahasa Inggris sementara asistennya tetap
// menjawab dalam bahasa Indonesia — bagian aplikasi yang paling banyak
// menghasilkan teks justru satu-satunya yang tidak ikut berganti.
//
// Perintah bahasanya sendiri yang DITERJEMAHKAN: pada katalog Inggris kalimat
// ini menjadi "Answer in English." Jadi instruksinya selalu menyebut bahasa
// yang sedang aktif tanpa perlu logika pemetaan locale ke nama bahasa — dan
// menambah bahasa ketiga nanti tidak menuntut perubahan kode apa pun di sini.
function systemInstruction(i18n) {
  return t(i18n)`Anda adalah asisten untuk proyek sepatu pintar diabetes Glykos. Jawablah hanya pertanyaan yang berkaitan dengan proyek ini, kesehatan kaki penderita diabetes, sensor sepatu pintar, serta pemantauan tekanan, suhu, dan kelembapan. Gunakan bahasa Indonesia dalam semua jawaban. Jangan menjawab pertanyaan di luar cakupan tersebut.`
}

// Aturan tambahan yang HANYA berlaku saat data pengguna ikut dikirim.
//
// Dua kalimat terakhir adalah yang paling penting. Begitu model memegang angka
// sungguhan, godaan terbesarnya adalah mengisi yang kosong — menyebut nilai
// yang tidak ada di ringkasan, atau melangkah dari "tekanan Anda tinggi" ke
// kesimpulan klinis. Alat ini memantau; yang mendiagnosis tetap manusia.
function dataInstruction(i18n) {
  return [
    t(i18n)`Anda diberi ringkasan pembacaan sensor milik pengguna di bawah ini.`,
    t(i18n)`Pakai angka tersebut bila relevan: sebut nilainya, bandingkan dengan ambangnya, dan jelaskan artinya dengan bahasa sehari-hari.`,
    t(i18n)`JANGAN pernah menyebut angka pembacaan yang tidak ada dalam ringkasan ini. Kalau pengguna menanyakan sesuatu yang tidak tercakup, katakan terus terang bahwa datanya tidak tersedia.`,
    t(i18n)`JANGAN memberi diagnosis, vonis, atau instruksi pengobatan. Untuk pola yang menetap atau tanda luka, arahkan pengguna memeriksakan diri ke tenaga kesehatan.`,
  ].join(' ')
}

// Diekspor terpisah supaya bisa diuji tanpa memanggil jaringan.
export function buildSystemInstruction(i18n, context) {
  const trimmed = typeof context === 'string' ? context.trim() : ''
  const base = systemInstruction(i18n)
  if (!trimmed) return base
  return `${base}\n\n${dataInstruction(i18n)}\n\n${trimmed}`
}

// Menyusun `contents` multi-turn dari riwayat chat di UI.
//
// Sebelumnya hanya prompt terakhir yang dikirim, jadi meski tampilannya berupa
// percakapan, tiap pertanyaan dijawab tanpa mengetahui pertanyaan sebelumnya —
// "kenapa begitu?" tidak punya rujukan apa pun.
//
// Diekspor terpisah supaya bisa diuji tanpa memanggil jaringan.
export function buildContents(history, prompt) {
  const mapped = (history ?? [])
    .filter((message) => typeof message?.content === 'string' && message.content.trim())
    .map((message) => ({
      role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))

  const recent = mapped.slice(-MAX_HISTORY_MESSAGES)

  // Gemini mengharapkan giliran pertama berasal dari pengguna. Sapaan pembuka
  // asisten di UI adalah teks statis, bukan hasil model — buang giliran model
  // yang berada di depan supaya urutannya sah.
  let start = 0
  while (start < recent.length && recent[start].role === 'model') start += 1

  return [...recent.slice(start), { role: 'user', parts: [{ text: prompt }] }]
}

// `context` berisi ringkasan sensor pengguna (utils/sensorContext.js). Kosong
// atau tidak diisi = perilaku lama, yaitu menjawab tanpa data pengguna.
//
// `i18n` dioper dari ChatbotPage: ia menentukan bahasa instruksi sistem — dan
// karenanya bahasa jawaban model — serta bahasa pesan galat di bawah, yang
// semuanya tampil langsung di gelembung percakapan.
export async function sendGeminiMessage(i18n, prompt, history = [], context = '') {
  if (!API_KEY) {
    throw new Error(t(i18n)`Konfigurasi AI belum lengkap. VITE_GEMINI_API_KEY belum diatur.`)
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemInstruction(i18n, context) }] },
      contents: buildContents(history, prompt),
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => null)
    const status = errBody?.error?.status
    if (status === 'RESOURCE_EXHAUSTED') {
      throw new Error(t(i18n)`Kuota AI sedang penuh. Silakan coba lagi beberapa saat.`)
    }
    if (status === 'UNAVAILABLE') {
      throw new Error(t(i18n)`Model AI sedang sibuk. Silakan coba lagi sebentar.`)
    }
    // Dinamai dulu sebagai variabel: `${response.status}` di dalam pesan akan
    // ditolak rule lingui/no-expression-in-message, dan placeholder bernama
    // ({httpStatus}) lebih jelas bagi penerjemah daripada {0}.
    const httpStatus = response.status
    throw new Error(errBody?.error?.message || t(i18n)`Permintaan gagal (status ${httpStatus}).`)
  }

  const data = await response.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') ?? ''
  return text || t(i18n)`Maaf, tidak ada jawaban yang bisa ditampilkan saat ini.`
}
