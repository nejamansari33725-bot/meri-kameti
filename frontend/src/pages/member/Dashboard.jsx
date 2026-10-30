import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function MemberDashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [summary, setSummary] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [myStatement, setMyStatement] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Payout application state ("मुझे इस महीने इतना पैसा चाहिए / Payout Bid")
  const [applyMonth, setApplyMonth] = useState(now.getMonth() + 1)
  const [applyYear, setApplyYear] = useState(now.getFullYear())
  const [requestedAmount, setRequestedAmount] = useState('')
  const [payoutReason, setPayoutReason] = useState('')
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [myPayoutRequests, setMyPayoutRequests] = useState([])

  const loadData = () => {
    Promise.all([
      api.get('/committee/summary'),
      api.get('/payments/my'),
      api.get('/auth/me'),
      api.get('/committee/my-payout-requests'),
      api.get('/notifications').catch(() => ({ data: { data: [] } }))
    ]).then(([s, p, me, pr, notifRes]) => {
      setSummary(s.data.data)
      setRecentPayments(p.data.data.slice(0, 5))
      setMyPayoutRequests(pr.data.data || [])
      setNotifications(notifRes.data?.data || [])
      if (me.data?.data?.id) {
        return api.get(`/members/${me.data.data.id}/statement`)
      }
    }).then(stmtRes => {
      if (stmtRes?.data?.data) {
        setMyStatement(stmtRes.data.data)
      }
    }).catch(err => console.error(err))
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApplyPayout = async (e) => {
    e.preventDefault()
    if (!requestedAmount || parseFloat(requestedAmount) <= 0) {
      return toast.error('कृपया मांगी जाने वाली राशि दर्ज करें / Please enter requested amount.')
    }
    setSubmittingPayout(true)
    try {
      const res = await api.post('/committee/apply-payout', {
        month: applyMonth,
        year: applyYear,
        requested_amount: parseFloat(requestedAmount),
        reason: payoutReason
      })
      toast.success(res.data.message || 'आवेदन सबमिट हो गया! / Application submitted! ✅')
      setRequestedAmount('')
      setPayoutReason('')
      api.get('/committee/my-payout-requests').then(r => setMyPayoutRequests(r.data.data || []))
    } catch (err) {
      toast.error(err.response?.data?.error || 'आवेदन सबमिट नहीं हो सका / Application failed.')
    } finally {
      setSubmittingPayout(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  )

  const thisMonthPayment = recentPayments.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear())
  const thisMonthRequest = myPayoutRequests.find(r => r.month === applyMonth && r.year === applyYear)
  const lateFineNotifs = notifications.filter(n => n.type === 'late_fine')

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Active Late Fine Due Alert Banner - ONLY SHOWS WHEN MEMBER ACTUALLY HAS LATE FINE DUE > 0 */}
      {Boolean(myStatement?.late_fine_due > 0) && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 p-4 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-amber-300 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce shrink-0">⚠️</span>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-black/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
                LATE FINE DUE / लेट फाइन बकाया
              </div>
              <h4 className="font-extrabold text-sm sm:text-base">
                एडमिन द्वारा ₹{myStatement.late_fine_due} का लेट फाइन लगाया गया है!
              </h4>
              <p className="text-xs text-amber-100 mt-0.5">
                {myStatement?.unpaid_fines?.[0]?.reason 
                  ? `नोट / कारण: "${myStatement.unpaid_fines[0].reason}"` 
                  : 'एडमिन द्वारा लेट फाइन दर्ज किया गया है।'}
                {' '}कृपया Pay पेज पर जाकर इसे जमा करें।
              </p>
            </div>
          </div>
          <Link
            to="/pay"
            className="bg-white text-rose-950 hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all shrink-0 flex items-center gap-1"
          >
            💳 लेट फाइन जमा करें (Pay Due) →
          </Link>
        </div>
      )}

      {/* Official WhatsApp Group Invite Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#25D366] p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-emerald-400/30">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              OFFICIAL WHATSAPP GROUP
            </div>
            <h3 className="font-black text-base sm:text-xl tracking-tight">कमिटी व्हाट्सएप ग्रुप / WhatsApp Group</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              सभी किश्तों, विनर घोषणा और सूचनाओं के लिए ग्रुप में जुड़े रहें
            </p>
          </div>
        </div>

        <a
          href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-emerald-900 hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 shrink-0 transform hover:scale-105"
        >
          <span>📲</span> ग्रुप में शामिल हों / Join Group →
        </a>
      </div>

      {/* Top Welcome & Digital Membership Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Welcome & Quick Navigation */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-7 text-white shadow-xl border border-slate-700/50 flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              सदस्य पोर्टल / Member Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              खुशामदीद / Welcome, {user?.name || 'सदस्य'}! 👋
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              {MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — आपकी कमिटी का लाइव विवरण / Live Status
            </p>
          </div>

          <div className="pt-6 flex flex-wrap gap-2.5">
            <Link
              to="/pay"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <span>💳</span> किश्त व वापसी जमा करें / Pay Now
            </Link>
            <Link
              to="/history"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-600"
            >
              <span>📜</span> मेरी पेमेंट्स / My Payments
            </Link>
            <Link
              to="/ledger"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-600"
            >
              <span>📖</span> सबका खाता बही / Khata
            </Link>
            <Link
              to="/profile"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-600"
            >
              <span>👤</span> मेरी प्रोफ़ाइल / Profile
            </Link>
          </div>
        </div>

        {/* Digital Member Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-emerald-800 via-teal-700 to-emerald-600 p-6 text-white shadow-xl border border-emerald-500/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold">Mera Kameti Card</p>
              <p className="text-base font-extrabold tracking-wide mt-0.5">मेरा कमिटी पासबुक</p>
            </div>
            <Link
              to="/profile"
              className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs tracking-wider backdrop-blur-sm transition-all"
              title="प्रोफ़ाइल व पासवर्ड बदलें / Edit Profile"
            >
              EDIT ⚙️
            </Link>
          </div>

          {/* Chip and Details */}
          <div className="my-4">
            <div className="w-10 h-7 rounded-md bg-amber-300/80 border border-amber-200 shadow-inner flex items-center justify-center">
              <div className="w-8 h-4 border border-amber-500/50 rounded-sm grid grid-cols-2"></div>
            </div>
          </div>

          <div>
            <p className="text-xs text-emerald-100 font-medium tracking-wider">MEMBER NAME</p>
            <p className="text-lg font-bold uppercase tracking-wider truncate">{user?.name || 'MEMBER'}</p>
            <div className="flex justify-between items-center text-xs text-emerald-200 mt-2 pt-2 border-t border-emerald-500/40">
              <span>📱 {user?.phone}</span>
              <span>ID: #{user?.id || '---'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Member's Personal Credit & Debit Overview */}
      {myStatement && (
        <div className="card border border-emerald-100/70 shadow-lg bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/20">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>💳</span> आपका व्यक्तिगत कमिटी खाता (Your Personal Passbook)
              </h2>
              <p className="text-xs text-slate-500">आपके द्वारा जमा की गई और उठाई गई कुल रकम का हिसाब</p>
            </div>
            <Link to="/history" className="text-emerald-700 text-xs font-bold hover:underline bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              पूरी रसीद हिस्ट्री / All Receipts →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {/* Credit Card */}
            <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">कुल जमा / Total Credit</span>
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">↑</span>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                ₹ {myStatement.total_credit?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">स्वीकृत किश्तें / Approved</p>
            </div>

            {/* Debit Card */}
            <div className="p-4 bg-gradient-to-br from-rose-500/10 via-rose-50 to-orange-50 rounded-2xl border border-rose-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">कुल उठाया / Total Debit</span>
                <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">↓</span>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                ₹ {myStatement.total_debit?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                {myStatement.roundsWon?.length > 0 ? `🏆 ${myStatement.roundsWon.length} बार उठाया` : 'अभी नहीं उठाया'}
              </p>
            </div>

            {/* Late Fine Card */}
            <div className={`p-4 rounded-2xl border shadow-sm ${
              myStatement.late_fine_due > 0 
                ? 'bg-gradient-to-br from-rose-500/10 via-amber-50 to-rose-50 border-rose-300' 
                : 'bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">लेट फाइन / Late Fine</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                  myStatement.late_fine_due > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-700'
                }`}>
                  {myStatement.late_fine_due > 0 ? '⚠️' : '⚡'}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-700">
                    ₹ {myStatement.late_fine_due?.toLocaleString('en-IN') || 0}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                    बकाया (Due)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  कुल जमा फाइन: ₹{myStatement.total_late_fine?.toLocaleString('en-IN') || 0}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200/60">
                {myStatement.late_fine_due > 0 ? (
                  <Link to="/pay" className="inline-flex items-center gap-1 text-xs font-black text-rose-700 hover:text-rose-900 bg-rose-100/70 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors">
                    <span>💳</span> अभी जमा करें / Pay Due →
                  </Link>
                ) : (
                  <span className="text-[11px] text-emerald-600 font-semibold">✓ कोई जुर्माना बकाया नहीं</span>
                )}
              </div>
            </div>

            {/* Net Balance Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">नेट स्थिति / Net Balance</span>
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">⚖️</span>
              </div>
              <p className={`text-2xl font-black mt-2 ${
                myStatement.net_balance >= 0 ? 'text-indigo-700' : 'text-rose-700'
              }`}>
                ₹ {myStatement.net_balance?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[11px] text-indigo-600 mt-1 font-medium">
                {myStatement.net_balance >= 0 ? 'आप कमिटी में जमाकर्ता हैं' : 'आपने कमिटी उठा ली है'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout Application Form / Bidding */}
      <div className="card shadow-lg border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              🙋‍♂️ कमिटी लेने के लिए आवेदन (Apply for Committee Payout / Bid)
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-2">
              क्या आपको इस महीने कमिटी का पैसा उठाना है? / Need Funds This Month?
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              अपनी इच्छित रकम और कारण दर्ज करके एडमिन को भेजें। एडमिन विनर चुनते समय आपका आवेदन देखेगा।
            </p>
          </div>
          {thisMonthRequest && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold">
              ⏳ आवेदन सबमिट है: ₹{thisMonthRequest.requested_amount?.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <form onSubmit={handleApplyPayout} className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📅 किस महीने के लिए? / Month
              </label>
              <select
                className="input text-sm font-semibold"
                value={applyMonth}
                onChange={e => setApplyMonth(parseInt(e.target.value))}
              >
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                📅 वर्ष / Year
              </label>
              <select
                className="input text-sm font-semibold"
                value={applyYear}
                onChange={e => setApplyYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                💰 मुझे इतना पैसा चाहिए / Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input font-bold text-amber-950 text-base"
                placeholder="e.g. 25000, 50000"
                value={requestedAmount}
                onChange={e => setRequestedAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              📝 कारण या आवश्यकता / Reason (Optional)
            </label>
            <input
              type="text"
              className="input text-sm"
              placeholder="e.g. व्यापार / घर का खर्च / जरूरी कार्य के लिए..."
              value={payoutReason}
              onChange={e => setPayoutReason(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs text-slate-500">
              💡 एडमिन इस आवेदन को देखकर इस माह का विनर चुनेंगे / Admin reviews bids to declare winner.
            </span>
            <button
              type="submit"
              disabled={submittingPayout}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5"
            >
              {submittingPayout ? 'भेज रहे हैं...' : '🙋‍♂️ आवेदन सबमिट करें / Submit Bid'}
            </button>
          </div>
        </form>

        {/* Existing Application List */}
        {myPayoutRequests.length > 0 && (
          <div className="pt-3 border-t border-amber-200/60">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              📋 आपके पिछले आवेदन / Your Applications:
            </p>
            <div className="space-y-1.5">
              {myPayoutRequests.slice(0, 3).map(r => (
                <div key={r.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{MONTH_NAMES[r.month]} {r.year}</span>
                    <span className="text-amber-800 font-extrabold ml-2">₹ {r.requested_amount?.toLocaleString('en-IN')}</span>
                    {r.reason && <span className="text-slate-500 ml-2">({r.reason})</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.status === 'approved' ? '🏆 स्वीकृत / Won' : '⏳ समीक्षाधीन / Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* This Month's Payment Status */}
      <div className="card shadow-lg border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span>📅</span> चालू माह भुगतान स्थिति / Payment Status ({MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()})
          </h2>
        </div>

        {thisMonthPayment ? (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
            thisMonthPayment.status === 'approved' 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : thisMonthPayment.status === 'pending' 
              ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {thisMonthPayment.status === 'approved' ? '✅' : thisMonthPayment.status === 'pending' ? '⏳' : '❌'}
              </span>
              <div>
                <p className="font-extrabold text-base">
                  ₹ {thisMonthPayment.amount?.toLocaleString('en-IN')} — {
                    thisMonthPayment.status === 'approved' ? 'किश्त स्वीकृत / Payment Approved!' :
                    thisMonthPayment.status === 'pending' ? 'एडमिन अप्रूवल का इंतज़ार है / Under Review...' :
                    'किश्त अस्वीकृत / Rejected'
                  }
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  रेफरेंस: <span className="font-mono font-bold">{thisMonthPayment.reference_no || 'N/A'}</span>
                  {thisMonthPayment.repayment_amount > 0 && ` • उठाया वापसी: ₹${thisMonthPayment.repayment_amount}`}
                  {thisMonthPayment.admin_note && ` • नोट: ${thisMonthPayment.admin_note}`}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                thisMonthPayment.status === 'approved' ? 'bg-emerald-600 text-white' :
                thisMonthPayment.status === 'pending' ? 'bg-amber-600 text-white' :
                'bg-rose-600 text-white'
              }`}>
                {thisMonthPayment.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💸</span>
              <div>
                <p className="font-bold text-amber-900">इस महीने की किश्त अभी जमा नहीं हुई है / Installment Pending</p>
                <p className="text-xs text-amber-700">समय पर UPI से भुगतान कर स्लिप अपलोड करें और लेट फीस से बचें।</p>
              </div>
            </div>
            <Link
              to="/pay"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5"
            >
              <span>📲</span> UPI से भुगतान करें / Pay
            </Link>
          </div>
        )}
      </div>

      {/* Committee Overall Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-emerald-700">₹ {summary.overallTotalCredit?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">🟢 कुल जमा / Total Credit</div>
          </div>
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-rose-600">₹ {summary.overallTotalDebit?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">🔴 कुल भुगतान / Total Debit</div>
          </div>
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-blue-600">{summary.paidMembers}/{summary.totalMembers}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">इस माह जमा / Paid Members</div>
          </div>
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-lg sm:text-xl font-black text-amber-600 truncate">
              {summary.winner ? `🏆 ${summary.winner.winner_name}` : '⏳ तय नहीं'}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">इस माह का विनर / Winner</div>
          </div>
        </div>
      )}

      {/* Recent Payments Stream */}
      <div className="card shadow-lg border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> आपकी हालिया पेमेंट्स (Recent Payments)
          </h2>
          <Link to="/history" className="text-emerald-700 text-xs font-bold hover:underline">
            सब देखें / View All →
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">🧾</span>
            <p className="text-sm">कोई पेमेंट रिकॉर्ड नहीं मिला / No payments found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPayments.map(p => (
              <div key={p.id} className="py-3 flex justify-between items-center hover:bg-slate-50/60 px-2 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    ₹
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-sm">₹ {p.amount?.toLocaleString('en-IN')}</span>
                    {p.repayment_amount > 0 && (
                      <span className="text-xs text-indigo-700 font-bold ml-1.5">(+ ₹{p.repayment_amount} वापसी)</span>
                    )}
                    <span className="text-xs text-slate-500 ml-2">({MONTH_NAMES[p.month]} {p.year})</span>
                    <p className="text-[11px] text-slate-400 font-mono">Ref: {p.reference_no || 'N/A'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  p.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}