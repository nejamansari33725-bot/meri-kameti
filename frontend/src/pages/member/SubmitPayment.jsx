import { useState } from 'react'
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

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setScreenshot(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return toast.error('Amount daalna zaroori hai.')

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('amount', form.amount)
      formData.append('reference_no', form.reference_no)
      formData.append('note', form.note)
      formData.append('month', form.month)
      formData.append('year', form.year)
      if (screenshot) formData.append('screenshot', screenshot)

      await api.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success('Payment submit ho gaya! Admin approve karega. ✅')
      setForm({ amount: '', reference_no: '', note: '', month: now.getMonth() + 1, year: now.getFullYear() })
      setScreenshot(null)
      setPreview(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit fail ho gaya.')
    } finally {
      setLoading(false)
    }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 mb-6">💰 Payment Submit Karein</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">💵 Amount (Rs.)</label>
            <input type="number" className="input" placeholder="5000" min="1" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} required />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🔢 Reference Number / Transaction ID</label>
            <input type="text" className="input" placeholder="TXN123456789" value={form.reference_no}
              onChange={e => setForm({ ...form, reference_no: e.target.value })} />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📸 Payment Screenshot</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('screenshot').click()}
            >
              {preview ? (
                <img src={preview} alt="Screenshot" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">Screenshot yahan drag karein ya click karein</p>
                  <p className="text-xs text-gray-300 mt-1">JPG, PNG, GIF — max 5MB</p>
                </div>
              )}
              <input id="screenshot" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {preview && (
              <button type="button" onClick={() => { setScreenshot(null); setPreview(null) }}
                className="text-red-500 text-sm mt-1 hover:underline">
                ✕ Remove screenshot
              </button>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📝 Note (optional)</label>
            <textarea className="input" placeholder="Koi note ya comment..." rows={2} value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? '⏳ Submit ho raha hai...' : '✅ Payment Submit Karein'}
          </button>
        </form>
      </div>
    </div>
  )
}
