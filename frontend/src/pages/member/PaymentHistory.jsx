import { useEffect, useState } from 'react'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/payments/my').then(res => setPayments(res.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 mb-6">📋 Payment History</h1>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p>Abhi tak koi payment nahi ki.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 pr-4">Month</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Screenshot</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">{MONTH_NAMES[p.month]} {p.year}</td>
                    <td className="py-3 pr-4 font-bold text-primary-700">Rs. {p.amount}</td>
                    <td className="py-3 pr-4 text-gray-600">{p.reference_no || '—'}</td>
                    <td className="py-3 pr-4">
                      {p.screenshot_path ? (
                        <a href={p.screenshot_path} target="_blank" rel="noreferrer"
                          className="text-primary-600 hover:underline text-xs">📸 Dekho</a>
                      ) : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge-${p.status}`}>
                        {p.status === 'approved' ? '✅ Approved' : p.status === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">{p.admin_note || '—'}</td>
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
