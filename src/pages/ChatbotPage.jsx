import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { msg, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { sendGeminiMessage } from '../services/gemini'
import { buildSensorContext } from '../utils/sensorContext'
import { formatTimeOfDay } from '../utils/locale'
import { IconSend, IconSparkles, IconMessageCircle } from '../components/icons'

// Sapaan pembuka disimpan sebagai PENANDA (`kind: 'greeting'`), bukan sebagai
// teks di dalam state.
//
// Bedanya penting: teks ini statis dan milik antarmuka, jadi harus ikut
// berganti saat pengguna mengganti bahasa. Jawaban model TIDAK — itu kalimat
// yang benar-benar pernah diucapkan dalam percakapan, dan menerjemahkannya
// belakangan tidak mungkin dilakukan tanpa memanggil model lagi. Karena itu
// hanya sapaan yang diselesaikan saat render, sementara isi percakapan lain
// tetap apa adanya.
const GREETING = msg`Halo! Saya asisten Glykos. Saya bisa membaca angka sensor sepatu Anda — tanyakan kondisi kaki Anda hari ini, arti tekanan/suhu/kelembapan yang terbaca, atau perawatan kaki diabetes pada umumnya.`

// Dua pertanyaan pertama sengaja mengarah ke DATA pengguna sendiri: itu yang
// membedakan asisten ini dari mesin pencari, dan sebelumnya tidak mungkin
// dijawab karena halaman ini tidak pernah membaca data apa pun.
const QUICK_QUESTIONS = [
  msg`Bagaimana kondisi kaki saya hari ini?`,
  msg`Apa yang perlu saya perhatikan dari data minggu ini?`,
  msg`Kenapa suhu kulit dipantau?`,
  msg`Mengapa kelembapan dalam sepatu berbahaya?`,
]

const FALLBACK_ERROR = msg`Terjadi kesalahan saat mengirim pesan.`

export default function ChatbotPage() {
  const { data, history, fatigue, temperatureTrend, isLive, demoMode } = useOutletContext()
  const { i18n } = useLingui()

  // Ringkasan dibangun ulang tiap kali datanya berubah, bukan sekali di awal:
  // percakapan bisa berlangsung sementara pembacaan terus masuk, dan jawaban
  // harus mengacu ke angka yang sedang dilihat pengguna.
  //
  // Isinya angka sensor agregat saja — batas privasinya dijelaskan di
  // utils/sensorContext.js. `i18n.locale` ikut jadi dependensi karena
  // ringkasannya dikirim dalam bahasa antarmuka: model menjawab dalam bahasa
  // instruksinya, dan konteks berbahasa lain memaksanya menerjemahkan istilah
  // klinis sambil menyimpulkan.
  const sensorContext = useMemo(
    () =>
      buildSensorContext(i18n, {
        data,
        history,
        trend: temperatureTrend,
        fatigue,
        isLive,
        demoMode,
      }),
    // `i18n.locale` WAJIB ada di sini meski react-hooks menyebutnya berlebihan
    // karena `i18n` sudah terdaftar. Aturan itu berasumsi anggota objek berubah
    // bersama objeknya — dan asumsi itu tidak berlaku untuk Lingui: instance
    // i18n-nya SATU dan dimutasi di tempat saat bahasa berganti, jadi
    // identitasnya tidak pernah berubah. Menuruti saran linter di sini membuat
    // ringkasan sensor terkunci di bahasa saat pertama dihitung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n, i18n.locale, data, history, temperatureTrend, fatigue, isLive, demoMode],
  )

  // `at` menyimpan WAKTU, bukan teks jam. Formatnya dirakit saat render supaya
  // ikut bahasa aktif — jam 14.30 (id) vs 2:30 PM (en).
  const [chat, setChat] = useState(() => [{ role: 'assistant', kind: 'greeting', at: Date.now() }])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

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

  // Isi satu gelembung: sapaan diselesaikan dari deskriptor, sisanya teks apa
  // adanya.
  function bubbleText(message) {
    return message.kind === 'greeting' ? i18n._(GREETING) : message.content
  }

  async function submitMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    // Riwayat yang dikirim ke model memakai teks yang SEDANG tampil, termasuk
    // sapaan dalam bahasa aktif — supaya percakapan yang dilihat pengguna dan
    // yang dibaca model tidak berbeda.
    const historyForModel = chat.map((message) => ({
      role: message.role,
      content: bubbleText(message),
    }))

    setChat((prev) => [...prev, { role: 'user', content: trimmed, at: Date.now() }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsSending(true)
    setError(null)

    try {
      const reply = await sendGeminiMessage(i18n, trimmed, historyForModel, sensorContext)
      setChat((prev) => [...prev, { role: 'assistant', content: reply, at: Date.now() }])
    } catch (err) {
      // Pesan galat dari services/gemini.js sudah diterjemahkan di sana;
      // cadangannya disimpan sebagai deskriptor supaya ikut berganti bahasa
      // kalau masih tampil saat pengguna beralih.
      setError(err.message ? { text: err.message } : { descriptor: FALLBACK_ERROR })
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

  const errorText = error?.descriptor ? i18n._(error.descriptor) : (error?.text ?? null)

  return (
    <div className="chatbot-page">
      <section className="panel chatbot-shell">
        <header className="chatbot-header">
          <span className="chatbot-header__avatar" aria-hidden="true">
            <IconMessageCircle size={22} />
          </span>
          <div className="chatbot-header__meta">
            <h2 className="chatbot-header__name">
              <Trans>Asisten Glykos</Trans>
            </h2>
            <span className="chatbot-header__status">
              <span className="chatbot-header__dot" />
              <Trans>Ditenagai AI · Online</Trans>
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
                <p className="chat-bubble__text">{bubbleText(message)}</p>
                {message.at && (
                  <span className="chat-bubble__time">{formatTimeOfDay(message.at)}</span>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="chat-bubble chat-bubble--assistant">
              <span className="chat-bubble__avatar" aria-hidden="true">
                <IconMessageCircle size={16} />
              </span>
              <div className="chat-bubble__body chat-bubble__body--typing">
                <span className="chat-typing" aria-label={t(i18n)`Asisten sedang mengetik`}>
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
            <span className="chatbot-suggestions__label">
              <Trans>Pertanyaan cepat</Trans>
            </span>
            <div className="chatbot-suggestions__chips">
              {QUICK_QUESTIONS.map((question, index) => {
                const text = i18n._(question)
                return (
                  <button
                    key={index}
                    type="button"
                    className="chatbot-chip"
                    onClick={() => submitMessage(text)}
                    disabled={isSending}
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {errorText && (
          <p className="chatbot-error" role="alert">
            {errorText}
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
            placeholder={t(i18n)`Tulis pertanyaan Anda…`}
            rows={1}
            disabled={isSending}
          />
          <button
            type="submit"
            className="chatbot-composer__send"
            disabled={!input.trim() || isSending}
            aria-label={t(i18n)`Kirim pesan`}
          >
            <IconSend size={18} />
          </button>
        </form>
        {/* Dinyatakan terbuka: pengguna berhak tahu bahwa angka sensornya ikut
            dikirim ke layanan AI, dan apa saja yang TIDAK ikut. */}
        <p className="chatbot-disclaimer">
          <Trans>
            Jawaban memakai pembacaan sensor sepatu Anda (tekanan, suhu, kelembapan, langkah). Data
            profil seperti nama, HbA1c, dan riwayat luka tidak dikirim. Informasi bersifat edukatif
            dan bukan pengganti diagnosis dokter.
          </Trans>
        </p>
      </section>
    </div>
  )
}
