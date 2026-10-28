import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchMembers = () => {
    api.get('/members').then(res => setMembers(res.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [])

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await api.put(`/members/${id}/status`, { status: newStatus })
      toast.success(`Member ${newStatus === 'active' ? 'activate' : 'deactivate'} ho gaya.`)
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error.')
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
    </div>
  )

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  )

  const totalCreditAll = members.reduce((s, m) => s + (m.total_credit || 0), 0)
  const totalLateFineAll = members.reduce((s, m) => s + (m.total_late_fine || 0), 0)
  const totalDebitAll = members.reduce((s, m) => s + (m.total_debit || 0), 0)

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header & Quick Stats */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-700">👥 Members Management ({members.length})</h1>
            <p className="text-gray-500 text-sm">सभी मेम्बर्स का जमा (Credit), लेट फाइन और उठाया गया (Debit) हिसाब</p>
          </div>
          <Link to="/admin/ledger" className="btn-primary text-sm flex items-center gap-1.5">
            <span>📖</span> पूरा खाता बही देखें →
          </Link>
        </div>

        {/* Quick Summary Chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
          <div className="p-3 bg-green-50 rounded-xl border border-green-200">
            <span className="text-xs text-green-700 uppercase font-semibold block">कुल जमा (Credit)</span>
            <span className="text-xl font-extrabold text-green-700">₹ {totalCreditAll.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-700 uppercase font-semibold block">कुल लेट फाइन</span>
            <span className="text-xl font-extrabold text-amber-700">₹ {totalLateFineAll.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <span className="text-xs text-red-700 uppercase font-semibold block">कुल उठाया (Debit)</span>
            <span className="text-xl font-extrabold text-red-700">₹ {totalDebitAll.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
            <span className="text-xs text-indigo-700 uppercase font-semibold block">तिजोरी बाकी (Net)</span>
            <span className="text-xl font-extrabold text-indigo-700">₹ {((totalCreditAll + totalLateFineAll) - totalDebitAll).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4 gap-3">
          <h2 className="font-semibold text-gray-800">मेम्बर्स की सूची</h2>
          <input
            type="text"
            className="input text-sm max-w-xs"
            placeholder="🔍 नाम या फोन खोजें..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">👤</div>
            <p>कोई मेम्बर नहीं मिला।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">मेम्बर का नाम</th>
                  <th className="py-3 px-3">मोबाइल</th>
                  <th className="py-3 px-3 text-right text-green-700">कुल जमा (Credit)</th>
                  <th className="py-3 px-3 text-right text-amber-700">लेट फाइन</th>
                  <th className="py-3 px-3 text-right text-red-700">कुल उठाया (Debit)</th>
                  <th className="py-3 px-3 text-right font-bold">नेट बैलेंस</th>
                  <th className="py-3 px-3 text-center">कमेटी स्थिति</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m, i) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-3.5 px-3 font-semibold text-gray-900">
                      {m.name}
                      {m.role === 'admin' && (
                        <span className="ml-1.5 text-[10px] bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-full">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-gray-600 font-mono text-xs">{m.phone}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-green-600">
                      ₹ {m.total_credit?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-amber-700">
                      {m.total_late_fine > 0 ? `₹ ${m.total_late_fine.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-red-600">
                      ₹ {m.total_debit?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {m.net_balance > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          + ₹{m.net_balance.toLocaleString('en-IN')}
                        </span>
                      ) : m.net_balance < 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          - ₹{Math.abs(m.net_balance).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          ₹ 0
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {m.rounds_won_count > 0 ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2 py-0.5 rounded-full">
                          🏆 {m.rounds_won_count} बार ({m.rounds_won_info})
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">नहीं उठाई</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {m.role === 'admin' ? (
                        <span className="text-xs text-primary-700 font-bold">Admin</span>
                      ) : (
                        <button
                          onClick={() => toggleStatus(m.id, m.status)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            m.status === 'active'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {m.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
