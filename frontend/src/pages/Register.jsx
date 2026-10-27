import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords match nahi kar rahe!')
    }
    if (form.password.length < 6) {
      return toast.error('Password kam se kam 6 characters ka hona chahiye.')
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password
      })
      login(res.data.token, res.data.role, res.data.name)
      toast.success(`Welcome ${res.data.name}! Aapka account ban gaya! 🎉`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration fail ho gaya.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">💰</div>
          <h1 className="text-2xl font-bold text-primary-700">Mera Kameti</h1>
          <p className="text-gray-500 mt-1">Naya account banayein</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">👤 Pura Naam</label>
            <input type="text" className="input" placeholder="Muhammad Ali" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📱 Phone Number</label>
            <input type="tel" className="input" placeholder="03001234567" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📧 Email (optional)</label>
            <input type="email" className="input" placeholder="ali@email.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🔒 Password</label>
            <input type="password" className="input" placeholder="••••••••" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🔒 Password Confirm</label>
            <input type="password" className="input" placeholder="••••••••" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? '⏳ Account ban raha hai...' : '✅ Register karein'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Pehle se account hai?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">Login karein</Link>
        </p>
      </div>
    </div>
  )
}
