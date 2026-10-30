import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    const name = localStorage.getItem('name')
    const profile_photo = localStorage.getItem('profile_photo') || ''
    if (token && role) {
      setUser({ token, role, name, profile_photo })
    }
    setLoading(false)
  }, [])

  const login = (token, role, name, profile_photo) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('name', name)
    if (profile_photo !== undefined) {
      localStorage.setItem('profile_photo', profile_photo || '')
    }
    const currentPhoto = profile_photo !== undefined ? profile_photo : (localStorage.getItem('profile_photo') || '')
    setUser({ token, role, name, profile_photo: currentPhoto })
  }

  const updateUserPhoto = (photoUrl) => {
    localStorage.setItem('profile_photo', photoUrl || '')
    setUser(prev => prev ? { ...prev, profile_photo: photoUrl } : prev)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, updateUserPhoto, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
