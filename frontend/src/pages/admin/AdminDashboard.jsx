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

  const loadAllData = () => {
    Promise.all([
      api.get('/committee/summary'),
      api.get('/payments/pending'),
      api.get('/members/pending-registrations')
    ]).then(([s, p, m]) => {
      setSummary(s.data.data)
      setPendingPayments(p.data.data.slice(0, 5))
      setPendingMembers(m.data.data)
    }).catch(err => console.error(err))
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleApproveMember = async (id, name) => {
    setActionLoading(true)
    try {
      await api.put(`/members/${id}/approve-registration`)
      toast.success(`${name} का अकाउंट अप्रूव हो गया! ✅`)
      loadAllData()

      // Automatically dispatch message to WhatsApp group
      const msg = `🎉 *MERA KAMETI — नया सदस्य जुड़ा!* 🎉\n━━━━━━━━━━━━━━━━━━━━\n👤 सदस्य: *${name}*\nस्टेटस: ✅ अप्रूव हो चुके हैं!\n━━━━━━━━━━━━━━━━━━━━\n👉 कमिटी पोर्टल: https://mera-kameti-app-production.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
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

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  )

  const now = new Date()

  const broadcastMonthlyReport = () => {
    if (!summary) return
    const msg = `📊 *MERA KAMETI — चालू माह स्थिति (${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()})* 📊\n━━━━━━━━━━━━━━━━━━━━\n🟢 कुल जमा किश्तें: ₹${summary.overallTotalCredit?.toLocaleString('en-IN') || 0}\n🔴 कुल उठाया गया: ₹${summary.overallTotalDebit?.toLocaleString('en-IN') || 0}\n👥 इस माह किश्त जमा सदस्य: ${summary.paidMembers}/${summary.totalMembers}\n🏆 इस माह का विनर: ${summary.winner ? summary.winner.winner_name : 'तय नहीं'}\n━━━━━━━━━━━━━━━━━━━━\n👉 कमिटी पोर्टल पर देखें: https://mera-kameti-app-production.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const broadcastWinner = () => {
    if (!summary?.winner) {
      toast('इस महीने का कोई विनर अभी सेट नहीं है। विनर पेज पर जाकर सेट करें।', { icon: 'ℹ️' })
      return
    }
    const msg = `🏆 *MERA KAMETI — विनर घोषणा!* 🏆\n━━━━━━━━━━━━━━━━━━━━\n🎉 मुबारक हो! *${summary.winner.winner_name}* ने ${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()} की कमिटी उठाई है!\n💰 उठाया गया पेआउट: ₹${(summary.winner.payout_amount || summary.winner.total_collected)?.toLocaleString('en-IN')}\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://mera-kameti-app-production.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const broadcastInvite = () => {
    const msg = `🤝 *MERA KAMETI (मेरा कमिटी) में आपका स्वागत है!* 🤝\n━━━━━━━━━━━━━━━━━━━━\nसभी कमिटी सदस्यों से अनुरोध है कि अपनी किश्त समय पर जमा करें और लाइव खाता बही पोर्टल पर देखें:\n\n🌐 पोर्टल लिंक: https://mera-kameti-app-production.up.railway.app\n💬 आधिकारिक व्हाट्सएप ग्रुप: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2\n━━━━━━━━━━━━━━━━━━━━\n- कमिटी प्रबंधन`
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
            <a
              href="https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2 shrink-0"
            >
              <span>💬</span> व्हाट्सएप ग्रुप
            </a>
            <Link
              to="/admin/ledger"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <span>📖</span> पूरा खाता बही खोलें
            </Link>
          </div>
        </div>
      </div>

      {/* WhatsApp Live Group Broadcast Center */}
      <div className="card bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 shadow-md space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-green-500/20">
              💬
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
            className="text-xs bg-[#25D366] hover:bg-[#20ba59] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
          >
            <span>💬</span> ग्रुप लिंक खोलें
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
              <span className="inline-block bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black mt-1">
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

      {/* Pending payments quick review list */}
      {pendingPayments.length > 0 && (
        <div className="card space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>⏳</span> भुगतान अनुमोदन का इंतज़ार ({pendingPayments.length})
            </h2>
            <Link to="/admin/approvals" className="text-emerald-700 text-xs font-bold hover:underline">
              सभी चेक करें →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200/80 transition-all">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{p.member_name}</span>
                  <span className="text-slate-500 text-xs ml-2 font-mono">₹{p.amount}</span>
                  <span className="text-[11px] text-slate-400 ml-2">({MONTH_NAMES[p.month]} {p.year})</span>
                </div>
                <Link to="/admin/approvals" className="btn-primary py-1.5 px-3 text-xs">
                  रिव्यू करें
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
