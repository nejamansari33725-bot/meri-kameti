import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function Profile() {
  const { user, login } = useAuth()
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
      toast.error('प्रोफ़ाइल लोड नहीं हो पाई।')
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
      return toast.error('नाम और मोबाइल नंबर आवश्यक हैं।')
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

      toast.success(res.data?.message || 'प्रोफ़ाइल जानकारी सेव हो गई! ✅')
      if (res.data?.token) {
        login(res.data.token, res.data.role, res.data.name)
      }
      setPhotoFile(null)
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.error || 'अपडेट नहीं हो पाया।')
    } finally {
      setSavingDetails(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!passForm.new_password || passForm.new_password.length < 6) {
      return toast.error('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')
    }
    if (passForm.new_password !== passForm.confirm_password) {
      return toast.error('नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं हो रहे हैं!')
    }

    setSavingPass(true)
    try {
      const data = new FormData()
      data.append('current_password', passForm.current_password)
      data.append('new_password', passForm.new_password)

      const res = await api.put('/auth/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('पासवर्ड सफलतापूर्वक बदल गया! ✅')
      setPassForm({ current_password: '', new_password: '', confirm_password: '' })
      if (res.data?.token) {
        login(res.data.token, res.data.role, res.data.name)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'पासवर्ड बदलने में त्रुटि आई।')
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

  const currentAvatar = photoPreview || formData.profile_photo

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Top Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-7 text-white shadow-xl border border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar / Photo with upload trigger */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-emerald-500/40 bg-slate-800 flex items-center justify-center shadow-lg">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-md transition-all group-hover:scale-110"
              title="फोटो बदलें"
            >
              <span>📷</span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {user?.role === 'admin' ? 'कमिटी एडमिन (Admin)' : 'कमिटी सदस्य (Member)'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {formData.name || 'सदस्य'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono">
              📱 {formData.phone}
            </p>
            {formData.email && (
              <p className="text-xs text-emerald-200">
                ✉️ {formData.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-5 font-bold text-xs sm:text-sm rounded-t-2xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'details'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>👤</span> प्रोफ़ाइल जानकारी (Mobile, Name, Gmail)
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`py-3 px-5 font-bold text-xs sm:text-sm rounded-t-2xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>🔒</span> पासवर्ड बदलें (Change Password)
        </button>
      </div>

      {/* Tab 1: Personal Details Form */}
      {activeTab === 'details' && (
        <div className="card shadow-lg border border-slate-100 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📝</span> व्यक्तिगत विवरण एडिट करें
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              अपना मोबाइल नंबर, ईमेल और प्रोफ़ाइल फोटो यहाँ से अपडेट कर सकते हैं
            </p>
          </div>

          <form onSubmit={handleUpdateDetails} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                👤 पूरा नाम (Full Name) *
              </label>
              <input
                type="text"
                required
                className="input text-sm font-semibold"
                placeholder="e.g. मोहम्मद रियाज़"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📱 मोबाइल नंबर (Phone Number - लॉगिन के लिए) *
              </label>
              <input
                type="tel"
                required
                className="input font-mono text-sm"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                नोट: इसी नंबर से आप वेबसाइट में लॉगिन करते हैं।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                ✉️ Gmail / Email ID (वैकल्पिक / Optional)
              </label>
              <input
                type="email"
                className="input text-sm"
                placeholder="e.g. member@gmail.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Photo Selection Preview Info */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📸 प्रोफ़ाइल फोटो (Profile Photo)
              </label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    हटाएं
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingDetails}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {savingDetails ? '⏳ सेव हो रहा है...' : '💾 प्रोफ़ाइल सेव करें'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Change Password Form */}
      {activeTab === 'password' && (
        <div className="card shadow-lg border border-slate-100 space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🔒</span> लॉगिन पासवर्ड बदलें
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              सुरक्षा के लिए समय-समय पर अपना पासवर्ड बदलते रहें
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔑 वर्तमान पुराना पासवर्ड (Current Password)
              </label>
              <input
                type="password"
                className="input text-sm"
                placeholder="वर्तमान पासवर्ड दर्ज करें..."
                value={passForm.current_password}
                onChange={e => setPassForm({ ...passForm, current_password: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔒 नया पासवर्ड (New Password) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input text-sm"
                placeholder="कम से कम 6 अक्षरों का नया पासवर्ड..."
                value={passForm.new_password}
                onChange={e => setPassForm({ ...passForm, new_password: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                🔐 नया पासवर्ड दोबारा लिखें (Confirm Password) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input text-sm"
                placeholder="नया पासवर्ड दोबारा दर्ज करें..."
                value={passForm.confirm_password}
                onChange={e => setPassForm({ ...passForm, confirm_password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {savingPass ? '⏳ पासवर्ड बदल रहे हैं...' : '✅ नया पासवर्ड सेव करें'}
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
