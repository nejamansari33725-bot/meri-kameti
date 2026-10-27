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
        month, year, winner_user_id: memberId
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

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Select month */}
      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 mb-4">🏆 Committee Winner Select Karein</h1>
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select className="input w-40" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select className="input w-28" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Current winner */}
      {currentRound?.winner_name && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-4xl">🏆</span>
          <div>
            <p className="font-bold text-yellow-800 text-lg">{currentRound.winner_name}</p>
            <p className="text-yellow-600 text-sm">{MONTH_NAMES[month]} {year} ka winner — Rs. {currentRound.total_collected?.toFixed(0)} collected</p>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">
          Members — {MONTH_NAMES[month]} {year} Payment Status
        </h2>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>
        ) : members.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Koi member nahi mila.</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className={`flex justify-between items-center p-4 rounded-xl border ${
                currentRound?.winner_user_id === m.id ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
              }`}>
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-500 text-sm ml-2">({m.phone})</span>
                  {m.amount ? (
                    <span className="ml-2 badge-approved">✅ Rs. {m.amount} paid</span>
                  ) : (
                    <span className="ml-2 badge-rejected">❌ Payment nahi</span>
                  )}
                  {currentRound?.winner_user_id === m.id && <span className="ml-2 text-yellow-600 font-bold">🏆 Winner!</span>}
                </div>
                <button
                  onClick={() => setWinner(m.id, m.name)}
                  disabled={saving || currentRound?.winner_user_id === m.id}
                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentRound?.winner_user_id === m.id
                      ? 'bg-yellow-200 text-yellow-800 cursor-default'
                      : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                  }`}
                >
                  {currentRound?.winner_user_id === m.id ? '🏆 Current Winner' : 'Winner Set Karein'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past winners */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">📜 Past Winners</h2>
        {rounds.filter(r => r.winner_name).length === 0 ? (
          <p className="text-gray-400 text-center py-4">Abhi koi winner nahi tha.</p>
        ) : (
          <div className="space-y-2">
            {rounds.filter(r => r.winner_name).map(r => (
              <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span>{MONTH_NAMES[r.month]} {r.year}</span>
                <span className="font-medium">🏆 {r.winner_name}</span>
                <span className="text-primary-600 font-bold">Rs. {r.total_collected?.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
