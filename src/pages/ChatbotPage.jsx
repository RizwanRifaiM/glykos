import { useEffect, useRef, useState } from 'react'
import { sendGeminiMessage } from '../services/gemini'
import { IconSend, IconSparkles, IconMessageCircle } from '../components/icons'

const INITIAL_CHAT = [
  {
    role: 'assistant',
    content:
      'Halo! Saya asisten Glykos. Tanyakan apa saja seputar perawatan kaki diabetes, cara kerja insole pintar, atau makna data tekanan, suhu, dan kelembapan Anda. Pilih salah satu pertanyaan cepat di bawah untuk memulai.',
  },
]

const QUICK_QUESTIONS = [
  'Apa saja yang bisa dilakukan alat ini?',
  'Apa hubungan tekanan dengan diabetes?',
  'Kenapa suhu kulit dipantau?',
  'Mengapa kelembapan dalam sepatu berbahaya?',
]

function timeLabel() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatbotPage() {
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
      const reply = await sendGeminiMessage(trimmed)
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
        <p className="chatbot-disclaimer">
          Informasi bersifat edukatif dan bukan pengganti diagnosis dokter.
        </p>
      </section>
    </div>
  )
}
