import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Approvals() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImg, setSelectedImg] = useState(null)
  const [noteModal, setNoteModal] = useState(null) // { id, action, amount, repayment_amount, member_name }
  const [note, setNote] = useState('')
  const [lateFine, setLateFine] = useState('0')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPending = () => {
    api.get('/payments/pending').then(res => setPayments(res.data.data)).finally(() => setLoading(false))
  }

  useEffect(() => { 
    fetchPending() 
    api.get('/settings').then(res => {
      if (res.data?.data?.default_late_fine) {
        setLateFine(res.data.data.default_late_fine)
      }
    }).catch(() => {})
  }, [])

  const handleAction = async () => {
    setActionLoading(true)
    try {
      const endpoint = noteModal.action === 'approve' ? 'approve' : 'reject'
      const payload = {
        admin_note: note,
        late_fine: noteModal.action === 'approve' ? parseFloat(lateFine || 0) : 0
      }
      await api.put(`/payments/${noteModal.id}/${endpoint}`, payload)
      toast.success(noteModal.action === 'approve' ? 'Payment approve ho gaya! ✅' : 'Payment reject ho gaya.')
      
      // If approved, automatically dispatch receipt message to WhatsApp group
      if (noteModal.action === 'approve') {
        const fineVal = parseFloat(lateFine || 0)
        const fineMsg = fineVal > 0 ? `\n⚡ लेट फाइन: ₹${fineVal}` : ''
        const repVal = parseFloat(noteModal.repayment_amount || 0)
        const repMsg = repVal > 0 ? `\n🔄 उठाया पैसा वापसी: ₹${repVal}` : ''
        const total = (parseFloat(noteModal.amount) || 0) + fineVal + repVal
        const now = new Date()
        const msg = `✅ *MERA KAMETI — पेमेंट रसीद स्वीकृत!* ✅\n━━━━━━━━━━━━━━━━━━━━\n👤 सदस्य: *${noteModal.member_name}*\n💵 किश्त जमा: ₹${noteModal.amount}${repMsg}${fineMsg}\n💰 कुल भुगतान: ₹${total}\n📅 महीना: ${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()}\nस्टेटस: स्वीकृत (Approved)\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://mera-kameti-app-production.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
      }

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
            {payments.map(p => {
              const repAmt = parseFloat(p.repayment_amount) || 0
              const fineAmt = parseFloat(p.late_fine) || 0
              const totalSubmitted = (parseFloat(p.amount) || 0) + repAmt + fineAmt
              return (
                <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{p.member_name}</span>
                        <span className="text-gray-500 text-sm font-mono">({p.member_phone})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-emerald-700 font-extrabold text-xl">₹ {p.amount} (किश्त)</span>
                        {repAmt > 0 && (
                          <span className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            🔄 +₹{repAmt} उठाया वापसी
                          </span>
                        )}
                        {fineAmt > 0 && (
                          <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            ⚡ +₹{fineAmt} लेट फाइन
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          (कुल: ₹{totalSubmitted.toLocaleString('en-IN')})
                        </span>
                      </div>
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
                          className="text-sm text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 font-medium">
                          📸 Screenshot dekho
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => { 
                          setNoteModal({ 
                            id: p.id, 
                            action: 'approve', 
                            amount: p.amount, 
                            repayment_amount: repAmt,
                            late_fine: fineAmt,
                            member_name: p.member_name 
                          }); 
                          setLateFine(fineAmt.toString());
                          setNote('') 
                        }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-bold shadow-sm">
                          ✅ Approve
                        </button>
                        <button onClick={() => { 
                          setNoteModal({ 
                            id: p.id, 
                            action: 'reject', 
                            amount: p.amount, 
                            repayment_amount: repAmt,
                            member_name: p.member_name 
                          }); 
                          setNote('') 
                        }}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-bold shadow-sm">
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {/* Note & Late Fine Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">
              {noteModal.action === 'approve' ? '✅ Payment Approve Karein?' : '❌ Payment Reject Karein?'}
            </h3>
            
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
              <div>मेम्बर: <strong>{noteModal.member_name}</strong></div>
              <div>किश्त राशि: <strong>₹{noteModal.amount}</strong></div>
              {noteModal.repayment_amount > 0 && (
                <div className="text-indigo-700 font-bold">🔄 उठाया हुआ पैसा वापसी: ₹{noteModal.repayment_amount}</div>
              )}
            </div>

            {noteModal.action === 'approve' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ⚠️ लेट फाइन (Late Fine ₹)
                </label>
                <input
                  type="number"
                  className="input text-sm font-bold text-red-600"
                  placeholder="0"
                  value={lateFine}
                  onChange={e => setLateFine(e.target.value)}
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Agar koi late fine lagana ho to daalein, warna 0 rehne dein.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                📝 Note (Optional)
              </label>
              <textarea
                className="input text-sm"
                rows="2"
                placeholder={noteModal.action === 'approve' ? 'Optional note for member...' : 'Reject karne ka reason daalein...'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setNoteModal(null)}
                className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={actionLoading}
                className={noteModal.action === 'approve' ? 'btn-primary text-sm' : 'bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors'}>
                {actionLoading ? 'Saving...' : (noteModal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}