import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = {
    user,
    loading,
    login(email, password) {
      return signInWithEmailAndPassword(auth, email, password)
    },
    async register(name, email, password) {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (name) {
        await updateProfile(credential.user, { displayName: name })
      }
      return credential
    },
    loginWithGoogle() {
      return signInWithPopup(auth, new GoogleAuthProvider())
    },
    logout() {
      return signOut(auth)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
