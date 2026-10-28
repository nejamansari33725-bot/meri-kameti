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
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">📋 मेरी पेमेंट्स / My Payments History</h1>
        <p className="text-xs text-slate-500 mb-6">
          किश्तें, लेट फाइन और उठाया हुआ पैसा वापसी की रसीदें / Receipts for Installment, Late Fine & Repayments
        </p>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-slate-600">अभी तक कोई पेमेंट रिकॉर्ड नहीं मिला। / No payment records found yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600 bg-slate-50/70 text-xs">
                  <th className="py-3 px-3">महीना-साल / Month-Year</th>
                  <th className="py-3 px-3 text-right">किश्त / Installment (₹)</th>
                  <th className="py-3 px-3 text-right">लेट फाइन / Late Fine (₹)</th>
                  <th className="py-3 px-3 text-right">उठाया वापसी / Repayment (₹)</th>
                  <th className="py-3 px-3 text-right font-bold text-emerald-800">कुल / Total (₹)</th>
                  <th className="py-3 px-3">रेफरेंस / Reference No.</th>
                  <th className="py-3 px-3 text-center">रसीद / Receipt</th>
                  <th className="py-3 px-3 text-center">स्थिति / Status</th>
                  <th className="py-3 px-3">एडमिन नोट / Admin Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => {
                  const amt = parseFloat(p.amount) || 0
                  const fine = parseFloat(p.late_fine) || 0
                  const rep = parseFloat(p.repayment_amount) || 0
                  const total = amt + fine + rep
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {MONTH_NAMES[p.month]} {p.year}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {amt > 0 ? `₹ ${amt.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-medium">
                        {fine > 0 ? `₹ ${fine.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-700 font-medium">
                        {rep > 0 ? `₹ ${rep.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        ₹ {total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-500">
                        {p.reference_no || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {p.screenshot_path ? (
                          <a
                            href={p.screenshot_path}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold text-xs"
                          >
                            📸 देखें / View
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status === 'approved' ? '✓ स्वीकृत / Approved' : p.status === 'pending' ? '⏳ पेंडिंग / Pending' : '✕ अस्वीकृत / Rejected'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 max-w-[180px] truncate" title={p.admin_note}>
                        {p.admin_note || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
