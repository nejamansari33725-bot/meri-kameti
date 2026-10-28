import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function SubmitPayment() {
  const now = new Date()
  const [form, setForm] = useState({
    amount: '',
    reference_no: '',
    note: '',
    month: now.getMonth() + 1,
    year: now.getFullYear()
  })
  const [screenshot, setScreenshot] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Dynamic payment settings from Admin
  const [paymentConfig, setPaymentConfig] = useState({
    upi_id: 'ansarinizam57970-2@oksbi',
    upi_name: 'Nizam Ansari',
    qr_code_url: '/upi-qr.png'
  })

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.data?.data) {
        setPaymentConfig(prev => ({
          ...prev,
          upi_id: res.data.data.upi_id || prev.upi_id,
          upi_name: res.data.data.upi_name || prev.upi_name,
          qr_code_url: res.data.data.qr_code_url || prev.qr_code_url
        }))
      }
    }).catch(err => console.error(err))
  }, [])

  const copyUpi = () => {
    navigator.clipboard.writeText(paymentConfig.upi_id)
    setCopied(true)
    toast.success('UPI ID कॉपी हो गई! ✅')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setScreenshot(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return toast.error('Amount डालना ज़रूरी है।')

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('amount', form.amount)
      formData.append('reference_no', form.reference_no)
      formData.append('note', form.note)
      formData.append('month', form.month)
      formData.append('year', form.year)
      if (screenshot) formData.append('screenshot', screenshot)

      const res = await api.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success(res.data.message || 'Payment सबमिट हो गया! ✅')
      setForm({ amount: '', reference_no: '', note: '', month: now.getMonth() + 1, year: now.getFullYear() })
      setScreenshot(null)
      setPreview(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit फेल हो गया।')
    } finally {
      setLoading(false)
    }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const upiPayLink = `upi://pay?pa=${paymentConfig.upi_id}&pn=${encodeURIComponent(paymentConfig.upi_name)}&cu=INR${form.amount ? `&am=${form.amount}` : ''}`

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Payment Submission Form */}
      <div className="card shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700 mb-1 flex items-center gap-2">
          <span>💰</span> Payment Submit Karein
        </h1>
        <p className="text-xs text-gray-500 mb-5">
          पैसे भेजने के बाद नीचे स्क्रीनशॉट और रिफरेंस नंबर सबमिट करें
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Month</label>
              <select className="input" value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Year</label>
              <select className="input" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">💵 Amount (₹)</label>
            <input
              type="number"
              className="input"
              placeholder="e.g. 5000"
              min="1"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🔢 Transaction ID / UTR / Reference No.
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 428719283749"
              value={form.reference_no}
              onChange={e => setForm({ ...form, reference_no: e.target.value })}
            />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📸 Payment Screenshot (स्क्रीनशॉट)
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary-400 transition-colors cursor-pointer bg-gray-50/50"
              onClick={() => document.getElementById('screenshot').click()}
            >
              {preview ? (
                <img src={preview} alt="Screenshot" className="max-h-48 mx-auto rounded-lg object-contain shadow-sm" />
              ) : (
                <div className="text-gray-400">
                  <div className="text-4xl mb-1">📷</div>
                  <p className="text-sm font-medium text-gray-600">पेमेंट का स्क्रीनशॉट यहाँ अपलोड करें</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — क्लिक करें या ड्रैग करें</p>
                </div>
              )}
              <input id="screenshot" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {preview && (
              <button
                type="button"
                onClick={() => { setScreenshot(null); setPreview(null) }}
                className="text-red-500 text-xs mt-1 hover:underline font-medium"
              >
                ✕ दूसरा स्क्रीनशॉट चुनें
              </button>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📝 Note (optional)</label>
            <textarea
              className="input"
              placeholder="कोई टिप्पणी या मैसेज..."
              rows={2}
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base shadow-md">
            {loading ? '⏳ सबमिट हो रहा है...' : '✅ Payment सबमिट करें'}
          </button>
        </form>
      </div>

      {/* QR Code & UPI Details Box (Placed Below as requested) */}
      <div className="card bg-gradient-to-br from-emerald-50 via-white to-green-50 border border-emerald-200 shadow-sm space-y-4">
        <div className="text-center">
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2">
            📲 Scan & Pay (ऑनलाइन भुगतान)
          </span>
          <h2 className="text-xl font-bold text-gray-900">
            कमेटी का पैसा इस QR या UPI पर भेजें
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            खाता धारक: <span className="font-semibold text-gray-800">{paymentConfig.upi_name}</span>
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-2xl shadow-md border border-emerald-100 max-w-[280px] w-full text-center">
            <img
              src={paymentConfig.qr_code_url || '/upi-qr.png'}
              alt="UPI QR Code"
              className="w-full h-auto rounded-xl mx-auto object-contain"
            />
          </div>
        </div>

        {/* UPI ID Box with One-Click Copy */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block text-center">
            UPI ID
          </span>
          
          <div className="flex items-center justify-between gap-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
            <span className="font-mono font-bold text-sm text-emerald-950 truncate select-all">
              {paymentConfig.upi_id}
            </span>
            <button
              type="button"
              onClick={copyUpi}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-md font-bold transition-all shadow-sm ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {copied ? '✓ कॉपी हुआ' : '📋 Copy'}
            </button>
          </div>

          {/* Quick Pay Button on Mobile */}
          <div className="pt-1 text-center">
            <a
              href={upiPayLink}
              className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <span>⚡</span> UPI App से सीधे Pay करें (GPay / PhonePe / Paytm)
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-1">
          <p className="font-bold text-emerald-900 mb-1">📌 पेमेंट करने का तरीका:</p>
          <p>1. ऊपर दिया गया QR कोड स्कैन करें या UPI ID पर पेमेंट करें।</p>
          <p>2. पेमेंट सफल होने के बाद उसका <strong>Screenshot</strong> लें।</p>
          <p>3. ऊपर वाले फॉर्म में Amount और Screenshot अपलोड करके <strong>"Payment सबमिट करें"</strong> बटन दबाएं।</p>
        </div>
      </div>
    </div>
  )
}
