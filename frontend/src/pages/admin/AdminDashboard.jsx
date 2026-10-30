import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [pendingPayments, setPendingPayments] = useState([])
  const [pendingMembers, setPendingMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Direct Payment Approval Modal on Dashboard
  const [selectedImg, setSelectedImg] = useState(null)
  const [paymentActionModal, setPaymentActionModal] = useState(null) // payment object
  const [lateFine, setLateFine] = useState('0')
  const [adminNote, setAdminNote] = useState('')

  const loadAllData = () => {
    Promise.all([
      api.get('/committee/summary'),
      api.get('/payments/pending'),
      api.get('/members/pending-registrations')
    ]).then(([s, p, m]) => {
      setSummary(s.data.data)
      setPendingPayments(p.data.data || [])
      setPendingMembers(m.data.data || [])
    }).catch(err => console.error(err))
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAllData()
    api.get('/settings').then(res => {
      if (res.data?.data?.default_late_fine) {
        setLateFine(res.data.data.default_late_fine)
      }
    }).catch(() => {})
  }, [])

  // Member Registration Handlers
  const handleApproveMember = async (id, name) => {
    setActionLoading(true)
    try {
      await api.put(`/members/${id}/approve-registration`)
      toast.success(`${name} का अकाउंट अप्रूव हो गया! ✅`)
      loadAllData()

      const msg = `🎉 *MERA KAMETI — नया सदस्य जुड़ा!* 🎉\n━━━━━━━━━━━━━━━━━━━━\n👤 सदस्य: *${name}*\nस्टेटस: ✅ अप्रूव हो चुके हैं!\n━━━━━━━━━━━━━━━━━━━━\n👉 कमिटी पोर्टल: https://merakameti.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (err) {
      toast.error(err.response?.data?.error || 'अप्रूव नहीं हो पाया।')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectMember = async (id, name) => {
    if (!confirm(`क्या आप ${name} का रजिस्ट्रेशन रिजेक्ट करना चाहते हैं?`)) return
    setActionLoading(true)
    try {
      await api.put(`/members/${id}/reject-registration`)
      toast.success(`${name} का रजिस्ट्रेशन रिजेक्ट कर दिया गया।`)
      loadAllData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'त्रुटि आई।')
    } finally {
      setActionLoading(false)
    }
  }

  // Payment Approval Handlers Directly on Dashboard
  const handleConfirmApprovePayment = async () => {
    if (!paymentActionModal) return
    setActionLoading(true)
    const p = paymentActionModal
    try {
      const fineVal = parseFloat(lateFine || 0)
      await api.put(`/payments/${p.id}/approve`, {
        admin_note: adminNote,
        late_fine: fineVal
      })
      toast.success(`₹${p.amount} का पेमेंट अप्रूव हो गया! ✅`)

      // Auto-dispatch receipt to WhatsApp group
      const repVal = parseFloat(p.repayment_amount || 0)
      const fineMsg = fineVal > 0 ? `\n⚡ लेट फाइन: ₹${fineVal}` : ''
      const repMsg = repVal > 0 ? `\n🔄 उठाया पैसा वापसी: ₹${repVal}` : ''
      const total = (parseFloat(p.amount) || 0) + fineVal + repVal
      const msg = `✅ *MERA KAMETI — पेमेंट रसीद स्वीकृत!* ✅\n━━━━━━━━━━━━━━━━━━━━\n👤 सदस्य: *${p.member_name}*\n💵 किश्त जमा: ₹${p.amount}${repMsg}${fineMsg}\n💰 कुल भुगतान: ₹${total}\n📅 महीना: ${MONTH_NAMES[p.month]} ${p.year}\nस्टेटस: स्वीकृत (Approved)\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://merakameti.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')

      setPaymentActionModal(null)
      setLateFine('0')
      setAdminNote('')
      loadAllData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'पेमेंट अप्रूव नहीं हो सका।')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectPayment = async (p) => {
    const reason = window.prompt(`❌ ${p.member_name} का पेमेंट रिजेक्ट करने का कारण लिखें:`, 'स्क्रीनशॉट सही नहीं है / रेफरेंस नंबर मैच नहीं हुआ')
    if (reason === null) return
    setActionLoading(true)
    try {
      await api.put(`/payments/${p.id}/reject`, { admin_note: reason })
      toast.success('पेमेंट रिजेक्ट कर दिया गया।')
      loadAllData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'त्रुटि आई।')
    } finally {
      setActionLoading(false)
    }
  }

  const [downloading, setDownloading] = useState(false)

  const handleDownloadJsonBackup = async () => {
    setDownloading(true)
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
      setDownloading(false)
    }
  }

  const handleDownloadDbBackup = async () => {
    setDownloading(true)
    const toastId = toast.loading('डेटाबेस फ़ाइल (.db) तैयार हो रही है...')
    try {
      const res = await api.get('/reports/download-db', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `kameti-backup-${new Date().toISOString().slice(0, 10)}.db`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('डेटाबेस फ़ाइल (.db) डाउनलोड हो गई! 💾', { id: toastId })
    } catch (err) {
      toast.error('डेटाबेस डाउनलोड विफल: ' + (err.response?.data?.error || err.message), { id: toastId })
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  )

  const now = new Date()

  const broadcastMonthlyReport = () => {
    if (!summary) return
    const msg = `📊 *MERA KAMETI — चालू माह स्थिति (${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()})* 📊\n━━━━━━━━━━━━━━━━━━━━\n🟢 कुल जमा किश्तें: ₹${summary.overallTotalCredit?.toLocaleString('en-IN') || 0}\n🔴 कुल उठाया गया: ₹${summary.overallTotalDebit?.toLocaleString('en-IN') || 0}\n👥 इस माह किश्त जमा सदस्य: ${summary.paidMembers}/${summary.totalMembers}\n🏆 इस माह का विनर: ${summary.winner ? summary.winner.winner_name : 'तय नहीं'}\n━━━━━━━━━━━━━━━━━━━━\n👉 कमिटी पोर्टल पर देखें: https://merakameti.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const broadcastWinner = () => {
    if (!summary?.winner) {
      toast('इस महीने का कोई विनर अभी सेट नहीं है। विनर पेज पर जाकर सेट करें।', { icon: 'ℹ️' })
      return
    }
    const msg = `🏆 *MERA KAMETI — विनर घोषणा!* 🏆\n━━━━━━━━━━━━━━━━━━━━\n🎉 मुबारक हो! *${summary.winner.winner_name}* ने ${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()} की कमिटी उठाई है!\n💰 उठाया गया पेआउट: ₹${(summary.winner.payout_amount || summary.winner.total_collected)?.toLocaleString('en-IN')}\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://merakameti.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const broadcastInvite = () => {
    const msg = `🤝 *MERA KAMETI (मेरा कमिटी) में आपका स्वागत है!* 🤝\n━━━━━━━━━━━━━━━━━━━━\nसभी कमिटी सदस्यों से अनुरोध है कि अपनी किश्त समय पर जमा करें और लाइव खाता बही पोर्टल पर देखें:\n\n🌐 पोर्टल लिंक: https://merakameti.up.railway.app\n💬 आधिकारिक व्हाट्सएप ग्रुप: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2\n━━━━━━━━━━━━━━━━━━━━\n- कमिटी प्रबंधन`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Modern Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-2xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/20 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Admin Control Panel 🔐
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              कमिटी प्रबंधन डैशबोर्ड
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              {MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — संपूर्ण खाता व मेम्बर्स मॉनिटरिंग
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/approvals"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <span>✅</span> अप्रूवल्स पेज
              {pendingPayments.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                  {pendingPayments.length}
                </span>
              )}
            </Link>
            <Link
              to="/admin/ledger"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-600 flex items-center gap-2"
            >
              <span>📖</span> पूरा खाता बही
            </Link>
          </div>
        </div>
      </div>

      {/* TOP PRIORITY: PENDING PAYMENTS ALERT BOX (DIRECT APPROVAL) */}
      {pendingPayments.length > 0 && (
        <div className="card bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-2 border-emerald-400 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-emerald-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-emerald-600/30 animate-bounce">
                💰
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    भुगतान अनुमोदन अनुरोध ({pendingPayments.length} पेंडिंग)
                  </h2>
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    APPROVE NOW
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  सदस्यों ने पैसे जमा किए हैं — स्क्रीनशॉट देखकर तुरंत नीचे दिए गए बटन से <strong>Approve</strong> करें
                </p>
              </div>
            </div>
            <Link
              to="/admin/approvals"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm"
            >
              पूरा अप्रूवल्स पेज खोलें →
            </Link>
          </div>

          <div className="space-y-3">
            {pendingPayments.map(p => {
              const repAmt = parseFloat(p.repayment_amount) || 0
              const fineAmt = parseFloat(p.late_fine) || 0
              const totalAmt = (parseFloat(p.amount) || 0) + repAmt + fineAmt

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-emerald-400 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">{p.member_name}</span>
                      <span className="text-xs text-slate-500 font-mono">📱 {p.member_phone}</span>
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {MONTH_NAMES[p.month]} {p.year}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-700 font-black text-lg">
                        ₹ {p.amount} (किश्त)
                      </span>
                      {repAmt > 0 && (
                        <span className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          🔄 +₹{repAmt} उठाया वापसी
                        </span>
                      )}
                      {fineAmt > 0 && (
                        <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          ⚡ +₹{fineAmt} लेट फाइन
                        </span>
                      )}
                      <span className="text-xs text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                        कुल: ₹{totalAmt.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-2 items-center">
                      <span>🔢 UTR / Ref: <strong className="font-mono text-slate-800">{p.reference_no || 'N/A'}</strong></span>
                      {p.note && <span>• 📝 "{p.note}"</span>}
                      <span className="text-slate-400">• समय: {new Date(p.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {p.screenshot_path ? (
                      <button
                        type="button"
                        onClick={() => setSelectedImg(p.screenshot_path)}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                      >
                        📸 स्क्रीनशॉट देखें
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">बिना स्क्रीनशॉट</span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentActionModal(p)
                        setLateFine(p.late_fine ? p.late_fine.toString() : '0')
                        setAdminNote('')
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black px-4 py-2 rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 transform hover:scale-105"
                    >
                      <span>✅</span> Approve करें
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectPayment(p)}
                      disabled={actionLoading}
                      className="bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending Member Registrations Alert Box (If any) */}
      {pendingMembers.length > 0 && (
        <div className="card bg-gradient-to-r from-amber-50/90 to-orange-50/90 border-amber-300 shadow-md space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏳</span>
              <div>
                <h3 className="font-extrabold text-amber-950 text-base">
                  नए सदस्य अप्रूवल अनुरोध ({pendingMembers.length} नए मेम्बर)
                </h3>
                <p className="text-xs text-amber-800">
                  ये सदस्य रजिस्टर कर चुके हैं लेकिन आपके अप्रूव करने तक लॉगिन नहीं कर सकते।
                </p>
              </div>
            </div>
            <span className="bg-amber-400 text-amber-950 text-xs px-2.5 py-1 rounded-full font-black animate-pulse">
              ACTION REQUIRED
            </span>
          </div>

          <div className="divide-y divide-amber-200/60 pt-1">
            {pendingMembers.map(m => (
              <div key={m.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                  <span className="text-xs text-slate-600 font-mono ml-2">📱 {m.phone}</span>
                  <span className="text-[11px] text-amber-800 block sm:inline sm:ml-2">
                    (पंजीकृत: {new Date(m.created_at).toLocaleDateString()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveMember(m.id, m.name)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                  >
                    ✓ Approve करें
                  </button>
                  <button
                    onClick={() => handleRejectMember(m.id, m.name)}
                    disabled={actionLoading}
                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Live Group Broadcast Center */}
      <div className="card bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 shadow-md space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-green-500/20">
              <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                व्हाट्सएप ग्रुप लाइव ब्रॉडकास्ट (Share to WhatsApp Group)
              </h3>
              <p className="text-xs text-slate-500">
                एक क्लिक में कमिटी की ताज़ा स्थिति और घोषणाएं आधिकारिक व्हाट्सएप ग्रुप में भेजें
              </p>
            </div>
          </div>

          <a
            href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
          >
            <svg className="w-3.5 h-3.5 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            ग्रुप लिंक खोलें
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-100">
          <button
            onClick={broadcastMonthlyReport}
            className="p-3 bg-white hover:bg-emerald-50 rounded-xl border border-emerald-200 text-left transition-all shadow-sm flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-xs text-slate-800 block">📊 चालू माह रिपोर्ट भेजें</span>
              <span className="text-[11px] text-slate-500">कुल जमा, किश्तें व विनर स्थिति</span>
            </div>
            <span className="text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={broadcastWinner}
            className="p-3 bg-white hover:bg-amber-50 rounded-xl border border-amber-200 text-left transition-all shadow-sm flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-xs text-slate-800 block">🏆 विनर घोषणा भेजें</span>
              <span className="text-[11px] text-slate-500">
                {summary?.winner ? summary.winner.winner_name : 'इस माह का विनर'}
              </span>
            </div>
            <span className="text-amber-600 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={broadcastInvite}
            className="p-3 bg-white hover:bg-blue-50 rounded-xl border border-blue-200 text-left transition-all shadow-sm flex items-center justify-between group"
          >
            <div>
              <span className="font-bold text-xs text-slate-800 block">📲 पोर्टल व ग्रुप लिंक शेयर करें</span>
              <span className="text-[11px] text-slate-500">मेम्बर्स को लॉग इन करने का आमंत्रण</span>
            </div>
            <span className="text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>

      {/* Credit, Debit & Net Fund High-End Widgets */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border-emerald-200/80">
            <div className="flex justify-between items-center text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
              <span>कुल जमा (Total Credit)</span>
              <span className="text-lg">🟢</span>
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-2">
              ₹ {summary.overallTotalCredit?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">
              सभी सदस्यों का कुल जमा फंड
            </div>
          </div>

          <div className="card bg-gradient-to-br from-rose-50/90 to-red-50/70 border-rose-200/80">
            <div className="flex justify-between items-center text-xs font-extrabold text-rose-800 uppercase tracking-wider">
              <span>कुल उठाया (Total Debit)</span>
              <span className="text-lg">🔴</span>
            </div>
            <div className="text-3xl font-black text-rose-700 mt-2">
              ₹ {summary.overallTotalDebit?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-xs text-rose-600 font-medium mt-1">
              कमेटी विनर को दी गई कुल राशि
            </div>
          </div>

          <div className="card bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border-indigo-200/80">
            <div className="flex justify-between items-center text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
              <span>तिजोरी शेष (Net Balance)</span>
              <span className="text-lg">💼</span>
            </div>
            <div className="text-3xl font-black text-indigo-700 mt-2">
              ₹ {summary.overallNetBalance?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
              {summary.overallTotalLateFine > 0 && `(लेट फाइन: ₹${summary.overallTotalLateFine}) • `}
              <Link to="/admin/ledger" className="underline font-bold hover:text-indigo-900">
                खाता बही देखें →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Operations Grid */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="card text-center p-4">
            <span className="text-2xl block mb-1">👥</span>
            <div className="text-2xl font-black text-slate-800">{summary.totalMembers}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">सक्रिय सदस्य</div>
          </div>

          <div className="card text-center p-4">
            <span className="text-2xl block mb-1">💰</span>
            <div className="text-2xl font-black text-emerald-600">₹ {summary.totalCollected?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">इस माह जमा</div>
          </div>

          <div className="card text-center p-4">
            <span className="text-2xl block mb-1">⏳</span>
            <div className="text-2xl font-black text-amber-600">{summary.pendingCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">पेंडिंग पेमेंट्स</div>
          </div>

          <div className="card text-center p-4">
            <span className="text-2xl block mb-1">🏆</span>
            <div className="text-base font-black text-yellow-600 truncate">
              {summary.winner ? summary.winner.winner_name : 'घोषित नहीं'}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">इस माह का विनर</div>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Tiles */}
      <div>
        <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-3">
          ⚡ त्वरित एक्शन (Quick Actions)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Link to="/admin/approvals" className="card p-4 text-center card-hover group border-amber-200/80 bg-amber-50/30">
            <div className="text-2xl group-hover:scale-110 transition-transform">✅</div>
            <div className="text-xs font-bold text-slate-900 mt-2">पेमेंट अप्रूव</div>
            {summary?.pendingCount > 0 && (
              <span className="inline-block bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black mt-1 animate-pulse">
                {summary.pendingCount} पेंडिंग
              </span>
            )}
          </Link>

          <Link to="/admin/ledger" className="card p-4 text-center card-hover group border-emerald-200/80 bg-emerald-50/30">
            <div className="text-2xl group-hover:scale-110 transition-transform">📖</div>
            <div className="text-xs font-bold text-slate-900 mt-2">खाता बही</div>
            <span className="text-[10px] text-emerald-700 font-medium">Credit/Debit</span>
          </Link>

          <Link to="/pay" className="card p-4 text-center card-hover group border-teal-200/80 bg-teal-50/30">
            <div className="text-2xl group-hover:scale-110 transition-transform">💸</div>
            <div className="text-xs font-bold text-slate-900 mt-2">अपनी किश्त</div>
            <span className="text-[10px] text-teal-700 font-medium">Admin Payment</span>
          </Link>

          <Link to="/admin/committee" className="card p-4 text-center card-hover group border-yellow-200/80 bg-yellow-50/30">
            <div className="text-2xl group-hover:scale-110 transition-transform">🏆</div>
            <div className="text-xs font-bold text-slate-900 mt-2">विनर चुनें</div>
            <span className="text-[10px] text-yellow-800 font-medium">कमिटी दें</span>
          </Link>

          <Link to="/admin/members" className="card p-4 text-center card-hover group border-purple-200/80 bg-purple-50/30">
            <div className="text-2xl group-hover:scale-110 transition-transform">👥</div>
            <div className="text-xs font-bold text-slate-900 mt-2">मेम्बर्स लिस्ट</div>
            {pendingMembers.length > 0 && (
              <span className="inline-block bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black mt-1">
                {pendingMembers.length} नए
              </span>
            )}
          </Link>

          <Link to="/admin/settings" className="card p-4 text-center card-hover group border-slate-300/80 bg-slate-50/50">
            <div className="text-2xl group-hover:scale-110 transition-transform">⚙️</div>
            <div className="text-xs font-bold text-slate-900 mt-2">सेटिंग्स</div>
            <span className="text-[10px] text-slate-600 font-medium">QR/Password</span>
          </Link>
        </div>
      </div>

      {/* High Priority: Complete Data Safety & One-Click Download Center */}
      <div className="card bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white border-2 border-emerald-500/40 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-white">
                डेटा सुरक्षा व बैकअप (Data Safety & Download)
              </h3>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                100% SAFE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              सभी सदस्यों के फोन नंबर, पासवर्ड और पेमेंट्स का पूरा डेटा सुरक्षित है। कभी भी 1-क्लिक में डाउनलोड करें।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleDownloadJsonBackup}
            disabled={downloading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
          >
            <span>📥</span> {downloading ? 'डाउनलोडिंग...' : 'डेटा डाउनलोड (JSON)'}
          </button>
          <button
            type="button"
            onClick={handleDownloadDbBackup}
            disabled={downloading}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-600 transition-all flex items-center gap-1.5"
          >
            <span>💾</span> {downloading ? 'डाउनलोडिंग...' : 'डेटाबेस फ़ाइल (.db)'}
          </button>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedImg && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedImg(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={selectedImg} alt="Payment Screenshot" className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-black" />
            <button
              onClick={() => setSelectedImg(null)}
              className="absolute top-3 right-3 bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center font-bold hover:bg-gray-100 shadow-lg text-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Payment Approval Modal */}
      {paymentActionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-300 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✅ भुगतान अनुमोदन (Confirm Payment)
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2">
                  {paymentActionModal.member_name}
                </h3>
                <p className="text-xs text-gray-500 font-mono">📱 {paymentActionModal.member_phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentActionModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">महीना:</span>
                <strong className="text-slate-900">{MONTH_NAMES[paymentActionModal.month]} {paymentActionModal.year}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">किश्त राशि:</span>
                <strong className="text-emerald-700 font-black text-sm">₹ {paymentActionModal.amount}</strong>
              </div>
              {paymentActionModal.repayment_amount > 0 && (
                <div className="flex justify-between text-indigo-700 font-bold">
                  <span>🔄 उठाया पैसा वापसी:</span>
                  <span>₹ {paymentActionModal.repayment_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-mono text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <span>Ref / UTR:</span>
                <span>{paymentActionModal.reference_no || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ⚡ लेट फाइन (Late Fine ₹)
              </label>
              <input
                type="number"
                min="0"
                className="input text-sm font-bold text-amber-800"
                placeholder="0"
                value={lateFine}
                onChange={e => setLateFine(e.target.value)}
              />
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                यदि सदस्य पर लेट फीस लगानी हो तो दर्ज करें (अन्यथा 0 रहने दें)।
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                📝 नोट / टिप्पणी (वैकल्पिक)
              </label>
              <textarea
                className="input text-sm"
                rows="2"
                placeholder="कोई टिप्पणी या संदेश..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentActionModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-50 transition-all"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovePayment}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                {actionLoading ? 'अप्रूव हो रहा है...' : '✅ Approve करें'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}