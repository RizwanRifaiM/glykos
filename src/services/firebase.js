import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// App + Auth saja. Firestore sengaja TIDAK diinisialisasi di modul ini —
// lihat `firestore.js`.
//
// Alasannya soal ukuran bundle: AuthProvider dimuat sejak awal (halaman depan
// pun perlu tahu status login), jadi apa pun yang diimpor modul ini ikut masuk
// chunk utama. Selama `getFirestore` ada di sini, seluruh SDK Firestore
// (~250 kB) ikut terunduh oleh pengunjung yang cuma membuka landing page.
//
// `getAnalytics` dan `getDatabase` sempat diinisialisasi di sini padahal tidak
// pernah dipanggil dari mana pun — dua modul penuh tanpa satu pemakai.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
