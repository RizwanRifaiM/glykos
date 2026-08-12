// Instance Firestore, terpisah dari `firebase.js` supaya SDK Firestore hanya
// ikut terunduh pada rute yang benar-benar memakainya (dashboard), bukan pada
// halaman depan yang hanya butuh Auth. Lihat catatan di firebase.js.
import { getFirestore } from 'firebase/firestore'
import { app } from './firebase'

export const db = getFirestore(app)
