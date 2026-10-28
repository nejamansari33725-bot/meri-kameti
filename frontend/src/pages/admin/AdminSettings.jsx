import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function AdminSettings() {
  const { user, login } = useAuth()
  const [activeTab, setActiveTab] = useState('payment') // 'payment' | 'profile'

  // Payment & Committee Settings State
  const [settings, setSettings] = useState({
    committee_name: 'Mera Kameti',
    upi_id: 'ansarinizam57970-2@oksbi',
    upi_name: 'Nizam Ansari',
    qr_code_url: '/upi-qr.png',
    default_late_fine: '0'
  })
  const [qrFile, setQrFile] = useState(null)
  const [qrPreview, setQrPreview] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Profile & Password State
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    // Fetch settings
    api.get('/settings').then(res => {
      if (res.data?.data) {
        setSettings(prev => ({ ...prev, ...res.data.data }))
      }
    }).catch(err => console.error(err))

    // Fetch admin profile
    api.get('/auth/me').then(res => {
      if (res.data?.data) {
        setProfileForm(prev => ({
          ...prev,
          name: res.data.data.name || '',
          phone: res.data.data.phone || ''
        }))
      }
    }).catch(err => console.error(err))
  }, [])

  const handleQrChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setQrFile(file)
      setQrPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSettingsLoading(true)
    try {
      const formData = new FormData()
      formData.append('committee_name', settings.committee_name)
      formData.append('upi_id', settings.upi_id)
      formData.append('upi_name', settings.upi_name)
      formData.append('default_late_fine', settings.default_late_fine)
      if (qrFile) {
        formData.append('qr_image', qrFile)
      }

      const res = await api.put('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSettings(res.data.data)
      setQrFile(null)
      toast.success('सेटिंग्स सफलतापूर्वक सेव हो गई! ✅')
    } catch (err) {
      toast.error(err.response?.data?.error || 'सेटिंग्स सेव करने में त्रुटि आई।')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (profileForm.new_password) {
      if (profileForm.new_password.length < 6) {
        return toast.error('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।')
      }
      if (profileForm.new_password !== profileForm.confirm_password) {
        return toast.error('नया पासवर्ड और कन्फर्म पासवर्ड मैच नहीं हो रहे हैं!')
      }
    }

    setProfileLoading(true)
    try {
      const res = await api.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        current_password: profileForm.current_password,
        new_password: profileForm.new_password || undefined
      })

      // Update auth context with new token, name, and phone
      login(res.data.token, res.data.role, res.data.name)

      toast.success('Admin लॉगिन विवरण (नंबर/पासवर्ड) सफलतापूर्वक बदल गया! ✅')
      setProfileForm(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (err) {
      toast.error(err.response?.data?.error || 'प्रोफाइल अपडेट करने में त्रुटि आई।')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-primary-900 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>⚙️</span> Admin कंट्रोल व सेटिंग्स
        </h1>
        <p className="text-slate-300 text-sm mt-1">
          QR कोड, UPI ID, लेट फाइन, और अपना लॉगिन नंबर व पासवर्ड यहाँ से बदलें
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('payment')}
          className={`py-2.5 px-4 font-bold text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'payment'
              ? 'border-primary-600 text-primary-700 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📲</span> UPI, QR कोड व कमिटी सेटिंग्स
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2.5 px-4 font-bold text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-700 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>👤</span> Admin मोबाइल नंबर व पासवर्ड बदलें
        </button>
      </div>

      {/* Tab 1: Payment & QR Settings */}
      {activeTab === 'payment' && (
        <div className="card space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📲 QR कोड व UPI विवरण एडिट करें</h2>
            <p className="text-xs text-gray-500">
              यहाँ आप जो भी UPI ID या QR कोड बदलेंगे, वह तुरंत सभी मेम्बर्स के पेमेंट पेज पर दिखने लगेगा।
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  कमिटी का नाम (Committee Name)
                </label>
                <input
                  type="text"
                  className="input"
                  value={settings.committee_name || ''}
                  onChange={e => setSettings({ ...settings, committee_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  डिफ़ॉल्ट लेट फाइन (Default Late Fine ₹)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 50 या 100"
                  value={settings.default_late_fine || '0'}
                  onChange={e => setSettings({ ...settings, default_late_fine: e.target.value })}
                />
                <span className="text-[11px] text-gray-400 mt-0.5 block">
                  किश्त लेट होने पर लगने वाला डिफ़ॉल्ट जुर्माना राशि
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  UPI ID (भुगतान के लिए)
                </label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="e.g. ansarinizam57970-2@oksbi"
                  value={settings.upi_id || ''}
                  onChange={e => setSettings({ ...settings, upi_id: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  UPI धारक का नाम (Account Holder Name)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Nizam Ansari"
                  value={settings.upi_name || ''}
                  onChange={e => setSettings({ ...settings, upi_name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* QR Code Upload Section */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📷 QR कोड इमेज बदलें (Upload New QR Code)
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-center">
                  <span className="text-xs text-gray-500 block mb-1 font-medium">वर्तमान / प्रीव्यू QR:</span>
                  <img
                    src={qrPreview || settings.qr_code_url || '/upi-qr.png'}
                    alt="Current QR"
                    className="w-36 h-36 object-contain rounded-xl border bg-white shadow-sm p-1"
                  />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-gray-600">
                    यदि आप भविष्य में Google Pay या PhonePe का नया QR कोड लगाना चाहते हैं, तो यहाँ से नई फोटो अपलोड करें।
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrChange}
                    className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700 file:cursor-pointer"
                  />
                  {qrPreview && (
                    <span className="block text-xs text-green-600 font-medium">
                      ✓ नई फोटो चुन ली गई है। नीचे 'सेव करें' बटन दबाएँ।
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={settingsLoading}
              className="btn-primary w-full py-3 text-base shadow-sm font-bold"
            >
              {settingsLoading ? '⏳ सेव हो रहा है...' : '💾 QR व UPI सेटिंग्स सेव करें'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Admin Profile & Login Security */}
      {activeTab === 'profile' && (
        <div className="card space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">👤 Admin लॉगिन नंबर व पासवर्ड एडिट करें</h2>
            <p className="text-xs text-gray-500">
              यहाँ से आप अपना मोबाइल नंबर और पासवर्ड कभी भी बदल सकते हैं।
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900">
            <strong>⚠️ ध्यान रखें:</strong> यदि आप मोबाइल नंबर या पासवर्ड बदलते हैं, तो अगली बार लॉगिन करते समय नए मोबाइल नंबर और नए पासवर्ड का ही उपयोग करें।
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Admin का नाम (Full Name)
                </label>
                <input
                  type="text"
                  className="input"
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Admin लॉगिन मोबाइल नंबर (Phone Number)
                </label>
                <input
                  type="tel"
                  className="input font-mono"
                  placeholder="0000000000 या 9876543210"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-3">
              <h3 className="font-bold text-gray-800 text-sm">🔒 पासवर्ड बदलें (Change Password)</h3>
              <p className="text-xs text-gray-400">
                (यदि पासवर्ड नहीं बदलना चाहते, तो पासवर्ड वाले बॉक्स खाली छोड़ दें)
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  वर्तमान पासवर्ड (Current Password)
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="मौजूदा पासवर्ड डालें"
                  value={profileForm.current_password}
                  onChange={e => setProfileForm({ ...profileForm, current_password: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    नया पासवर्ड (New Password)
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="कम से कम 6 अक्षर"
                    value={profileForm.new_password}
                    onChange={e => setProfileForm({ ...profileForm, new_password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    नया पासवर्ड दोबारा लिखें (Confirm Password)
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder="वही पासवर्ड दोबारा डालें"
                    value={profileForm.confirm_password}
                    onChange={e => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary w-full py-3 text-base shadow-sm font-bold bg-primary-700 hover:bg-primary-800"
            >
              {profileLoading ? '⏳ अपडेट हो रहा है...' : '🔒 लॉगिन डिटेल्स व पासवर्ड अपडेट करें'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
