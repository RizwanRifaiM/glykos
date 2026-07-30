// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4C6vsNEmy2AbMSqAT7L6JYpbECks4apU",
  authDomain: "tugas-akhir-3e984.firebaseapp.com",
  databaseURL: "https://tugas-akhir-3e984-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tugas-akhir-3e984",
  storageBucket: "tugas-akhir-3e984.firebasestorage.app",
  messagingSenderId: "507490360946",
  appId: "1:507490360946:web:ff17ebaaf1d01468d9aceb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const rtdb = getDatabase(app)
export const db = getFirestore(app);