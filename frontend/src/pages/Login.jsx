import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [pendingNotice, setPendingNotice] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setPendingNotice(null)
    try {
      const res = await api.post('/auth/login', form)
      login(res.data.token, res.data.role, res.data.name)
      toast.success(`स्वागत है, ${res.data.name}! 🎉`)
      navigate(res.data.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'लॉगिन विफल रहा।'
      if (errorMsg.includes('pending') || errorMsg.includes('approval')) {
        setPendingNotice(errorMsg)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 text-2xl mb-2">
            💰
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mera Kameti</h1>
          <p className="text-xs text-slate-500">अपने अकाउंट में लॉगिन करें</p>
        </div>

        {/* Pending Approval Notice */}
        {pendingNotice && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1 animate-in fade-in">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <span>⏳</span> अकाउंट अप्रूवल पेंडिंग है
            </div>
            <p>{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">📱 मोबाइल नंबर (Phone Number)</label>
            <input
              type="tel"
              className="input font-mono"
              placeholder="e.g. 9876543210 या 0000000000"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">🔒 पासवर्ड (Password)</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-emerald-600/25 mt-2"
          >
            {loading ? '⏳ लॉगिन हो रहा है...' : '🚀 लॉगिन करें'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            कमेटी में नए हैं?{' '}
            <Link to="/register" className="text-emerald-700 font-bold hover:underline">
              नया सदस्य अकाउंट बनाएँ →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
