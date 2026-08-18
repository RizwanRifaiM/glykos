import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { sendGeminiMessage } from '../services/gemini'
import { buildSensorContext } from '../utils/sensorContext'
import { IconSend, IconSparkles, IconMessageCircle } from '../components/icons'

const INITIAL_CHAT = [
  {
    role: 'assistant',
    content:
      'Halo! Saya asisten Glykos. Saya bisa membaca angka insole Anda — tanyakan kondisi kaki Anda hari ini, arti tekanan/suhu/kelembapan yang terbaca, atau perawatan kaki diabetes pada umumnya.',
  },
]

// Dua pertanyaan pertama sengaja mengarah ke DATA pengguna sendiri: itu yang
// membedakan asisten ini dari mesin pencari, dan sebelumnya tidak mungkin
// dijawab karena halaman ini tidak pernah membaca data apa pun.
const QUICK_QUESTIONS = [
  'Bagaimana kondisi kaki saya hari ini?',
  'Apa yang perlu saya perhatikan dari data minggu ini?',
  'Kenapa suhu kulit dipantau?',
  'Mengapa kelembapan dalam sepatu berbahaya?',
]

function timeLabel() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatbotPage() {
  const { data, history, fatigue, temperatureTrend, isLive, demoMode } = useOutletContext()

  // Ringkasan dibangun ulang tiap kali datanya berubah, bukan sekali di awal:
  // percakapan bisa berlangsung sementara pembacaan terus masuk, dan jawaban
  // harus mengacu ke angka yang sedang dilihat pengguna.
  //
  // Isinya angka sensor agregat saja — batas privasinya dijelaskan di
  // utils/sensorContext.js.
  const sensorContext = useMemo(
    () => buildSensorContext({ data, history, trend: temperatureTrend, fatigue, isLive, demoMode }),
    [data, history, temperatureTrend, fatigue, isLive, demoMode],
  )

  const [chat, setChat] = useState(() =>
    INITIAL_CHAT.map((m) => ({ ...m, time: timeLabel() })),
  )
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat, isSending])

  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  async function submitMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    setChat((prev) => [...prev, { role: 'user', content: trimmed, time: timeLabel() }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsSending(true)
    setError('')

    try {
      // `chat` di sini masih berisi percakapan SEBELUM pesan ini — persis
      // riwayat yang dibutuhkan model untuk menjawab pertanyaan susulan.
      const reply = await sendGeminiMessage(trimmed, chat, sensorContext)
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: reply, time: timeLabel() },
      ])
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengirim pesan.')
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitMessage(input)
    }
  }

  return (
    <div className="chatbot-page">
      <section className="panel chatbot-shell">
        <header className="chatbot-header">
          <span className="chatbot-header__avatar" aria-hidden="true">
            <IconMessageCircle size={22} />
          </span>
          <div className="chatbot-header__meta">
            <h2 className="chatbot-header__name">Asisten Glykos</h2>
            <span className="chatbot-header__status">
              <span className="chatbot-header__dot" />
              Ditenagai AI · Online
            </span>
          </div>
          <span className="chatbot-header__badge">
            <IconSparkles size={14} />
            AI
          </span>
        </header>

        <div className="chatbot-thread" ref={scrollRef}>
          {chat.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-bubble chat-bubble--${message.role}`}
            >
              {message.role === 'assistant' && (
                <span className="chat-bubble__avatar" aria-hidden="true">
                  <IconMessageCircle size={16} />
                </span>
              )}
              <div className="chat-bubble__body">
                <p className="chat-bubble__text">{message.content}</p>
                {message.time && <span className="chat-bubble__time">{message.time}</span>}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="chat-bubble chat-bubble--assistant">
              <span className="chat-bubble__avatar" aria-hidden="true">
                <IconMessageCircle size={16} />
              </span>
              <div className="chat-bubble__body chat-bubble__body--typing">
                <span className="chat-typing" aria-label="Asisten sedang mengetik">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
        </div>

        {chat.length <= 1 && (
          <div className="chatbot-suggestions">
            <span className="chatbot-suggestions__label">Pertanyaan cepat</span>
            <div className="chatbot-suggestions__chips">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="chatbot-chip"
                  onClick={() => submitMessage(question)}
                  disabled={isSending}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="chatbot-error" role="alert">
            {error}
          </p>
        )}

        <form
          className="chatbot-composer"
          onSubmit={(event) => {
            event.preventDefault()
            submitMessage(input)
          }}
        >
          <textarea
            ref={textareaRef}
            className="chatbot-composer__input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              autoGrow(event.target)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pertanyaan Anda…"
            rows={1}
            disabled={isSending}
          />
          <button
            type="submit"
            className="chatbot-composer__send"
            disabled={!input.trim() || isSending}
            aria-label="Kirim pesan"
          >
            <IconSend size={18} />
          </button>
        </form>
        {/* Dinyatakan terbuka: pengguna berhak tahu bahwa angka insole-nya
            ikut dikirim ke layanan AI, dan apa saja yang TIDAK ikut. */}
        <p className="chatbot-disclaimer">
          Jawaban memakai pembacaan sensor insole Anda (tekanan, suhu, kelembapan, langkah). Data
          profil seperti nama, HbA1c, dan riwayat luka tidak dikirim. Informasi bersifat edukatif
          dan bukan pengganti diagnosis dokter.
        </p>
      </section>
    </div>
  )
}
