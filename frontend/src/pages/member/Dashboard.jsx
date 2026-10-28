import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function MemberDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [myStatement, setMyStatement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/committee/summary'),
      api.get('/payments/my'),
      api.get('/auth/me')
    ]).then(([s, p, me]) => {
      setSummary(s.data.data)
      setRecentPayments(p.data.data.slice(0, 5))
      if (me.data?.data?.id) {
        return api.get(`/members/${me.data.data.id}/statement`)
      }
    }).then(stmtRes => {
      if (stmtRes?.data?.data) {
        setMyStatement(stmtRes.data.data)
      }
    }).catch(err => console.error(err))
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
    </div>
  )

  const now = new Date()
  const thisMonthPayment = recentPayments.find(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear())

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Assalam o Alaikum, {user?.name}! 👋</h1>
            <p className="text-green-100 mt-1">{MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — Mera Kameti Status</p>
          </div>
          <Link
            to="/ledger"
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur transition-all flex items-center gap-1.5"
          >
            <span>📖</span> पूरा खाता बही देखें →
          </Link>
        </div>
      </div>

      {/* Member's Personal Credit & Debit Card */}
      {myStatement && (
        <div className="card bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/70 border-emerald-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span>💳</span> आपका व्यक्तिगत खाता (Personal Khata)
            </h2>
            <Link to="/history" className="text-primary-700 text-xs font-semibold hover:underline">
              पूरी हिस्ट्री देखें →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-center">
              <span className="text-[11px] text-green-700 font-bold uppercase block">आपने जमा किया (Credit)</span>
              <span className="text-xl font-extrabold text-green-700 mt-1 block">
                ₹ {myStatement.total_credit?.toLocaleString('en-IN') || 0}
              </span>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
              <span className="text-[11px] text-red-700 font-bold uppercase block">आपने उठाया (Debit)</span>
              <span className="text-xl font-extrabold text-red-700 mt-1 block">
                ₹ {myStatement.total_debit?.toLocaleString('en-IN') || 0}
              </span>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
              <span className="text-[11px] text-indigo-700 font-bold uppercase block">आपका बैलेंस (Net)</span>
              <span className={`text-xl font-extrabold mt-1 block ${
                myStatement.net_balance >= 0 ? 'text-indigo-700' : 'text-red-700'
              }`}>
                ₹ {myStatement.net_balance?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* This month payment status */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">📅 इस महीने का पेमेंट स्टेटस</h2>
        {thisMonthPayment ? (
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            thisMonthPayment.status === 'approved' ? 'bg-green-50 border border-green-200' :
            thisMonthPayment.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <span className="text-3xl">
              {thisMonthPayment.status === 'approved' ? '✅' : thisMonthPayment.status === 'pending' ? '⏳' : '❌'}
            </span>
            <div>
              <p className="font-semibold">
                ₹ {thisMonthPayment.amount} — {thisMonthPayment.status === 'approved' ? 'Approved (स्वीकृत)!' : thisMonthPayment.status === 'pending' ? 'Approval का इंतज़ार...' : 'Rejected'}
              </p>
              {thisMonthPayment.admin_note && <p className="text-sm text-gray-600">Note: {thisMonthPayment.admin_note}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-3xl">💸</span>
            <div>
              <p className="font-semibold text-gray-700">इस महीने पेमेंट सबमिट नहीं हुई है</p>
              <p className="text-sm text-gray-500">कृपया समय पर अपनी किश्त सबमिट करें।</p>
            </div>
          </div>
        )}
        {(!thisMonthPayment || thisMonthPayment?.status === 'rejected') && (
          <Link to="/pay" className="btn-primary mt-3 inline-block">💰 पेमेंट सबमिट करें</Link>
        )}
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-700">₹ {summary.overallTotalCredit?.toLocaleString('en-IN') || 0}</div>
            <div className="text-xs text-gray-500 mt-1">🟢 कुल जमा (Total Credit)</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">₹ {summary.overallTotalDebit?.toLocaleString('en-IN') || 0}</div>
            <div className="text-xs text-gray-500 mt-1">🔴 कुल उठाया (Total Debit)</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.paidMembers}/{summary.totalMembers}</div>
            <div className="text-xs text-gray-500 mt-1">इस महीने भुगतान</div>
          </div>
          <div className="card text-center">
            <div className="text-xl font-bold text-yellow-600 truncate">
              {summary.winner ? `🏆 ${summary.winner.winner_name}` : '⏳ TBD'}
            </div>
            <div className="text-xs text-gray-500 mt-1">इस महीने का विनर</div>
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">📋 हालिया पेमेंट्स (Recent Payments)</h2>
          <Link to="/history" className="text-primary-600 text-sm hover:underline">सब देखें →</Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-gray-400 text-center py-4">कोई पेमेंट नहीं मिली अभी तक।</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold text-gray-900">₹ {p.amount}</span>
                  <span className="text-gray-500 text-sm ml-2">— {MONTH_NAMES[p.month]} {p.year}</span>
                </div>
                <span className={`badge-${p.status}`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
