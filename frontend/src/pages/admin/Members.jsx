import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div></div>

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 mb-6">👥 Members ({members.length})</h1>

        {members.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">👤</div>
            <p>Abhi koi member registered nahi hai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Naam</th>
                  <th className="pb-3 pr-4">Phone</th>
                  <th className="pb-3 pr-4">Total Paid</th>
                  <th className="pb-3 pr-4">Payments</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m, i) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium">{m.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{m.phone}</td>
                    <td className="py-3 pr-4 font-bold text-primary-700">Rs. {m.total_paid?.toFixed(0)}</td>
                    <td className="py-3 pr-4 text-gray-600">{m.total_payments} approved</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
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
