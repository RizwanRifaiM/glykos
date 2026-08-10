import fs from 'fs'
import path from 'path'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

function parseEnv(envText) {
  return envText
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split('=')
      acc[key.trim()] = rest.join('=').trim()
      return acc
    }, {})
}

const envPath = path.resolve(process.cwd(), '.env')
const envText = fs.readFileSync(envPath, 'utf-8')
const env = parseEnv(envText)

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
}

initializeApp(firebaseConfig)
const db = getFirestore()

console.warn('File scripts/seedFirestore.js sekarang hanya boilerplate dan tidak digunakan.')
