import express from 'express'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000
const apiKey = process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey })

if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is missing in environment variables.')
}

app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.options('/api/chatbot', (req, res) => {
  res.sendStatus(204)
})

app.post('/api/chatbot', async (req, res) => {
  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt in request body.' })
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GEMINI_API_KEY.' })
  }

  try {
    const instruction = `Anda adalah asisten untuk proyek sol sepatu pintar diabetes Glykos. Jawablah hanya pertanyaan yang berkaitan dengan proyek ini, kesehatan kaki penderita diabetes, sensor sepatu pintar, serta pemantauan tekanan, suhu, dan kelembapan. Gunakan bahasa Indonesia dalam semua jawaban. Jangan menjawab pertanyaan di luar cakupan tersebut.`
    const interaction = await ai.interactions.create({
      model: 'gemini-3.6-flash',
      input: `${instruction}\n\nPengguna: ${prompt}`,
    })

    const text = interaction.output_text || ''
    return res.json({ text })
  } catch (error) {
    console.error('Gemini API error', error)
    return res.status(500).json({ error: error.message || 'Unexpected server error.' })
  }
})

app.listen(port, () => {
  console.log(`Gemini proxy server listening on http://localhost:${port}`)
})
