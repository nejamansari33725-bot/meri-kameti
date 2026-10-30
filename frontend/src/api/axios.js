import axios from 'axios'

export const API_ORIGIN = (typeof window !== 'undefined' && window.location.hostname.includes('railway.app'))
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://merakameti.up.railway.app')

export const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
