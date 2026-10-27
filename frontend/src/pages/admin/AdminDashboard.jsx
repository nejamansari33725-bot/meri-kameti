import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/committee/summary'),
      api.get('/payments/pending')
    ]).then(([s, p]) => {
      setSummary(s.data.data)
      setPendingPayments(p.data.data.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
    </div>
  )

  const now = new Date()

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Admin Panel 🔐</h1>
        <p className="text-green-100">{MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — Mera Kameti</p>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600">{summary.totalMembers}</div>
            <div className="text-sm text-gray-500 mt-1">👥 Total Members</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600">Rs. {summary.totalCollected?.toFixed(0)}</div>
            <div className="text-sm text-gray-500 mt-1">💰 Is Mahine Jama</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-yellow-600">{summary.pendingCount}</div>
            <div className="text-sm text-gray-500 mt-1">⏳ Pending Approvals</div>
          </div>
          <div className="card text-center">
            <div className="text-xl font-bold text-blue-600">{summary.winner ? `🏆 ${summary.winner.winner_name}` : '—'}</div>
            <div className="text-sm text-gray-500 mt-1">🏆 Is Mahine Winner</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/approvals" className="card text-center hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl group-hover:scale-110 transition-transform">✅</div>
          <div className="text-sm font-medium mt-2">Payments Approve</div>
          {summary?.pendingCount > 0 && (
            <span className="inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded-full mt-1">
              {summary.pendingCount} pending
            </span>
          )}
        </Link>
        <Link to="/admin/members" className="card text-center hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl group-hover:scale-110 transition-transform">👥</div>
          <div className="text-sm font-medium mt-2">Members Manage</div>
        </Link>
        <Link to="/admin/committee" className="card text-center hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl group-hover:scale-110 transition-transform">🏆</div>
          <div className="text-sm font-medium mt-2">Winner Select</div>
        </Link>
        <Link to="/admin/reports" className="card text-center hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl group-hover:scale-110 transition-transform">📊</div>
          <div className="text-sm font-medium mt-2">Reports</div>
        </Link>
      </div>

      {/* Pending payments preview */}
      {pendingPayments.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-700">⏳ Pending Approvals</h2>
            <Link to="/admin/approvals" className="text-primary-600 text-sm hover:underline">Sab dekho →</Link>
          </div>
          <div className="space-y-2">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <span className="font-medium">{p.member_name}</span>
                  <span className="text-gray-500 text-sm ml-2">— Rs. {p.amount}</span>
                </div>
                <Link to="/admin/approvals" className="text-primary-600 text-sm hover:underline">Review →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
