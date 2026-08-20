import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    // TIDAK diterjemahkan, dan itu keputusan yang sadar: pesan ini hanya bisa
    // muncul kalau hook dipakai di luar AuthProvider — kesalahan pemasangan
    // kode yang ketahuan saat pengembangan, bukan keadaan yang bisa dialami
    // pengguna. Menerjemahkannya berarti menambah satu pesan ke katalog yang
    // harus dijaga penerjemah padahal tidak akan pernah mereka lihat.
    // eslint-disable-next-line lingui/no-unlocalized-strings
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
