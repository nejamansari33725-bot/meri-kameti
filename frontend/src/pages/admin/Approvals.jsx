import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Approvals() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImg, setSelectedImg] = useState(null)
  const [noteModal, setNoteModal] = useState(null) // { id, action }
  const [note, setNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPending = () => {
    api.get('/payments/pending').then(res => setPayments(res.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPending() }, [])

  const handleAction = async () => {
    setActionLoading(true)
    try {
      const endpoint = noteModal.action === 'approve' ? 'approve' : 'reject'
      await api.put(`/payments/${noteModal.id}/${endpoint}`, { admin_note: note })
      toast.success(noteModal.action === 'approve' ? 'Payment approve ho gaya! ✅' : 'Payment reject ho gaya.')
      setNoteModal(null)
      setNote('')
      fetchPending()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error aaya.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div></div>

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 mb-2">✅ Payment Approvals</h1>
        <p className="text-gray-500 mb-6">{payments.length} payment(s) approval ke liye wait kar rahe hain</p>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🎉</div>
            <p>Sab payments review ho chuke hain!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{p.member_name}</span>
                      <span className="text-gray-500 text-sm">({p.member_phone})</span>
                    </div>
                    <div className="text-primary-700 font-bold text-xl">Rs. {p.amount}</div>
                    <div className="text-gray-500 text-sm">
                      📅 {MONTH_NAMES[p.month]} {p.year} &nbsp;|&nbsp;
                      🔢 Ref: {p.reference_no || 'N/A'}
                    </div>
                    {p.note && <div className="text-gray-600 text-sm">📝 {p.note}</div>}
                    <div className="text-gray-400 text-xs">Submitted: {new Date(p.submitted_at).toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {p.screenshot_path && (
                      <button onClick={() => setSelectedImg(p.screenshot_path)}
                        className="text-sm text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                        📸 Screenshot dekho
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setNoteModal({ id: p.id, action: 'approve' }); setNote('') }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                        ✅ Approve
                      </button>
                      <button onClick={() => { setNoteModal({ id: p.id, action: 'reject' }); setNote('') }}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {selectedImg && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImg(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={selectedImg} alt="Payment screenshot" className="w-full rounded-xl shadow-2xl" />
            <button onClick={() => setSelectedImg(null)}
              className="absolute top-3 right-3 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-gray-100">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Note/Confirm Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-2">
              {noteModal.action === 'approve' ? '✅ Payment Approve Karein?' : '❌ Payment Reject Karein?'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">Admin note (optional):</p>
            <textarea className="input mb-4" rows={3} placeholder="Note likhein..."
              value={note} onChange={e => setNote(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={handleAction} disabled={actionLoading}
                className={`flex-1 py-2 rounded-lg text-white font-medium transition-colors ${
                  noteModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}>
                {actionLoading ? '⏳...' : noteModal.action === 'approve' ? '✅ Confirm Approve' : '❌ Confirm Reject'}
              </button>
              <button onClick={() => setNoteModal(null)} className="btn-secondary flex-1">Roko</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
