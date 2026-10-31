import { useState, useEffect } from 'react'
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

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotForm, setForgotForm] = useState({
    phone: '',
    name: '',
    hint: '',
    new_password: '',
    confirm_password: ''
  })
  const [forgotLoading, setForgotLoading] = useState(false)
  const [isAdminReset, setIsAdminReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setPendingNotice(null)
    try {
      const cleanForm = {
        phone: form.phone.trim(),
        password: form.password.trim()
      }
      const res = await api.post('/auth/login', cleanForm)
      login(res.data.token, res.data.role, res.data.name, res.data.profile_photo)
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

  const isAdmin = forgotForm.phone.trim() === '8434776690' || isAdminReset

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotForm.phone || !forgotForm.phone.trim()) {
      return toast.error('मोबाइल नंबर दर्ज करना अनिवार्य है।')
    }

    if (!isAdmin && (!forgotForm.name || !forgotForm.name.trim())) {
      return toast.error('रजिस्टर्ड नाम दर्ज करना अनिवार्य है।')
    }

    if (isAdmin && (!forgotForm.hint || !forgotForm.hint.trim())) {
      return toast.error('एडमिन सुरक्षा हिंट (Security Hint) दर्ज करना अनिवार्य है!')
    }

    if (!forgotForm.new_password || forgotForm.new_password.length < 6) {
      return toast.error('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')
    }
    if (forgotForm.new_password !== forgotForm.confirm_password) {
      return toast.error('नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं हो रहे हैं!')
    }

    setForgotLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', {
        phone: forgotForm.phone.trim(),
        name: isAdmin ? (forgotForm.name?.trim() || 'MD NEJAM ANSARI') : forgotForm.name?.trim(),
        hint: isAdmin && forgotForm.hint ? forgotForm.hint.trim() : undefined,
        new_password: forgotForm.new_password.trim()
      })
      toast.success(res.data.message || 'पासवर्ड बदल गया! अब नए पासवर्ड से लॉगिन करें। ✅')
      setForm(prev => ({ ...prev, phone: forgotForm.phone, password: '' }))
      setShowForgotModal(false)
      setForgotForm({ phone: '', name: '', hint: '', new_password: '', confirm_password: '' })
      setIsAdminReset(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'पासवर्ड रीसेट नहीं हो पाया।')
    } finally {
      setForgotLoading(false)
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">🔒 पासवर्ड (Password)</label>
              <button
                type="button"
                onClick={() => {
                  setForgotForm(prev => ({ ...prev, phone: form.phone }))
                  setShowForgotModal(true)
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                पासवर्ड भूल गए?
              </button>
            </div>
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                  isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isAdmin ? '👑 ADMIN PASSWORD RESET' : 'MEMBER PASSWORD RESET'}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  पासवर्ड भूल गए? (Reset Password)
                </h2>
                <p className="text-xs text-slate-500">
                  {isAdmin 
                    ? 'एडमिन पासवर्ड बदलने के लिए मोबाइल नंबर, सुरक्षा हिंट व नया पासवर्ड दर्ज करें'
                    : 'अपना रजिस्टर्ड मोबाइल नंबर व नाम दर्ज करके नया पासवर्ड बनाएं'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false)
                  setIsAdminReset(false)
                  setForgotForm({ phone: '', name: '', hint: '', new_password: '', confirm_password: '' })
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              {/* 1. Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  📱 रजिस्टर्ड मोबाइल नंबर *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210 या 8434776690"
                  className="input font-mono text-sm"
                  value={forgotForm.phone}
                  onChange={e => {
                    const val = e.target.value
                    setForgotForm({ ...forgotForm, phone: val })
                    if (val.trim() === '8434776690') {
                      setIsAdminReset(true)
                    } else if (isAdminReset && val.trim() !== '8434776690') {
                      setIsAdminReset(false)
                    }
                  }}
                />
              </div>

              {/* 2. Member Name (Only for normal members) */}
              {!isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    👤 रजिस्टर्ड नाम (Member Full Name) *
                  </label>
                  <input
                    type="text"
                    required={!isAdmin}
                    placeholder="आपका रजिस्टर्ड नाम..."
                    className="input text-sm"
                    value={forgotForm.name}
                    onChange={e => setForgotForm({ ...forgotForm, name: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    सुरक्षा के लिए आपका नाम रजिस्टर्ड रिकॉर्ड से मिलना ज़रूरी है।
                  </p>
                </div>
              )}

              {/* 3. Admin Security Hint (Only for Admin - Set in Profile) */}
              {isAdmin && (
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl space-y-2 animate-fadeIn shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase">
                      <span>🛡️</span> एडमिन सुरक्षा हिंट (Security Hint) *
                    </label>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-400">
                      प्रोफाइल सीक्रेट कोड
                    </span>
                  </div>
                  <input
                    type="text"
                    required={isAdmin}
                    placeholder="प्रोफाइल में सेट किया गया गुप्त हिंट दर्ज करें..."
                    className="input font-semibold bg-white border-amber-300 focus:border-amber-500 py-2.5 text-slate-900 text-sm shadow-inner"
                    value={forgotForm.hint}
                    onChange={e => setForgotForm({ ...forgotForm, hint: e.target.value })}
                  />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    💡 एडमिन सुरक्षा हेतु अपनी प्रोफाइल में सेव किया गया सीक्रेट हिंट दर्ज करें (शुरुआती डिफ़ॉल्ट हिंट: <strong>Ansari</strong>)।
                  </p>
                </div>
              )}

              {/* 4. New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🔑 नया पासवर्ड (New Password) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="कम से कम 6 अक्षर..."
                  className="input text-sm"
                  value={forgotForm.new_password}
                  onChange={e => setForgotForm({ ...forgotForm, new_password: e.target.value })}
                />
              </div>

              {/* 5. Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🔒 नया पासवर्ड दोबारा लिखें (Confirm Password) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="वही पासवर्ड दोबारा लिखें..."
                  className="input text-sm"
                  value={forgotForm.confirm_password}
                  onChange={e => setForgotForm({ ...forgotForm, confirm_password: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={`w-full py-3 text-sm font-bold shadow-md rounded-xl text-white transition-all ${
                    isAdmin 
                      ? 'bg-amber-600 hover:bg-amber-700 active:scale-[0.98]' 
                      : 'btn-primary'
                  }`}
                >
                  {forgotLoading 
                    ? '⏳ पासवर्ड बदल रहे हैं...' 
                    : isAdmin 
                      ? '👑 एडमिन पासवर्ड रीसेट करें' 
                      : '✅ पासवर्ड रीसेट करें'}
                </button>

                {/* WhatsApp Help Option */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Admin Sahab, Mera Kameti me mera password reset kar dijiye. Mera Registered Mobile: ${forgotForm.phone || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>💬</span> एडमिन से व्हाट्सएप पर रीसेट करवाएं
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
