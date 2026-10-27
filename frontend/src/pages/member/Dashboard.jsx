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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/committee/summary'),
      api.get('/payments/my')
    ]).then(([s, p]) => {
      setSummary(s.data.data)
      setRecentPayments(p.data.data.slice(0, 5))
    }).finally(() => setLoading(false))
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
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Assalam o Alaikum, {user?.name}! 👋</h1>
        <p className="text-green-100 mt-1">{MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — Kameti Status</p>
      </div>

      {/* This month payment status */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">📅 Is Mahine Ka Payment Status</h2>
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
                Rs. {thisMonthPayment.amount} — {thisMonthPayment.status === 'approved' ? 'Approved!' : thisMonthPayment.status === 'pending' ? 'Approval ka wait...' : 'Rejected'}
              </p>
              {thisMonthPayment.admin_note && <p className="text-sm text-gray-600">Note: {thisMonthPayment.admin_note}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-3xl">💸</span>
            <div>
              <p className="font-semibold text-gray-700">Is mahine payment submit nahi hui</p>
              <p className="text-sm text-gray-500">Jaldi karein!</p>
            </div>
          </div>
        )}
        {(!thisMonthPayment || thisMonthPayment?.status === 'rejected') && (
          <Link to="/pay" className="btn-primary mt-3 inline-block">💰 Payment Submit Karein</Link>
        )}
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600">Rs. {summary.totalCollected?.toFixed(0)}</div>
            <div className="text-sm text-gray-500 mt-1">Is Mahine Jama</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600">{summary.paidMembers}/{summary.totalMembers}</div>
            <div className="text-sm text-gray-500 mt-1">Members Ne Diya</div>
          </div>
          <div className="card text-center col-span-2 md:col-span-1">
            <div className="text-2xl font-bold text-yellow-600">
              {summary.winner ? `🏆 ${summary.winner.winner_name}` : '⏳ TBD'}
            </div>
            <div className="text-sm text-gray-500 mt-1">Is Mahine Ka Winner</div>
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">📋 Recent Payments</h2>
          <Link to="/history" className="text-primary-600 text-sm hover:underline">Sab dekho →</Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Koi payment nahi mili abhi tak.</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">Rs. {p.amount}</span>
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
