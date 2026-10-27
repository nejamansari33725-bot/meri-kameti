import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Reports() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/reports/monthly?month=${month}&year=${year}`)
      setReport(res.data.data)
    } catch (err) {
      toast.error('Report load nahi hui.')
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await api.get(`/reports/pdf?month=${month}&year=${year}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `mera-kameti-${MONTH_NAMES[month]}-${year}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF download ho gaya! 📄')
    } catch {
      toast.error('PDF download fail.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 mb-4">📊 Monthly Reports</h1>

        <div className="flex flex-wrap gap-3 items-end">
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
          <button onClick={loadReport} disabled={loading} className="btn-primary">
            {loading ? '⏳ Load...' : '📊 Report Load Karein'}
          </button>
          {report && (
            <button onClick={downloadPdf} disabled={pdfLoading} className="btn-secondary">
              {pdfLoading ? '⏳...' : '📥 PDF Download'}
            </button>
          )}
        </div>
      </div>

      {report && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-600">Rs. {report.totalCollected?.toFixed(0)}</div>
              <div className="text-sm text-gray-500 mt-1">💰 Total Collected</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-600">{report.payments.length}</div>
              <div className="text-sm text-gray-500 mt-1">📋 Total Payments</div>
            </div>
            <div className="card text-center col-span-2 md:col-span-1">
              <div className="text-xl font-bold text-yellow-600">{report.winner?.winner_name || '—'}</div>
              <div className="text-sm text-gray-500 mt-1">🏆 Winner</div>
            </div>
          </div>

          {/* Payment table */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">{MONTH_NAMES[month]} {year} — All Payments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 pr-4">Member</th>
                    <th className="pb-3 pr-4">Phone</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Reference</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium">{p.member_name}</td>
                      <td className="py-3 pr-4 text-gray-600">{p.member_phone}</td>
                      <td className="py-3 pr-4 font-bold text-primary-700">Rs. {p.amount}</td>
                      <td className="py-3 pr-4 text-gray-600">{p.reference_no || '—'}</td>
                      <td className="py-3">
                        <span className={`badge-${p.status}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
