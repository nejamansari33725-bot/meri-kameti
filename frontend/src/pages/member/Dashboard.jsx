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
  const [loading, setLoading] = useState(true)

  // Payout application state ("मुझे इस महीने इतना पैसा चाहिए")
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
      api.get('/committee/my-payout-requests')
    ]).then(([s, p, me, pr]) => {
      setSummary(s.data.data)
      setRecentPayments(p.data.data.slice(0, 5))
      setMyPayoutRequests(pr.data.data || [])
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
      return toast.error('कृपया मांगी जाने वाली राशि (Amount) दर्ज करें।')
    }
    setSubmittingPayout(true)
    try {
      const res = await api.post('/committee/apply-payout', {
        month: applyMonth,
        year: applyYear,
        requested_amount: parseFloat(requestedAmount),
        reason: payoutReason
      })
      toast.success(res.data.message || 'आवेदन सबमिट हो गया! ✅')
      setRequestedAmount('')
      setPayoutReason('')
      api.get('/committee/my-payout-requests').then(r => setMyPayoutRequests(r.data.data || []))
    } catch (err) {
      toast.error(err.response?.data?.error || 'आवेदन सबमिट नहीं हो सका।')
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

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Official WhatsApp Group Invite Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-[#25D366] p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-emerald-400/30">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-inner">
            💬
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              OFFICIAL WHATSAPP GROUP
            </div>
            <h3 className="font-black text-base sm:text-xl tracking-tight">कमिटी व्हाट्सएप ग्रुप से जुड़ें</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              सभी किश्तों, विनर घोषणा और कमिटी सूचनाओं के लिए ग्रुप में जुड़े रहें
            </p>
          </div>
        </div>

        <a
          href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-emerald-900 hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 shrink-0 transform hover:scale-105"
        >
          <span>📲</span> ग्रुप में शामिल हों (Join Group) →
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
              सदस्य पोर्टल (Member Portal)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              खुशामदीद, {user?.name || 'सदस्य'}! 👋
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              {MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — आपकी कमिटी का लाइव विवरण
            </p>
          </div>

          <div className="pt-6 flex flex-wrap gap-2.5">
            <Link
              to="/pay"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <span>💳</span> किश्त / वापसी जमा करें
            </Link>
            <Link
              to="/ledger"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-600"
            >
              <span>📖</span> सबका खाता बही
            </Link>
            <Link
              to="/history"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-600"
            >
              <span>📜</span> मेरी पेमेंट्स
            </Link>
            <Link
              to="/profile"
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-600"
            >
              <span>👤</span> मेरी प्रोफ़ाइल
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
              title="प्रोफ़ाइल व पासवर्ड बदलें"
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
                <span>💳</span> आपका व्यक्तिगत कमिटी खाता (Your Personal Khata)
              </h2>
              <p className="text-xs text-slate-500">आपके द्वारा अब तक जमा की गई और उठाई गई कुल रकम</p>
            </div>
            <Link to="/history" className="text-emerald-700 text-xs font-bold hover:underline bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              पूरी रसीद हिस्ट्री देखें →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Credit Card */}
            <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">आपने जमा किया (Credit)</span>
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">↑</span>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                ₹ {myStatement.total_credit?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">कुल स्वीकृत किश्तें</p>
            </div>

            {/* Debit Card */}
            <div className="p-4 bg-gradient-to-br from-rose-500/10 via-rose-50 to-orange-50 rounded-2xl border border-rose-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">आपने उठाया (Debit)</span>
                <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">↓</span>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                ₹ {myStatement.total_debit?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                {myStatement.roundsWon?.length > 0 ? `🏆 ${myStatement.roundsWon.length} बार उठाया` : 'अभी नहीं उठाया'}
              </p>
            </div>

            {/* Net Balance Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">नेट स्थिति (Net Balance)</span>
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

      {/* NEW FEATURE: Payout Application Form / Bidding ("🙋‍♂️ मुझे इस महीने कमिटी का पैसा चाहिए") */}
      <div className="card shadow-lg border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              🙋‍♂️ कमिटी लेने के लिए आवेदन (Apply for Committee Payout / Bid)
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-2">
              क्या आपको इस महीने कमिटी का पैसा उठाना है?
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
                📅 किस महीने के लिए?
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
                📅 वर्ष (Year)
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
                💰 मुझे इतना पैसा चाहिए (Amount ₹) *
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
              📝 कारण या आवश्यकता (Reason / Note)
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
              💡 एडमिन इस आवेदन को देखकर इस माह का विनर चुनेंगे।
            </span>
            <button
              type="submit"
              disabled={submittingPayout}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5"
            >
              {submittingPayout ? 'भेज रहे हैं...' : '🙋‍♂️ कमिटी लेने के लिए आवेदन सबमिट करें'}
            </button>
          </div>
        </form>

        {/* Existing Application List */}
        {myPayoutRequests.length > 0 && (
          <div className="pt-3 border-t border-amber-200/60">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              📋 आपके पिछले आवेदन (Your Applications):
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
                    {r.status === 'approved' ? '🏆 स्वीकृत (Won)' : '⏳ समीक्षाधीन (Pending)'}
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
            <span>📅</span> चालू माह भुगतान स्थिति ({MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()})
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
                    thisMonthPayment.status === 'approved' ? 'किश्त स्वीकृत (Payment Approved)!' :
                    thisMonthPayment.status === 'pending' ? 'एडमिन अप्रूवल का इंतज़ार है (Under Review)...' :
                    'किश्त अस्वीकृत (Rejected)'
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
                <p className="font-bold text-amber-900">इस महीने की किश्त अभी जमा नहीं हुई है</p>
                <p className="text-xs text-amber-700">कृपया लेट फीस से बचने के लिए समय पर UPI से भुगतान कर स्लिप अपलोड करें।</p>
              </div>
            </div>
            <Link
              to="/pay"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5"
            >
              <span>📲</span> UPI से भुगतान करें
            </Link>
          </div>
        )}
      </div>

      {/* Committee Overall Summary (Transparency for all members) */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-emerald-700">₹ {summary.overallTotalCredit?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">🟢 कमिटी कुल जमा</div>
          </div>
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-rose-600">₹ {summary.overallTotalDebit?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">🔴 कमिटी कुल भुगतान</div>
          </div>
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-blue-600">{summary.paidMembers}/{summary.totalMembers}</div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">इस माह जमा सदस्य</div>
          </div>
          <div className="card text-center border border-slate-100 shadow-sm">
            <div className="text-lg sm:text-xl font-black text-amber-600 truncate">
              {summary.winner ? `🏆 ${summary.winner.winner_name}` : '⏳ तय नहीं'}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">इस माह का विनर</div>
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
            सब देखें →
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-4xl block mb-2">🧾</span>
            <p className="text-sm">कोई पेमेंट रिकॉर्ड नहीं मिला।</p>
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