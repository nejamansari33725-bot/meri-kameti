import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords मैच नहीं कर रहे हैं!')
    }
    if (form.password.length < 6) {
      return toast.error('Password कम से कम 6 अक्षरों का होना चाहिए।')
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password
      })

      setSuccessData({
        name: res.data.name || form.name,
        message: res.data.message
      })
      toast.success('रजिस्ट्रेशन सबमिट हो गया! ✅')
    } catch (err) {
      toast.error(err.response?.data?.error || 'रजिस्ट्रेशन फेल हो गया।')
    } finally {
      setLoading(false)
    }
  }

  // Registration Submitted Screen
  if (successData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-md text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner border border-emerald-100">
            ⏳
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              स्वागत है, {successData.name}!
            </h2>
            <div className="inline-block bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 mt-2">
              Admin अप्रूवल का इंतज़ार (Pending Approval)
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
            आपका अकाउंट सफलतापूर्वक बन गया है और Admin को अप्रूवल के लिए भेज दिया गया है। सुरक्षा कारणों से <strong>Admin के अप्रूव करने के बाद ही आप लॉगिन कर पाएँगे।</strong>
          </p>

          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3.5 text-sm"
          >
            लॉगिन पेज पर जाएँ →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 p-8 w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 text-2xl mb-2">
            💰
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mera Kameti</h1>
          <p className="text-xs text-slate-500">नया सदस्य अकाउंट बनाएँ</p>
        </div>

        {/* Notice about admin approval */}
        <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5">
          <span className="text-base">🛡️</span>
          <p className="leading-snug">
            <strong>सुरक्षा नियम:</strong> रजिस्ट्रेशन के बाद Admin आपके अकाउंट को चेक करके अप्रूव करेंगे, जिसके बाद आप लॉगिन कर सकेंगे।
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">👤 पूरा नाम (Full Name)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">📱 मोबाइल नंबर (Phone Number)</label>
            <input
              type="tel"
              className="input font-mono"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">📧 ईमेल आईडी (वैकल्पिक)</label>
            <input
              type="email"
              className="input"
              placeholder="e.g. name@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">🔒 पासवर्ड (कम से कम 6 अक्षर)</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">🔒 पासवर्ड कन्फर्म करें</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm mt-2 shadow-lg shadow-emerald-600/25"
          >
            {loading ? '⏳ रजिस्ट्रेशन हो रहा है...' : '✨ रजिस्ट्रेशन सबमिट करें'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 pt-1">
          पहले से अकाउंट है?{' '}
          <Link to="/login" className="text-emerald-700 font-bold hover:underline">
            लॉगिन करें
          </Link>
        </p>
      </div>
    </div>
  )
}
