import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function AdminSettings() {
  const { user, login } = useAuth()
  const [activeTab, setActiveTab] = useState('payment') // 'payment' | 'profile' | 'backup'

  // Payment & Committee Settings State
  const [settings, setSettings] = useState({
    committee_name: 'Mera Kameti',
    upi_id: 'ansarinizam57970-2@oksbi',
    upi_name: 'Nizam Ansari',
    qr_code_url: '/upi-qr.png',
    default_late_fine: '0',
    whatsapp_group_link: 'https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2'
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

  // Backup & Data Export State
  const [backupStats, setBackupStats] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreLoading, setRestoreLoading] = useState(false)

  const loadBackupStats = () => {
    api.get('/reports/backup-data')
      .then(res => setBackupStats(res.data))
      .catch(err => console.error('Backup stats error:', err))
  }

  const handleDownloadJson = async () => {
    setBackupLoading(true)
    const toastId = toast.loading('डेटा बैकअप तैयार हो रहा है...')
    try {
      const res = await api.get('/reports/backup-data?download=true', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `mera-kameti-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('डेटा सफलतापूर्वक डाउनलोड हो गया! 📥', { id: toastId })
    } catch (err) {
      toast.error('डाउनलोड विफल: ' + (err.response?.data?.error || err.message), { id: toastId })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleDownloadDb = async () => {
    setBackupLoading(true)
    const toastId = toast.loading('डेटाबेस फ़ाइल तैयार हो रही है...')
    try {
      const res = await api.get('/reports/download-db', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `kameti-backup-${new Date().toISOString().slice(0, 10)}.db`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('डेटाबेस फाइल (.db) डाउनलोड हो गई! 💾', { id: toastId })
    } catch (err) {
      toast.error('डेटाबेस डाउनलोड विफल: ' + (err.response?.data?.error || err.message), { id: toastId })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreBackup = async (e) => {
    e.preventDefault()
    if (!restoreFile) return toast.error('कृपया पहले JSON बैकअप फ़ाइल चुनें!')
    if (!window.confirm('⚠️ क्या आप निश्चित हैं? बैकअप फ़ाइल से डेटा रिस्टोर करने पर सभी रिकॉर्ड्स अपडेट/रिस्टोर हो जाएंगे।')) return

    setRestoreLoading(true)
    const toastId = toast.loading('डेटा रिस्टोर हो रहा है...')
    try {
      const text = await restoreFile.text()
      const parsed = JSON.parse(text)
      const res = await api.post('/reports/restore-data', { data: parsed.data || parsed })
      toast.success(res.data?.message || 'डेटा रिस्टोर हो गया! ✅', { id: toastId })
      setRestoreFile(null)
      loadBackupStats()
    } catch (err) {
      toast.error('रिस्टोर विफल: ' + (err.response?.data?.error || err.message), { id: toastId })
    } finally {
      setRestoreLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackupStats()
    }
  }, [activeTab])

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
      formData.append('whatsapp_group_link', settings.whatsapp_group_link || '')
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
        <button
          onClick={() => setActiveTab('backup')}
          className={`py-2.5 px-4 font-bold text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-sm'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>🛡️</span> डेटा डाउनलोड व बैकअप (Data Safety)
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

            {/* Official WhatsApp Group Link */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
              <label className="block text-sm font-bold text-emerald-900 flex items-center gap-2">
                <span>💬</span> कमिटी का आधिकारिक व्हाट्सएप ग्रुप लिंक (Official WhatsApp Group Link)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="input font-mono text-sm bg-white"
                  placeholder="https://chat.whatsapp.com/..."
                  value={settings.whatsapp_group_link || ''}
                  onChange={e => setSettings({ ...settings, whatsapp_group_link: e.target.value })}
                  required
                />
                {settings.whatsapp_group_link && (
                  <a
                    href={settings.whatsapp_group_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
                  >
                    <span>↗️</span> टेस्ट करें
                  </a>
                )}
              </div>
              <p className="text-xs text-emerald-700">
                वेबसाइट पर सभी मेम्बर्स को यह लिंक दिखाई देगा ताकि वे सीधे व्हाट्सएप ग्रुप में जुड़ सकें।
              </p>
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

      {/* Tab 3: Data Safety, Backup & Download */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="card border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-600/30">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      डेटा सुरक्षा व सम्पूर्ण बैकअप (100% Data Safe)
                    </h2>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      ZERO DATA LOSS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    कमिटी का पूरा डेटा सुरक्षित है। कभी भी 1-क्लिक में अपने फोन या कंप्यूटर पर डाउनलोड करें।
                  </p>
                </div>
              </div>

              <button
                onClick={loadBackupStats}
                className="text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                🔄 रिफ्रेश
              </button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-xl sm:text-2xl font-black text-slate-800">
                  {backupStats?.counts?.users ?? '—'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">👥 कुल सदस्य (Members)</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-xl sm:text-2xl font-black text-emerald-700">
                  {backupStats?.counts?.payments ?? '—'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">💰 कुल पेमेंट्स (Payments)</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-xl sm:text-2xl font-black text-amber-700">
                  {backupStats?.counts?.committee_rounds ?? '—'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">🏆 कमिटी राउंड्स (Rounds)</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-xl sm:text-2xl font-black text-indigo-700">
                  {backupStats?.counts?.late_fines ?? '—'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">⚡ लेट फाइन रिकॉर्ड्स</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-emerald-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDownloadJson}
                disabled={backupLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>📥</span>
                {backupLoading ? 'डाउनलोडिंग...' : 'पूरा डेटा डाउनलोड करें (JSON)'}
              </button>

              <button
                type="button"
                onClick={handleDownloadDb}
                disabled={backupLoading}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm border border-slate-700"
              >
                <span>💾</span>
                {backupLoading ? 'डाउनलोडिंग...' : 'डेटाबेस फ़ाइल डाउनलोड (.db)'}
              </button>
            </div>

            <div className="bg-emerald-100/60 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>💡</span> बैकअप में क्या-क्या शामिल है?
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                <li>सभी मेंबर्स के नाम, फोन नंबर व सुरक्षित एन्क्रिप्टेड पासवर्ड</li>
                <li>सभी अप्रूव्ड व पेंडिंग पेमेंट्स व UTR रेफरेंस</li>
                <li>लेट फाइन (Due व Paid) का पूरा हिसाब</li>
                <li>कमिटी विनर और पेआउट राउंड्स</li>
                <li>QR कोड व बैंक सेटिंग्स</li>
              </ul>
            </div>
          </div>

          {/* Restore / Import Card */}
          <div className="card border border-slate-200 space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>🔄</span> बैकअप से डेटा रिस्टोर करें (Restore Backup)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                यदि कभी सर्वर बदलना हो या पुराना बैकअप वापस लाना हो, तो अपनी डाउनलोड की गई JSON फ़ाइल यहाँ अपलोड करें।
              </p>
            </div>

            <form onSubmit={handleRestoreBackup} className="space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={e => setRestoreFile(e.target.files[0])}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-xl p-1"
              />

              <button
                type="submit"
                disabled={!restoreFile || restoreLoading}
                className="btn-secondary w-full py-2.5 text-xs font-bold text-slate-800"
              >
                {restoreLoading ? '⏳ रिस्टोर हो रहा है...' : '🔄 बैकअप फ़ाइल से डेटा रिस्टोर करें'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
