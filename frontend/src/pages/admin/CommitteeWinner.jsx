import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function CommitteeWinner() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [rounds, setRounds] = useState([])
  const [payoutRequests, setPayoutRequests] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [payoutInput, setPayoutInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Manual / Offline Winner Selector State
  const [showManualSelect, setShowManualSelect] = useState(false)
  const [manualMemberId, setManualMemberId] = useState('')
  const [manualAmount, setManualAmount] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [roundsRes, payoutReqRes, membersRes] = await Promise.all([
        api.get('/committee/rounds'),
        api.get(`/committee/payout-requests?month=${month}&year=${year}`),
        api.get(`/committee/members-status?month=${month}&year=${year}`)
      ])
      setRounds(roundsRes.data.data || [])
      setPayoutRequests(payoutReqRes.data.data || [])
      setAllMembers(membersRes.data.data || [])
      
      const cr = (roundsRes.data.data || []).find(r => r.month === month && r.year === year)
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

  const setWinner = async (memberId, memberName, customAmount) => {
    setSaving(true)
    const finalPayout = customAmount !== undefined 
      ? parseFloat(customAmount) 
      : (payoutInput ? parseFloat(payoutInput) : null)

    try {
      await api.post('/committee/rounds', {
        month, 
        year, 
        winner_user_id: memberId,
        payout_amount: finalPayout
      })
      toast.success(`🏆 ${memberName} को विनर सेट कर दिया गया!`)
      fetchData()

      // Automatically dispatch winner announcement to WhatsApp group
      const amtStr = finalPayout ? finalPayout.toLocaleString('en-IN') : 'कमिटी राशि'
      const msg = `🏆 *MERA KAMETI — विनर घोषणा!* 🏆\n━━━━━━━━━━━━━━━━━━━━\n🎉 मुबारक हो! *${memberName}* ने ${MONTH_NAMES[month]} ${year} की कमिटी उठाई है!\n💰 उठाया गया पेआउट: ₹${amtStr}\n📅 महीना: ${MONTH_NAMES[month]} ${year}\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://merakameti.vercel.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error.')
    } finally {
      setSaving(false)
    }
  }

  const handleManualWinnerSubmit = (e) => {
    e.preventDefault()
    if (!manualMemberId) {
      return toast.error('कृपया सदस्य चुनें / Please select member.')
    }
    const selected = allMembers.find(m => String(m.id) === String(manualMemberId))
    const name = selected?.name || 'सदस्य'
    setWinner(manualMemberId, name, manualAmount || payoutInput)
    setShowManualSelect(false)
  }

  const currentRound = rounds.find(r => r.month === month && r.year === year)
  const totalThisMonthPaid = allMembers.reduce((sum, m) => sum + (m.amount ? parseFloat(m.amount) : 0), 0)

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Select month & Payout Amount */}
      <div className="card space-y-4">
        <h1 className="text-2xl font-bold text-emerald-800">🏆 कमिटी विनर चुनें / Select Committee Winner</h1>
        
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

      {/* Current winner banner */}
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
              const msg = `🏆 *MERA KAMETI — विनर घोषणा!* 🏆\n━━━━━━━━━━━━━━━━━━━━\n🎉 मुबारक हो! *${currentRound.winner_name}* ने ${MONTH_NAMES[month]} ${year} की कमिटी उठाई है!\n💰 उठाया गया पेआउट: ₹${amt}\n📅 महीना: ${MONTH_NAMES[month]} ${year}\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://merakameti.vercel.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
            }}
            className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 shrink-0 transition-all"
          >
            <span>💬</span> ग्रुप में विनर शेयर करें
          </button>
        </div>
      )}

      {/* ONLY APPLIED MEMBERS SECTION */}
      <div className="card border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <div>
            <h2 className="text-lg font-black text-emerald-950 flex items-center gap-2">
              <span>🙋‍♂️</span> कमिटी उठाने के लिए आए आवेदन / Applied Members ({payoutRequests.length})
            </h2>
            <p className="text-xs text-emerald-800">
              यहाँ सिर्फ वही सदस्य दिख रहे हैं जिन्होंने {MONTH_NAMES[month]} {year} में कमिटी उठाने के लिए अप्लाई किया है
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setShowManualSelect(!showManualSelect)}
            className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 transition-all flex items-center gap-1"
          >
            {showManualSelect ? '✕ मैन्युअल विकल्प छुपाएं' : '➕ किसी अन्य सदस्य को सीधे चुनें'}
          </button>
        </div>

        {/* Manual selector accordion (in case of offline agreement) */}
        {showManualSelect && (
          <form onSubmit={handleManualWinnerSubmit} className="mb-4 p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3">
            <div className="text-xs font-bold text-emerald-900">
              📌 अगर किसी सदस्य ने ऑनलाइन अप्लाई नहीं किया और ऑफ़लाइन बात हुई है, तो यहाँ से चुनें:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">सदस्य चुनें</label>
                <select
                  className="input text-sm"
                  value={manualMemberId}
                  onChange={e => setManualMemberId(e.target.value)}
                  required
                >
                  <option value="">-- सदस्य चुनें --</option>
                  {allMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone}) {m.previous_wins > 0 ? `[पहले ${m.previous_wins} बार उठा चुके]` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">पेआउट राशि (₹)</label>
                <input
                  type="number"
                  className="input text-sm"
                  placeholder={`₹ ${payoutInput || totalThisMonthPaid}`}
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualSelect(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg shadow"
              >
                🏆 विनर सेट करें
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
          </div>
        ) : payoutRequests.length === 0 ? (
          <div className="text-center py-8 px-4 bg-white/70 rounded-xl border border-dashed border-gray-300">
            <span className="text-4xl block mb-2">📭</span>
            <p className="font-bold text-gray-700 text-sm">इस महीने किसी भी सदस्य ने कमिटी उठाने के लिए आवेदन (Apply) नहीं किया है।</p>
            <p className="text-xs text-gray-500 mt-1">
              सदस्य अपने मोबाइल पर लॉगिन करके <strong>"कमिटी उठाने के लिए अर्जी लगाएं"</strong> फॉर्म भरकर आवेदन कर सकते हैं।
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payoutRequests.map(pr => {
              const isWinner = currentRound?.winner_user_id === pr.user_id
              return (
                <div
                  key={pr.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    isWinner
                      ? 'bg-yellow-50/90 border-yellow-400 shadow-md ring-2 ring-yellow-400/50'
                      : 'bg-white border-emerald-200 hover:border-emerald-400 shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-base">{pr.member_name}</span>
                      <span className="text-xs font-mono text-gray-500">({pr.member_phone})</span>
                      {isWinner && (
                        <span className="bg-yellow-400 text-yellow-950 text-xs px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm">
                          <span>🏆</span> चयनित विनर
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                      <span className="bg-emerald-100 text-emerald-900 font-black px-2.5 py-0.5 rounded-lg text-sm border border-emerald-300">
                        मांग: ₹{pr.requested_amount?.toLocaleString('en-IN')}
                      </span>

                      {pr.paid_amount > 0 ? (
                        <span className="badge-approved">✅ ₹{pr.paid_amount} किश्त जमा</span>
                      ) : (
                        <span className="badge-rejected">❌ इस माह किश्त जमा नहीं</span>
                      )}

                      {pr.previous_wins > 0 ? (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          • पहले {pr.previous_wins} बार कमिटी उठा चुके हैं
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          • पहली बार उठा रहे हैं
                        </span>
                      )}
                    </div>

                    {pr.reason && (
                      <p className="text-xs text-gray-600 italic bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 mt-1 inline-block">
                        वजह: "{pr.reason}"
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 w-full sm:w-auto flex justify-end">
                    {isWinner ? (
                      <span className="bg-yellow-200 text-yellow-900 font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl border border-yellow-400 shadow-none">
                        ✓ इस माह के विनर हैं
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPayoutInput(pr.requested_amount)
                          setWinner(pr.user_id, pr.member_name, pr.requested_amount)
                        }}
                        disabled={saving}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>🏆</span> इस मांग (₹{pr.requested_amount?.toLocaleString('en-IN')}) पर विनर बनाएं
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
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
