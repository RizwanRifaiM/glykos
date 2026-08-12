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

const SYSTEM_INSTRUCTION =
  'Anda adalah asisten untuk proyek sol sepatu pintar diabetes Glykos. Jawablah hanya pertanyaan yang berkaitan dengan proyek ini, kesehatan kaki penderita diabetes, sensor sepatu pintar, serta pemantauan tekanan, suhu, dan kelembapan. Gunakan bahasa Indonesia dalam semua jawaban. Jangan menjawab pertanyaan di luar cakupan tersebut.'

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

export async function sendGeminiMessage(prompt, history = []) {
  if (!API_KEY) {
    throw new Error('Konfigurasi AI belum lengkap. VITE_GEMINI_API_KEY belum diatur.')
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: buildContents(history, prompt),
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => null)
    const status = errBody?.error?.status
    if (status === 'RESOURCE_EXHAUSTED') {
      throw new Error('Kuota AI sedang penuh. Silakan coba lagi beberapa saat.')
    }
    if (status === 'UNAVAILABLE') {
      throw new Error('Model AI sedang sibuk. Silakan coba lagi sebentar.')
    }
    throw new Error(errBody?.error?.message || `Permintaan gagal (status ${response.status}).`)
  }

  const data = await response.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') ?? ''
  return text || 'Maaf, tidak ada jawaban yang bisa ditampilkan saat ini.'
}
