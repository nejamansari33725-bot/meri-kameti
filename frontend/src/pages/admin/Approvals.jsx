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

  // 1-Click Instant Approve
  const handleQuickApprove = async (p) => {
    setActionLoading(true)
    try {
      await api.put(`/payments/${p.id}/approve`, {
        admin_note: 'Quick Approved by Admin',
        late_fine: parseFloat(p.late_fine || 0)
      })
      toast.success(`✅ ${p.member_name} का ₹${p.amount} पेमेंट अप्रूव हो गया!`)

      const fineVal = parseFloat(p.late_fine || 0)
      const fineMsg = fineVal > 0 ? `\n⚡ लेट फाइन: ₹${fineVal}` : ''
      const repVal = parseFloat(p.repayment_amount || 0)
      const repMsg = repVal > 0 ? `\n🔄 उठाया पैसा वापसी: ₹${repVal}` : ''
      const total = (parseFloat(p.amount) || 0) + fineVal + repVal
      const now = new Date()
      const msg = `✅ *MERA KAMETI — पेमेंट रसीद स्वीकृत!* ✅\n━━━━━━━━━━━━━━━━━━━━\n👤 सदस्य: *${p.member_name}*\n💵 किश्त जमा: ₹${p.amount}${repMsg}${fineMsg}\n💰 कुल भुगतान: ₹${total}\n📅 महीना: ${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()}\nस्टेटस: स्वीकृत (Approved)\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://merakameti.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')

      fetchPending()
    } catch (err) {
      toast.error(err.response?.data?.error || 'अप्रूव नहीं हो पाया।')
    } finally {
      setActionLoading(false)
    }
  }

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
        const msg = `✅ *MERA KAMETI — पेमेंट रसीद स्वीकृत!* ✅\n━━━━━━━━━━━━━━━━━━━━\n👤 सदस्य: *${noteModal.member_name}*\n💵 किश्त जमा: ₹${noteModal.amount}${repMsg}${fineMsg}\n💰 कुल भुगतान: ₹${total}\n📅 महीना: ${MONTH_NAMES[now.getMonth() + 1]} ${now.getFullYear()}\nस्टेटस: स्वीकृत (Approved)\n━━━━━━━━━━━━━━━━━━━━\n👉 लाइव खाता देखें: https://merakameti.up.railway.app\n💬 WhatsApp Group: https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2`
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
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-primary-700 flex items-center gap-2">
            <span>✅</span> Payment Approvals (भुगतान अनुमोदन)
          </h1>
          {payments.length > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2.5 py-1 rounded-full font-black animate-pulse">
              {payments.length} पेंडिंग
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs mb-6">सदस्यों द्वारा जमा की गई किश्तों और लेट फाइन की रसीदें चेक करके अप्रूव या रिजेक्ट करें</p>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🎉</div>
            <p className="font-bold text-gray-600">सभी पेमेंट्स रिव्यू हो चुके हैं!</p>
            <p className="text-xs text-gray-400 mt-1">अभी कोई पेंडिंग पेमेंट नहीं है।</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map(p => {
              const repAmt = parseFloat(p.repayment_amount) || 0
              const fineAmt = parseFloat(p.late_fine) || 0
              const totalSubmitted = (parseFloat(p.amount) || 0) + repAmt + fineAmt
              return (
                <div key={p.id} className="border border-emerald-200 bg-white rounded-2xl p-4 hover:shadow-md transition-shadow space-y-3">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-slate-900">{p.member_name}</span>
                        <span className="text-gray-500 text-xs font-mono">({p.member_phone})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-emerald-700 font-black text-xl">₹ {p.amount} (किश्त)</span>
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
                        <span className="text-xs text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded-md">
                          कुल देय: ₹{totalSubmitted.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-gray-600 text-xs">
                        📅 महीना: <strong>{MONTH_NAMES[p.month]} {p.year}</strong> &nbsp;|&nbsp;
                        🔢 Ref/UTR: <span className="font-mono font-bold text-slate-900">{p.reference_no || 'N/A'}</span>
                      </div>
                      {p.note && <div className="text-gray-600 text-xs italic">📝 नोट: "{p.note}"</div>}
                      <div className="text-gray-400 text-[11px]">Submitted: {new Date(p.submitted_at).toLocaleString()}</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                      {p.screenshot_path ? (
                        <button onClick={() => setSelectedImg(p.screenshot_path)}
                          className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                          📸 स्क्रीनशॉट देखें
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">स्क्रीनशॉट नहीं है</span>
                      )}

                      {/* 1-Click Instant Approve Button */}
                      <button
                        onClick={() => handleQuickApprove(p)}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 flex items-center gap-1 transition-all transform hover:scale-105"
                      >
                        ✓ तुरंत Approve
                      </button>

                      {/* Detailed Approve Button (with Fine/Note) */}
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
                        className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                        ⚡ लेट फाइन जोड़कर
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
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                        ✕ Reject
                      </button>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedImg(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={selectedImg} alt="Payment screenshot" className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-black" />
            <button onClick={() => setSelectedImg(null)}
              className="absolute top-3 right-3 bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center font-bold hover:bg-gray-100 shadow-lg text-lg">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Note & Late Fine Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-emerald-200">
            <h3 className="text-lg font-black text-slate-900">
              {noteModal.action === 'approve' ? '✅ भुगतान स्वीकृत (Approve) करें?' : '❌ भुगतान अस्वीकृत (Reject) करें?'}
            </h3>
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-gray-700 space-y-1">
              <div>मेम्बर: <strong>{noteModal.member_name}</strong></div>
              <div>किश्त राशि: <strong className="text-emerald-700 text-sm">₹{noteModal.amount}</strong></div>
              {noteModal.repayment_amount > 0 && (
                <div className="text-indigo-700 font-bold">🔄 उठाया हुआ पैसा वापसी: ₹{noteModal.repayment_amount}</div>
              )}
            </div>

            {noteModal.action === 'approve' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ⚡ लेट फाइन (Late Fine ₹)
                </label>
                <input
                  type="number"
                  className="input text-sm font-bold text-amber-800"
                  placeholder="0"
                  value={lateFine}
                  onChange={e => setLateFine(e.target.value)}
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  यदि लेट फाइन लगाना हो तो दर्ज करें, अन्यथा 0 रहने दें।
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                📝 Note (कारण या टिप्पणी)
              </label>
              <textarea
                className="input text-sm"
                rows="2"
                placeholder={noteModal.action === 'approve' ? 'Optional note for member...' : 'Reject karne ka reason daalein...'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={actionLoading}
                className={noteModal.action === 'approve' ? 'flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 transition-all' : 'flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-sm text-white transition-colors'}>
                {actionLoading ? 'Saving...' : (noteModal.action === 'approve' ? '✓ Confirm Approve' : '✕ Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}