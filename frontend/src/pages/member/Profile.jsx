import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api, { getImageUrl } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function Profile() {
  const { user, login, updateUserPhoto } = useAuth()
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'password'

  // Personal details state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profile_photo: ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [savingDetails, setSavingDetails] = useState(false)

  // Password change state
  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [savingPass, setSavingPass] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me')
      if (res.data?.data) {
        const u = res.data.data
        setFormData({
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || '',
          profile_photo: u.profile_photo || ''
        })
      }
    } catch (err) {
      toast.error('प्रोफ़ाइल लोड नहीं हो पाई / Profile load error.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleUpdateDetails = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.phone) {
      return toast.error('नाम और मोबाइल नंबर आवश्यक हैं / Name and phone required.')
    }

    setSavingDetails(true)
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('phone', formData.phone)
      data.append('email', formData.email || '')
      if (photoFile) {
        data.append('photo', photoFile)
      }

      const res = await api.put('/auth/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success(res.data?.message || 'प्रोफ़ाइल जानकारी सेव हो गई! / Profile saved! ✅')
      if (res.data?.token) {
        login(res.data.token, res.data.role, res.data.name, res.data.profile_photo)
      }
      if (res.data?.profile_photo) {
        updateUserPhoto(res.data.profile_photo)
      }
      setPhotoFile(null)
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.error || 'अपडेट नहीं हो पाया / Update failed.')
    } finally {
      setSavingDetails(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!passForm.new_password || passForm.new_password.length < 6) {
      return toast.error('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters.')
    }
    if (passForm.new_password !== passForm.confirm_password) {
      return toast.error('नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं हो रहे हैं! / Passwords do not match.')
    }

    setSavingPass(true)
    try {
      const data = new FormData()
      data.append('current_password', passForm.current_password)
      data.append('new_password', passForm.new_password)

      const res = await api.put('/auth/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('पासवर्ड सफलतापूर्वक बदल गया! / Password changed successfully! ✅')
      setPassForm({ current_password: '', new_password: '', confirm_password: '' })
      if (res.data?.token) {
        login(res.data.token, res.data.role, res.data.name, res.data.profile_photo)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'पासवर्ड बदलने में त्रुटि आई / Password update error.')
    } finally {
      setSavingPass(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    )
  }

  const currentAvatar = photoPreview || (formData.profile_photo ? getImageUrl(formData.profile_photo) : null)

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Top Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-7 text-white shadow-xl border border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 overflow-hidden flex items-center justify-center">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <label
              htmlFor="photoUpload"
              className="absolute -bottom-2 -right-2 bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl shadow-md cursor-pointer transition-transform transform hover:scale-110"
              title="फोटो बदलें / Change Photo"
            >
              📷
            </label>
            <input
              id="photoUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* User Details Headline */}
          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 rounded-full text-[11px] font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {user?.role === 'admin' ? 'ADMIN 🛡️' : 'MEMBER 👤 (सदस्य)'}
            </div>
            <h1 className="text-2xl font-black tracking-tight">{formData.name || 'Member'}</h1>
            <p className="text-xs text-slate-300 font-mono">📱 {formData.phone || 'No phone'}</p>
            {formData.email && <p className="text-xs text-slate-400">📧 {formData.email}</p>}
          </div>
        </div>
      </div>

      {/* Tabs: Details vs Password */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'details'
              ? 'bg-white text-emerald-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          👤 व्यक्तिगत जानकारी / Personal Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'password'
              ? 'bg-white text-emerald-950 shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🔑 पासवर्ड बदलें / Change Password
        </button>
      </div>

      {/* Tab 1: Personal Details Form */}
      {activeTab === 'details' && (
        <div className="card shadow-lg border border-slate-200 space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              व्यक्तिगत जानकारी एडिट करें / Edit Personal Details
            </h2>
            <p className="text-xs text-slate-500">
              अपना नाम, मोबाइल नंबर, ईमेल और प्रोफ़ाइल फोटो यहाँ अपडेट करें
            </p>
          </div>

          <form onSubmit={handleUpdateDetails} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                👤 पूरा नाम / Full Name *
              </label>
              <input
                type="text"
                required
                className="input font-semibold"
                placeholder="उदा. Nizam Ansari"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Mobile / Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📱 मोबाइल नंबर / Mobile Number (Login ID) *
              </label>
              <input
                type="tel"
                required
                className="input font-mono font-semibold"
                placeholder="10 अंकों का मोबाइल नंबर"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                💡 इसी नंबर से आप Mera Kameti में लॉगिन करते हैं।
              </p>
            </div>

            {/* Email (Gmail) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📧 ईमेल आईडी / Email ID (Gmail)
              </label>
              <input
                type="email"
                className="input font-mono text-sm"
                placeholder="e.g. yourname@gmail.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                महत्वपूर्ण सूचनाओं और पासवर्ड रिकवरी के लिए (वैकल्पिक / Optional)
              </p>
            </div>

            {/* Photo Selection Preview Note */}
            {photoFile && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex justify-between items-center">
                <span>📷 नई फोटो चुनी गई: <strong>{photoFile.name}</strong></span>
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="text-rose-600 font-bold hover:underline"
                >
                  हटाएं / Remove
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={savingDetails}
              className="btn-primary w-full py-3 font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              {savingDetails ? 'सेव हो रहा है...' : '💾 जानकारी सेव करें / Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Password Change Form */}
      {activeTab === 'password' && (
        <div className="card shadow-lg border border-slate-200 space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">
              पासवर्ड बदलें / Change Password
            </h2>
            <p className="text-xs text-slate-500">
              अपने खाते की सुरक्षा के लिए एक मजबूत पासवर्ड सेट करें
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔒 पुराना पासवर्ड / Current Password
              </label>
              <input
                type="password"
                className="input font-mono"
                placeholder="मौजूदा पासवर्ड दर्ज करें"
                value={passForm.current_password}
                onChange={e => setPassForm({ ...passForm, current_password: e.target.value })}
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔑 नया पासवर्ड / New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input font-mono"
                placeholder="कम से कम 6 अक्षरों का नया पासवर्ड"
                value={passForm.new_password}
                onChange={e => setPassForm({ ...passForm, new_password: e.target.value })}
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔐 नया पासवर्ड कन्फर्म करें / Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input font-mono"
                placeholder="नया पासवर्ड दोबारा दर्ज करें"
                value={passForm.confirm_password}
                onChange={e => setPassForm({ ...passForm, confirm_password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="btn-primary w-full py-3 font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              {savingPass ? 'पासवर्ड बदल रहा है...' : '🔐 पासवर्ड अपडेट करें / Update Password'}
            </button>
          </form>
        </div>
      )}

    </div>
  )
}