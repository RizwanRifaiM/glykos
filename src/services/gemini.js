// Memanggil Gemini langsung dari browser (tanpa backend proxy).
// Catatan: VITE_GEMINI_API_KEY ikut ter-bundle ke sisi klien, jadi key ini
// bersifat publik. Gunakan hanya key free-tier (tanpa billing) dan disarankan
// membatasi key dengan HTTP referrer restriction di Google Cloud Console.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const SYSTEM_INSTRUCTION =
  'Anda adalah asisten untuk proyek sol sepatu pintar diabetes Glykos. Jawablah hanya pertanyaan yang berkaitan dengan proyek ini, kesehatan kaki penderita diabetes, sensor sepatu pintar, serta pemantauan tekanan, suhu, dan kelembapan. Gunakan bahasa Indonesia dalam semua jawaban. Jangan menjawab pertanyaan di luar cakupan tersebut.'

export async function sendGeminiMessage(prompt) {
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
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
