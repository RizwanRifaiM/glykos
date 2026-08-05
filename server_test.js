import http from 'http'

const data = JSON.stringify({ prompt: 'Jelaskan AI dalam satu kalimat' })

const options = {
  hostname: '127.0.0.1',
  port: 4000,
  path: '/api/chatbot',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = http.request(options, (res) => {
  let body = ''
  res.setEncoding('utf8')
  res.on('data', (chunk) => {
    body += chunk
  })
  res.on('end', () => {
    console.log('STATUS', res.statusCode)
    console.log(body)
  })
})

req.on('error', (err) => {
  console.error('ERR', err.message)
})

req.write(data)
req.end()
