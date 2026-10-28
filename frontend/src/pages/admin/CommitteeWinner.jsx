import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function CommitteeWinner() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [members, setMembers] = useState([])
  const [rounds, setRounds] = useState([])
  const [payoutInput, setPayoutInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [membersRes, roundsRes] = await Promise.all([
        api.get(`/committee/members-status?month=${month}&year=${year}`),
        api.get('/committee/rounds')
      ])
      setMembers(membersRes.data.data)
      setRounds(roundsRes.data.data)
      
      const cr = roundsRes.data.data.find(r => r.month === month && r.year === year)
      if (cr) {
        setPayoutInput(cr.payout_amount || cr.total_collected || '')
      } else {
        setPayoutInput('')
      }
    } catch {
      toast.error('Data load nahi hua.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [month, year])

  const setWinner = async (memberId, memberName) => {
    setSaving(true)
    try {
      await api.post('/committee/rounds', {
        month, 
        year, 
        winner_user_id: memberId,
        payout_amount: payoutInput ? parseFloat(payoutInput) : null
      })
      toast.success(`🏆 ${memberName} ko winner set kar diya!`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error.')
    } finally {
      setSaving(false)
    }
  }

  const currentRound = rounds.find(r => r.month === month && r.year === year)
  const totalThisMonthPaid = members.reduce((sum, m) => sum + (m.amount ? parseFloat(m.amount) : 0), 0)

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Select month & Payout Amount */}
      <div className="card space-y-4">
        <h1 className="text-2xl font-bold text-primary-700">🏆 Committee Winner Select Karein</h1>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">महीना (Month)</label>
            <select className="input w-40" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">वर्ष (Year)</label>
            <select className="input w-28" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              उठाई जाने वाली राशि (Payout Amount ₹)
              <span className="text-xs text-gray-400 font-normal ml-1">
                (कुल जमा: ₹{totalThisMonthPaid.toLocaleString('en-IN')})
              </span>
            </label>
            <input
              type="number"
              className="input"
              placeholder={`₹ ${totalThisMonthPaid || 'कुल जमा'}`}
              value={payoutInput}
              onChange={e => setPayoutInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Current winner */}
      {currentRound?.winner_name && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🏆</span>
            <div>
              <p className="font-black text-yellow-950 text-xl">{currentRound.winner_name}</p>
              <p className="text-yellow-800 text-sm mt-0.5">
                {MONTH_NAMES[month]} {year} के विनर — इन्होंने 
                <span className="font-extrabold text-red-700 mx-1">
                  ₹ {(currentRound.payout_amount || currentRound.total_collected)?.toLocaleString('en-IN')}
                </span> 
                कमेटी उठाई है (Debit दर्ज हो गया)।
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const amt = (currentRound.payout_amount || currentRound.total_collected)?.toLocaleString('en-IN')
              const msg = `🏆 *MERA KAMETI — विनर घोषणा!* 🏆\n━━━━━━━━━━━━━━━━━━━━\n🎉 मुबारक हो! *${currentRound.winner_name}* ने ${MONTH_NAMES[month]} ${year} की कमिटी उठाई है!\n💰 उठाया गया पेआउट: ₹${amt}\n📅 महीना: ${MONTH_NAMES[month]} ${year}\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://mera-kameti-app-production.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
            }}
            className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 shrink-0 transition-all"
          >
            <span>💬</span> ग्रुप में विनर शेयर करें
          </button>
        </div>
      )}

      {/* Members list */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">
          सदस्यों की सूची — {MONTH_NAMES[month]} {year} Payment Status
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          जिस सदस्य को विनर चुनेंगे, उनके खाते में ₹{(payoutInput || totalThisMonthPaid || 0).toLocaleString('en-IN')} Debit (उठाया) के रूप में दर्ज हो जाएगा।
        </p>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>
        ) : members.length === 0 ? (
          <p className="text-gray-400 text-center py-4">कोई सदस्य नहीं मिला।</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className={`flex flex-wrap justify-between items-center p-4 rounded-xl border transition-all ${
                currentRound?.winner_user_id === m.id ? 'bg-yellow-50/80 border-yellow-400 shadow-sm' : 'bg-gray-50/70 border-gray-200 hover:bg-gray-50'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">{m.name}</span>
                    <span className="text-gray-500 text-xs font-mono">({m.phone})</span>
                    {currentRound?.winner_user_id === m.id && (
                      <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                        🏆 इस महीने के विनर
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    {m.amount ? (
                      <span className="badge-approved">✅ ₹{m.amount} जमा (Approved)</span>
                    ) : (
                      <span className="badge-rejected">❌ इस माह भुगतान नहीं</span>
                    )}
                    {m.previous_wins > 0 && (
                      <span className="text-amber-800 font-medium">
                        • पहले {m.previous_wins} बार कमिटी उठा चुके हैं
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setWinner(m.id, m.name)}
                  disabled={saving || currentRound?.winner_user_id === m.id}
                  className={`text-sm px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${
                    currentRound?.winner_user_id === m.id
                      ? 'bg-yellow-200 text-yellow-800 cursor-default shadow-none'
                      : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                  }`}
                >
                  {currentRound?.winner_user_id === m.id ? '✓ चयनित विनर' : '🏆 विनर चुनें'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past winners */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">📜 कमिटी उठाने वाले पिछले विनर (Past Debits)</h2>
        {rounds.filter(r => r.winner_name).length === 0 ? (
          <p className="text-gray-400 text-center py-4">अभी तक किसी ने कमिटी नहीं उठाई है।</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rounds.filter(r => r.winner_name).map(r => (
              <div key={r.id} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">{MONTH_NAMES[r.month]} {r.year}</span>
                <span className="font-bold text-gray-900">🏆 {r.winner_name}</span>
                <span className="text-red-600 font-extrabold text-sm">
                  - ₹ {(r.payout_amount || r.total_collected)?.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
