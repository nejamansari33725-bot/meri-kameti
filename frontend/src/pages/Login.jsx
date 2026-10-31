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
    otp: '',
    new_password: '',
    confirm_password: ''
  })
  const [forgotLoading, setForgotLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [isAdminReset, setIsAdminReset] = useState(false)
  const [receivedOtp, setReceivedOtp] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)

  useEffect(() => {
    let timer
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [otpCountdown])

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

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    if (!forgotForm.phone || !forgotForm.phone.trim()) {
      return toast.error('कृपया अपना 10-अंकों का मोबाइल नंबर दर्ज करें!')
    }
    setOtpSending(true)
    try {
      const res = await api.post('/auth/send-reset-otp', {
        phone: forgotForm.phone.trim()
      })
      setOtpSent(true)
      setIsAdminReset(res.data.is_admin || false)
      setReceivedOtp(res.data.otp || '')
      setOtpCountdown(30)
      if (res.data.name && !forgotForm.name) {
        setForgotForm(prev => ({ ...prev, name: res.data.name }))
      }
      toast.success(res.data.message || 'OTP भेज दिया गया है! 📲', { duration: 6000 })
    } catch (err) {
      toast.error(err.response?.data?.error || 'OTP भेजने में समस्या हुई। कृपया नंबर जांचें।')
    } finally {
      setOtpSending(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotForm.phone || !forgotForm.phone.trim()) {
      return toast.error('मोबाइल नंबर दर्ज करना अनिवार्य है।')
    }

    if (isAdminReset && (!forgotForm.otp || !forgotForm.otp.trim())) {
      return toast.error('एडमिन पासवर्ड बदलने के लिए OTP दर्ज करना अनिवार्य है!')
    }

    if (!isAdminReset && !otpSent && (!forgotForm.name || !forgotForm.name.trim())) {
      return toast.error('रजिस्टर्ड नाम या OTP दर्ज करना ज़रूरी है।')
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
        name: forgotForm.name.trim(),
        otp: forgotForm.otp.trim(),
        new_password: forgotForm.new_password.trim()
      })
      toast.success(res.data.message || 'पासवर्ड बदल गया! अब लॉगिन करें। ✅')
      setForm(prev => ({ ...prev, phone: forgotForm.phone, password: '' }))
      setShowForgotModal(false)
      setForgotForm({ phone: '', name: '', otp: '', new_password: '', confirm_password: '' })
      setOtpSent(false)
      setIsAdminReset(false)
      setReceivedOtp('')
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
                  isAdminReset ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isAdminReset ? '🔐 ADMIN OTP VERIFICATION' : 'RESET PASSWORD'}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {isAdminReset ? 'एडमिन पासवर्ड रीसेट' : 'पासवर्ड भूल गए?'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isAdminReset 
                    ? 'एडमिन पासवर्ड बदलने के लिए आपके रजिस्टर्ड नंबर पर भेजा गया OTP दर्ज करें'
                    : 'अपना मोबाइल नंबर दर्ज करके OTP से नया पासवर्ड बनाएं'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false)
                  setOtpSent(false)
                  setIsAdminReset(false)
                  setReceivedOtp('')
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* OTP Notification / Alert Banner when OTP is sent */}
            {otpSent && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl space-y-2 animate-fadeIn shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>📲</span> 
                    {isAdminReset ? 'एडमिन नंबर पर OTP भेजा गया:' : 'आपके नंबर पर OTP भेजा गया:'}
                  </span>
                  <span className="text-xs font-mono text-emerald-800 font-bold bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                    {forgotForm.phone}
                  </span>
                </div>
                {receivedOtp && (
                  <div className="flex items-center justify-between bg-white/95 p-2.5 rounded-xl border border-emerald-300 shadow-inner">
                    <span className="text-xs text-slate-700 font-semibold">सुरक्षा OTP कोड:</span>
                    <span className="font-mono font-black text-emerald-800 text-lg tracking-[0.25em] bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-400">
                      {receivedOtp}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-emerald-800 font-medium">
                  ⏳ यह OTP 10 मिनट तक मान्य है। इसे किसी के साथ साझा न करें।
                </p>
              </div>
            )}

            <form onSubmit={otpSent ? handleForgotPassword : handleSendOtp} className="space-y-3.5">
              {/* Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>📱 रजिस्टर्ड मोबाइल नंबर *</span>
                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false)
                        setIsAdminReset(false)
                        setReceivedOtp('')
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      ✏️ नंबर बदलें
                    </button>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    disabled={otpSent}
                    placeholder="e.g. 8434776690"
                    className={`input font-mono text-sm flex-1 ${otpSent ? 'bg-slate-100 text-slate-600 cursor-not-allowed font-bold' : ''}`}
                    value={forgotForm.phone}
                    onChange={e => setForgotForm({ ...forgotForm, phone: e.target.value })}
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || !forgotForm.phone}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm transition-all whitespace-nowrap"
                    >
                      {otpSending ? '⏳ भेज रहे हैं...' : '📲 OTP भेजें'}
                    </button>
                  )}
                </div>
              </div>

              {/* If OTP sent, show OTP & Password inputs */}
              {otpSent && (
                <>
                  {/* OTP Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>🔢</span> 6-अंकों का OTP दर्ज करें *
                      </span>
                      <button
                        type="button"
                        disabled={otpSending || otpCountdown > 0}
                        onClick={handleSendOtp}
                        className="text-[11px] font-bold text-emerald-700 hover:underline disabled:text-slate-400"
                      >
                        {otpCountdown > 0 ? `दोबारा भेजें (${otpCountdown}s)` : '🔄 दोबारा OTP भेजें'}
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 123456"
                      className="input font-mono font-black text-center tracking-[0.35em] text-xl bg-emerald-50/50 border-emerald-300 focus:border-emerald-500 py-2.5"
                      value={forgotForm.otp}
                      onChange={e => setForgotForm({ ...forgotForm, otp: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  {/* New Password */}
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

                  {/* Confirm Password */}
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
                </>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                {otpSent ? (
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary w-full py-3 text-sm font-bold shadow-md"
                  >
                    {forgotLoading ? '⏳ पासवर्ड बदल रहे हैं...' : '✅ OTP सत्यापित करें और पासवर्ड बदलें'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={otpSending || !forgotForm.phone}
                    className="btn-primary w-full py-3 text-sm font-bold shadow-md"
                  >
                    {otpSending ? '⏳ OTP भेज रहे हैं...' : '📲 OTP भेजें (Send OTP)'}
                  </button>
                )}

                {/* WhatsApp Help Option */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Admin Sahab, Mera Kameti me mera password reset OTP nahi aaya. Mera Registered Mobile: ${forgotForm.phone || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>💬</span> व्हाट्सएप पर सहायता प्राप्त करें
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
