// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAloD2bmDQEd-q_q6LcyNIhfCAw222WMU",
  authDomain: "glykos-id.firebaseapp.com",
  projectId: "glykos-id",
  storageBucket: "glykos-id.firebasestorage.app",
  messagingSenderId: "750603101041",
  appId: "1:750603101041:web:3bc446db30e1d1e3c28cd0",
  measurementId: "G-9NJCKGY6YG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
