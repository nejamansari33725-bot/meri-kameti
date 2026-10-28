import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function SubmitPayment() {
  const now = new Date()
  const [form, setForm] = useState({
    installment_amount: '',
    late_fine: '0',
    repayment_amount: '',
    reference_no: '',
    note: '',
    month: now.getMonth() + 1,
    year: now.getFullYear()
  })
  const [myStatement, setMyStatement] = useState(null)
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
    // 1. Fetch UPI settings
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

    // 2. Fetch logged in member's statement to show past payout/deposits
    api.get('/auth/me').then(meRes => {
      if (meRes.data?.data?.id) {
        return api.get(`/members/${meRes.data.data.id}/statement`)
      }
    }).then(stmtRes => {
      if (stmtRes?.data?.data) {
        setMyStatement(stmtRes.data.data)
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

  const installment = parseFloat(form.installment_amount) || 0
  const fine = parseFloat(form.late_fine) || 0
  const repayment = parseFloat(form.repayment_amount) || 0
  const totalPayable = installment + fine + repayment

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (installment <= 0 && repayment <= 0) {
      return toast.error('कृपया महीने की किश्त राशि या उठाया हुआ पैसा वापसी दर्ज करें।')
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('amount', installment)
      formData.append('late_fine', fine)
      formData.append('repayment_amount', repayment)
      formData.append('reference_no', form.reference_no)
      formData.append('note', form.note)
      formData.append('month', form.month)
      formData.append('year', form.year)
      if (screenshot) formData.append('screenshot', screenshot)

      const res = await api.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      toast.success(res.data.message || 'Payment सबमिट हो गया! ✅')
      setForm({ 
        installment_amount: '', 
        late_fine: '0', 
        repayment_amount: '',
        reference_no: '', 
        note: '', 
        month: now.getMonth() + 1, 
        year: now.getFullYear() 
      })
      setScreenshot(null)
      setPreview(null)

      // Refresh passbook
      api.get('/auth/me').then(meRes => {
        if (meRes.data?.data?.id) {
          return api.get(`/members/${meRes.data.data.id}/statement`)
        }
      }).then(stmtRes => {
        if (stmtRes?.data?.data) setMyStatement(stmtRes.data.data)
      }).catch(() => {})

    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit फेल हो गया।')
    } finally {
      setLoading(false)
    }
  }

  const upiPayLink = `upi://pay?pa=${paymentConfig.upi_id}&pn=${encodeURIComponent(paymentConfig.upi_name)}&cu=INR${totalPayable > 0 ? `&am=${totalPayable}` : ''}`

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span>💳</span> किश्त एवं लेट फाइन भुगतान (Pay Installment)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          कमिटी की मासिक किश्त, लेट फाइन या उठाया हुआ पैसा वापस जमा करें और रसीद अपलोड करें
        </p>
      </div>

      {/* Member's Passbook & Payout Status Box (जो पैसा उठाया है उसका विवरण) */}
      {myStatement && (
        <div className="card bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-slate-700/60 shadow-xl space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 block">
                YOUR COMMITTEE PASSBOOK
              </span>
              <h2 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
                <span>📖</span> आपका व्यक्तिगत खाता विवरण
              </h2>
            </div>
            <Link
              to="/history"
              className="text-xs text-emerald-300 hover:text-emerald-200 underline font-semibold"
            >
              रसीद हिस्ट्री →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Paisa Uthaya Hai ya nahi */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-[11px] text-rose-300 font-bold uppercase block">
                🔴 उठाया गया पैसा
              </span>
              <p className="text-lg sm:text-xl font-black text-white mt-1">
                ₹ {myStatement.total_debit?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5 truncate">
                {myStatement.roundsWon?.length > 0 
                  ? `🏆 ${myStatement.roundsWon.length} बार उठाया`
                  : 'अभी नहीं उठाया'}
              </p>
            </div>

            {/* 2. Jama Kiya */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-[11px] text-emerald-300 font-bold uppercase block">
                🟢 कुल जमा किया
              </span>
              <p className="text-lg sm:text-xl font-black text-white mt-1">
                ₹ {myStatement.total_credit?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">स्वीकृत किश्तें</p>
            </div>

            {/* 3. Late Fine */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-[11px] text-amber-300 font-bold uppercase block">
                ⚡ कुल लेट फाइन
              </span>
              <p className="text-lg sm:text-xl font-black text-white mt-1">
                ₹ {myStatement.total_late_fine?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">जुर्माना राशि</p>
            </div>

            {/* 4. Net Khata */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-[11px] text-indigo-300 font-bold uppercase block">
                ⚖️ नेट बैलेंस
              </span>
              <p className="text-lg sm:text-xl font-black text-white mt-1">
                ₹ {myStatement.net_balance?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {myStatement.net_balance >= 0 ? 'कमिटी में जमा' : 'कमिटी से लिया'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Submission Form */}
      <div className="card shadow-lg border border-slate-200">
        <h2 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
          <span>📝</span> पेमेंट सबमिट फॉर्म (Payment Submission)
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          किश्त, लेट फीस और उठाया हुआ पैसा वापसी की रकम दर्ज करें और रसीद स्क्रीनशॉट अपलोड करें
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Month & Year Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📅 किस महीने की किश्त है? *
              </label>
              <select
                className="input font-semibold"
                value={form.month}
                onChange={e => setForm({ ...form, month: parseInt(e.target.value) })}
              >
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📅 साल (Year) *
              </label>
              <select
                className="input font-semibold"
                value={form.year}
                onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 1. Installment Amount & Late Fine Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                <span>💵</span> महीने की किश्त (Installment ₹) *
              </label>
              <input
                type="number"
                className="input font-bold text-slate-900 text-lg bg-white"
                placeholder="e.g. 2000, 5000"
                min="0"
                value={form.installment_amount}
                onChange={e => setForm({ ...form, installment_amount: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">आपकी नियमित मासिक किश्त</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                <span>⚡</span> लेट फाइन (Late Fine ₹)
              </label>
              <input
                type="number"
                className="input font-bold text-amber-900 text-lg bg-white"
                placeholder="e.g. 0, 50, 100"
                min="0"
                value={form.late_fine}
                onChange={e => setForm({ ...form, late_fine: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">यदि लेट फीस लगी हो (अन्यथा 0)</p>
            </div>
          </div>

          {/* 2. Custom Repayment for Withdrawn Committee Money (उठाया हुआ पैसा वापसी) */}
          <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1">
                <span>🔄</span> उठाया हुआ पैसा वापस जमा (Repay Withdrawn Money ₹)
              </label>
              {myStatement && (
                <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  बकाया उठाया: ₹{(myStatement.total_debit || 0).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <input
              type="number"
              className="input font-bold text-indigo-900 text-lg bg-white"
              placeholder="जितना आपका मन हो उतना भरें (e.g. 1000, 5000)"
              min="0"
              value={form.repayment_amount}
              onChange={e => setForm({ ...form, repayment_amount: e.target.value })}
            />
            <p className="text-[11px] text-slate-600 mt-1">
              💡 यदि आपने पहले कमिटी उठाई है, तो इस महीने जितना पैसा लौटाना चाहते हैं दर्ज करें (यह आपके बकाये से तुरंत कम हो जाएगा)।
            </p>
          </div>

          {/* Total Payable Highlight Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-50 to-emerald-50 border border-emerald-300 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                💰 कुल देय राशि (Total Payable Amount)
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                (किश्त: ₹{installment.toLocaleString('en-IN')} + फाइन: ₹{fine.toLocaleString('en-IN')} + उठाया वापसी: ₹{repayment.toLocaleString('en-IN')})
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                ₹ {totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Reference / UTR */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              🔢 Transaction ID / UTR / Reference No.
            </label>
            <input
              type="text"
              className="input font-mono text-sm"
              placeholder="e.g. 428719283749"
              value={form.reference_no}
              onChange={e => setForm({ ...form, reference_no: e.target.value })}
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              📸 Payment Screenshot (स्क्रीनशॉट) *
            </label>
            <div
              className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-slate-50/50"
              onClick={() => document.getElementById('screenshot').click()}
            >
              {preview ? (
                <img src={preview} alt="Screenshot" className="max-h-52 mx-auto rounded-xl object-contain shadow-md" />
              ) : (
                <div className="text-slate-400 py-3">
                  <div className="text-4xl mb-1">📷</div>
                  <p className="text-sm font-bold text-slate-700">पेमेंट का स्क्रीनशॉट यहाँ अपलोड करें</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP — क्लिक करें</p>
                </div>
              )}
              <input id="screenshot" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {preview && (
              <button
                type="button"
                onClick={() => { setScreenshot(null); setPreview(null) }}
                className="text-rose-600 text-xs mt-1.5 hover:underline font-bold"
              >
                ✕ दूसरा स्क्रीनशॉट चुनें
              </button>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">📝 Note (टिप्पणी / संदेश)</label>
            <textarea
              className="input text-sm"
              placeholder="कोई टिप्पणी या मैसेज (वैकल्पिक)..."
              rows={2}
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? '⏳ सबमिट हो रहा है...' : `✅ ₹ ${totalPayable.toLocaleString('en-IN')} पेमेंट सबमिट करें`}
          </button>
        </form>
      </div>

      {/* QR Code & UPI Details Box */}
      <div className="card bg-gradient-to-br from-emerald-50 via-white to-green-50 border border-emerald-200 shadow-sm space-y-4">
        <div className="text-center">
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2">
            📲 Scan & Pay (ऑनलाइन भुगतान)
          </span>
          <h2 className="text-xl font-black text-slate-900">
            कमेटी का पैसा इस QR या UPI पर भेजें
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            खाता धारक: <span className="font-bold text-slate-800">{paymentConfig.upi_name}</span>
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
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block text-center">
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
              className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <span>⚡</span> UPI App से सीधे Pay करें (GPay / PhonePe / Paytm)
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
          <p className="font-bold text-emerald-900 mb-1">📌 पेमेंट करने का तरीका:</p>
          <p>1. ऊपर दिया गया QR कोड स्कैन करें या UPI ID पर पेमेंट करें।</p>
          <p>2. पेमेंट सफल होने के बाद उसका <strong>Screenshot</strong> लें।</p>
          <p>3. ऊपर वाले फॉर्म में किश्त, लेट फाइन और उठाया वापसी दर्ज करें, स्क्रीनशॉट अपलोड कर <strong>"पेमेंट सबमिट करें"</strong> दबाएं।</p>
          
          <div className="pt-1 border-t border-emerald-200/60">
            <a
              href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <span>💬</span> आधिकारिक कमिटी व्हाट्सएप ग्रुप से जुड़ें
            </a>
          </div>
        </div>
      </div>

    </div>
  )
}