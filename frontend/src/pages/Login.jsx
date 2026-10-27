import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.token, res.data.role, res.data.name)
      toast.success(`Welcome back, ${res.data.name}! 🎉`)
      navigate(res.data.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login fail ho gaya.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">💰</div>
          <h1 className="text-3xl font-bold text-primary-700">Mera Kameti</h1>
          <p className="text-gray-500 mt-1">Apne account mein login karein</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📱 Phone Number</label>
            <input
              type="tel"
              className="input"
              placeholder="0300-1234567"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🔒 Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? '⏳ Login ho raha hai...' : '🚀 Login karein'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Account nahi hai?{' '}
          <Link to="/register" className="text-primary-600 font-semibold hover:underline">
            Register karein
          </Link>
        </p>
      </div>
    </div>
  )
}
