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
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">Admin Panel 🔐</h1>
        <p className="text-green-100">{MONTH_NAMES[now.getMonth() + 1]} {now.getFullYear()} — Mera Kameti Dashboard</p>
      </div>

      {/* Credit & Debit Big Khata Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex justify-between items-center text-xs font-bold text-green-800 uppercase tracking-wider">
              <span>कुल जमा (Total Credit)</span>
              <span>🟢</span>
            </div>
            <div className="text-3xl font-black text-green-700 mt-2">
              ₹ {summary.overallTotalCredit?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-xs text-green-600 mt-1">सभी सदस्यों का कुल जमा फंड</div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <div className="flex justify-between items-center text-xs font-bold text-red-800 uppercase tracking-wider">
              <span>कुल उठाया (Total Debit)</span>
              <span>🔴</span>
            </div>
            <div className="text-3xl font-black text-red-700 mt-2">
              ₹ {summary.overallTotalDebit?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-xs text-red-600 mt-1">कमेटी विनर को दी गई कुल राशि</div>
          </div>

          <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <span>तिजोरी शेष (Net Balance)</span>
              <span>💼</span>
            </div>
            <div className="text-3xl font-black text-indigo-700 mt-2">
              ₹ {summary.overallNetBalance?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              <Link to="/admin/ledger" className="underline font-semibold hover:text-indigo-800">
                पूरा खाता बही खोलें →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600">{summary.totalMembers}</div>
            <div className="text-xs text-gray-500 mt-1">👥 Total Members</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600">₹ {summary.totalCollected?.toFixed(0)}</div>
            <div className="text-xs text-gray-500 mt-1">💰 इस महीने जमा</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-yellow-600">{summary.pendingCount}</div>
            <div className="text-xs text-gray-500 mt-1">⏳ Pending Approvals</div>
          </div>
          <div className="card text-center">
            <div className="text-xl font-bold text-blue-600">{summary.winner ? `🏆 ${summary.winner.winner_name}` : '—'}</div>
            <div className="text-xs text-gray-500 mt-1">🏆 इस महीने का विनर</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Link to="/admin/ledger" className="card text-center hover:shadow-md transition-shadow cursor-pointer group bg-emerald-50/50 border-emerald-200">
          <div className="text-3xl group-hover:scale-110 transition-transform">📖</div>
          <div className="text-sm font-bold text-emerald-800 mt-2">खाता बही (Ledger)</div>
          <span className="text-[10px] text-emerald-600">Credit / Debit</span>
        </Link>
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
          <div className="text-sm font-medium mt-2">Members List</div>
        </Link>
        <Link to="/admin/committee" className="card text-center hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl group-hover:scale-110 transition-transform">🏆</div>
          <div className="text-sm font-medium mt-2">Winner Select</div>
        </Link>
        <Link to="/admin/reports" className="card text-center hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl group-hover:scale-110 transition-transform">📊</div>
          <div className="text-sm font-medium mt-2">Reports & PDF</div>
        </Link>
      </div>

      {/* Pending payments preview */}
      {pendingPayments.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-700">⏳ Pending Approvals ({pendingPayments.length})</h2>
            <Link to="/admin/approvals" className="text-primary-600 text-sm hover:underline">सब देखें →</Link>
          </div>
          <div className="space-y-2">
            {pendingPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <span className="font-medium text-gray-900">{p.member_name}</span>
                  <span className="text-gray-500 text-sm ml-2">— ₹ {p.amount}</span>
                </div>
                <Link to="/admin/approvals" className="text-primary-600 text-sm font-semibold hover:underline">रिव्यू करें →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
