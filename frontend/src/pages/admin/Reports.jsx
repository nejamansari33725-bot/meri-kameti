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
  const [backupLoading, setBackupLoading] = useState(false)

  const downloadFullBackup = async () => {
    setBackupLoading(true)
    const toastId = toast.loading('कम्पलीट डेटा बैकअप तैयार हो रहा है...')
    try {
      const res = await api.get('/reports/backup-data?download=true', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `mera-kameti-full-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('पूरा डेटा बैकअप डाउनलोड हो गया! 📥', { id: toastId })
    } catch (err) {
      toast.error('डाउनलोड विफल: ' + (err.response?.data?.error || err.message), { id: toastId })
    } finally {
      setBackupLoading(false)
    }
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/reports/monthly?month=${month}&year=${year}`)
      setReport(res.data.data)
    } catch (err) {
      toast.error('रिपोर्ट लोड नहीं हो पाई। / Report load failed.')
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
      toast.success('PDF डाउनलोड हो गया! / PDF downloaded! 📄')
    } catch {
      toast.error('PDF डाउनलोड विफल / PDF download failed.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">📊 मासिक रिपोर्ट / Monthly Reports</h1>
        <p className="text-xs text-slate-500 mb-4">महीने का कुल कलेक्शन, पेमेंट्स और विनर विवरण देखें व PDF डाउनलोड करें</p>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">महीना / Month</label>
            <select className="input w-40 text-sm" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTH_NAMES.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">वर्ष / Year</label>
            <select className="input w-28 text-sm" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={loadReport} disabled={loading} className="btn-primary">
            {loading ? '⏳ लोड हो रहा है...' : '📊 रिपोर्ट देखें / View Report'}
          </button>
          {report && (
            <button onClick={downloadPdf} disabled={pdfLoading} className="btn-secondary">
              {pdfLoading ? '⏳ डाउनलोडिंग...' : '📥 PDF डाउनलोड / Download'}
            </button>
          )}
          <button
            onClick={downloadFullBackup}
            disabled={backupLoading}
            className="btn-secondary border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            {backupLoading ? '⏳ डाउनलोडिंग...' : '🛡️ डेटा बैकअप डाउनलोड / Backup Data'}
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card text-center bg-emerald-50/50 border-emerald-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">₹ {report.totalCollected?.toLocaleString('en-IN')}</div>
              <div className="text-xs font-semibold text-emerald-900 mt-1">💰 कुल जमा / Total Collected</div>
            </div>
            <div className="card text-center bg-blue-50/50 border-blue-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">{report.payments.length}</div>
              <div className="text-xs font-semibold text-blue-900 mt-1">📋 कुल पेमेंट्स / Total Payments</div>
            </div>
            <div className="card text-center bg-amber-50/50 border-amber-200 col-span-2 md:col-span-1">
              <div className="text-xl sm:text-2xl font-extrabold text-amber-700">{report.winner?.winner_name || '—'}</div>
              <div className="text-xs font-semibold text-amber-900 mt-1">🏆 कमिटी विनर / Winner</div>
            </div>
          </div>

          {/* Payment table */}
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4">{MONTH_NAMES[month]} {year} — सभी भुगतान / All Payments</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50/80 text-xs">
                    <th className="py-2.5 px-3">सदस्य / Member</th>
                    <th className="py-2.5 px-3">फोन / Phone</th>
                    <th className="py-2.5 px-3 text-right">राशि / Amount (₹)</th>
                    <th className="py-2.5 px-3">रेफरेंस / Ref UTR</th>
                    <th className="py-2.5 px-3 text-center">स्थिति / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-semibold text-slate-900">{p.member_name}</td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">{p.member_phone}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700">₹ {parseFloat(p.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-500">{p.reference_no || '—'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status === 'approved' ? 'स्वीकृत / Approved' : p.status === 'pending' ? 'पेंडिंग / Pending' : 'अस्वीकृत / Rejected'}
                        </span>
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
