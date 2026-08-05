export async function sendGeminiMessage(prompt) {
  const endpoint =
    import.meta.env.DEV && !import.meta.env.VITE_GEMINI_PROXY_URL
      ? 'http://localhost:4000/api/chatbot'
      : import.meta.env.VITE_GEMINI_PROXY_URL || '/api/chatbot'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.error || `Server request failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.text || ''
}
