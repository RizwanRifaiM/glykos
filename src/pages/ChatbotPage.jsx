import { useState } from 'react'
import Button from '../components/Button'
import { sendGeminiMessage } from '../services/gemini'

const INITIAL_CHAT = [
  {
    role: 'assistant',
    content:
      'Halo! Saya asisten Glykos. Pilih pertanyaan di atas untuk jawaban cepat, atau tulis pesan sendiri untuk menggunakan AI.',
  },
]

const FAQS = [
  {
    question: 'Apa saja yang bisa dilakukan alat ini?',
    answer:
      'Alat ini memantau kaki penderita diabetes dengan sensor tekanan, suhu, dan kelembapan. Data dikirim ke dashboard untuk membantu mendeteksi risiko ulkus dini.',
  },
  {
    question: 'Apa hubungan tekanan dengan diabetes?',
    answer:
      'Tekanan tinggi pada titik tertentu dapat menyebabkan kulit pecah dan ulkus diabetik. Memantau tekanan membantu mengurangi risiko cidera pada kaki diabetes.',
  },
  {
    question: 'Kenapa suhu kulit dipantau?',
    answer:
      'Suhu kulit yang meningkat bisa menjadi tanda awal inflamasi atau infeksi. Pemantauan suhu memberi peringatan dini sebelum luka terlihat.',
  },
  {
    question: 'Mengapa kelembapan dalam sepatu berbahaya?',
    answer:
      'Kelembapan tinggi menciptakan lingkungan lembab untuk jamur dan bakteri, meningkatkan risiko infeksi dan iritasi pada kaki diabetes.',
  },
]

export default function ChatbotPage() {
  const [chat, setChat] = useState(INITIAL_CHAT)
  const [selectedFaq, setSelectedFaq] = useState(FAQS[0])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  function handleFaqClick(item) {
    setSelectedFaq(item)
  }

  async function handleSend() {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input.trim() }
    setChat((prev) => [...prev, userMessage])
    setInput('')
    setIsSending(true)
    setError('')

    try {
      const reply = await sendGeminiMessage(input.trim())
      setChat((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengirim pesan.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="chatbot-page">
      <section className="panel chatbot-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Chatbot Glykos</h2>
            <p className="panel__subtitle">
              Pilih pertanyaan dari tombol di bawah untuk jawaban statis, atau gunakan AI untuk pertanyaan lain.
            </p>
          </div>
        </div>

        <div className="chatbot-faq">
          <h3>Pertanyaan yang sering ditanyakan</h3>
          <div className="chatbot-faq__buttons">
            {FAQS.map((item) => (
              <Button
                key={item.question}
                variant={selectedFaq.question === item.question ? 'secondary' : 'outline'}
                onClick={() => handleFaqClick(item)}
              >
                {item.question}
              </Button>
            ))}
          </div>

          <div className="chatbot-faq__answer">
            <h4>{selectedFaq.question}</h4>
            <p>{selectedFaq.answer}</p>
          </div>
        </div>

        <div className="chatbot-room">
          <div className="chatbot-room__messages">
            {chat.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chatbot-message chatbot-message--${message.role}`}
              >
                <span className="chatbot-message__role">
                  {message.role === 'user' ? 'Anda' : 'Glykos'}
                </span>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          <div className="chatbot-room__composer">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tulis pesan Anda..."
              rows={3}
              disabled={isSending}
            />
            <div className="chatbot-room__actions">
              <Button variant="outline" onClick={handleSend} disabled={!input.trim() || isSending}>
                Kirim
              </Button>
              <Button variant="secondary" onClick={() => setInput('')}>
                Hapus
              </Button>
            </div>
            {error && <p className="chatbot-room__error">{error}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
