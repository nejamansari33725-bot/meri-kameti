import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Members() {
  const now = new Date()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Late Fine Modal state
  const [fineModal, setFineModal] = useState(null) // { memberId, memberName, phone }
  const [fineAmount, setFineAmount] = useState('')
  const [fineMonth, setFineMonth] = useState(now.getMonth() + 1)
  const [fineYear, setFineYear] = useState(now.getFullYear())
  const [fineReason, setFineReason] = useState('')
  const [submittingFine, setSubmittingFine] = useState(false)

  // Direct Khata / Ledger Edit Modal state (Admin edit: Total Credit, Debit, Late Fine)
  const [editKhataModal, setEditKhataModal] = useState(null)
  const [editCredit, setEditCredit] = useState('')
  const [editDebit, setEditDebit] = useState('')
  const [editLateFine, setEditLateFine] = useState('')
  const [editNote, setEditNote] = useState('')
  const [savingKhata, setSavingKhata] = useState(false)

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

  const handleRemoveMember = async (id, name) => {
    if (!window.confirm(`⚠️ क्या आप वाकई "${name}" को कमिटी से हटाना (Remove) चाहते हैं?\n\nसावधानी: इस सदस्य का सारा पेमेंट रिकॉर्ड और प्रोफाइल हमेशा के लिए हटा दिया जाएगा!`)) {
      return
    }
    try {
      const res = await api.delete(`/members/${id}`)
      toast.success(res.data?.message || `${name} को हटा दिया गया।`)
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'सदस्य को हटाने में त्रुटि आई।')
    }
  }

  const handleResetPassword = async (id, name) => {
    const newPass = window.prompt(`🔑 "${name}" के लिए नया पासवर्ड दर्ज करें (खाली छोड़ने पर '123456' सेट होगा):`, '123456')
    if (newPass === null) return
    try {
      const res = await api.put(`/members/${id}/reset-password`, { new_password: newPass })
      toast.success(res.data?.message || 'पासवर्ड रीसेट हो गया! ✅')
    } catch (err) {
      toast.error(err.response?.data?.error || 'त्रुटि आई।')
    }
  }

  const handleAddFine = async (e) => {
    e.preventDefault()
    if (!fineAmount || parseFloat(fineAmount) <= 0) {
      return toast.error('कृपया सही लेट फाइन राशि दर्ज करें।')
    }
    setSubmittingFine(true)
    try {
      const res = await api.post(`/members/${fineModal.memberId}/late-fine`, {
        amount: parseFloat(fineAmount),
        month: fineMonth,
        year: fineYear,
        reason: fineReason
      })
      toast.success(res.data?.message || 'लेट फाइन दर्ज हो गया! ✅')
      setFineModal(null)
      setFineAmount('')
      setFineReason('')
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'लेट फाइन दर्ज करने में त्रुटि आई।')
    } finally {
      setSubmittingFine(false)
    }
  }

  const handleSaveKhata = async (e) => {
    e.preventDefault()
    setSavingKhata(true)
    try {
      const res = await api.put(`/members/${editKhataModal.id}/ledger-adjustment`, {
        total_credit: editCredit,
        total_debit: editDebit,
        total_late_fine: editLateFine,
        note: editNote
      })
      toast.success(res.data?.message || 'खाता हिसाब अपडेट हो गया! ✅')
      setEditKhataModal(null)
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'खाता अपडेट करने में त्रुटि आई।')
    } finally {
      setSavingKhata(false)
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
                  <th className="py-3 px-3 text-center">एक्शन (Actions)</th>
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
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* 1. Direct Khata / Ledger Edit button */}
                        <button
                          onClick={() => {
                            setEditKhataModal(m)
                            setEditCredit(m.total_credit || 0)
                            setEditDebit(m.total_debit || 0)
                            setEditLateFine(m.total_late_fine || 0)
                            setEditNote('')
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors flex items-center gap-1 shadow-sm"
                          title="कुल जमा, उठाया और लेट फाइन सीधे बदलें"
                        >
                          <span>✏️</span> खाता एडिट
                        </button>

                        {/* 2. Impose late fine button */}
                        <button
                          onClick={() => {
                            setFineModal({ memberId: m.id, memberName: m.name, phone: m.phone })
                            setFineAmount('')
                            setFineReason('')
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1 shadow-sm"
                          title="लेट फाइन जोड़ें"
                        >
                          <span>⚡</span> लेट फाइन
                        </button>

                        {m.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleResetPassword(m.id, m.name)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 shadow-sm"
                              title="पासवर्ड रीसेट करें"
                            >
                              <span>🔑</span>
                            </button>

                            <button
                              onClick={() => toggleStatus(m.id, m.status)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                m.status === 'active'
                                  ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                              }`}
                              title="एक्टिव या इन-एक्टिव बदलें"
                            >
                              {m.status === 'active' ? '🟢' : '⚪'}
                            </button>

                            <button
                              onClick={() => handleRemoveMember(m.id, m.name)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 shadow-sm"
                              title="कमिटी से मेम्बर हटाएं"
                            >
                              <span>🗑️</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Khata / Ledger Adjustment Modal (Admin Edit Paisa) */}
      {editKhataModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-300 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✏️ सदस्य खाता एडिट (Edit Member Khata)
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-2">
                  {editKhataModal.name}
                </h2>
                <p className="text-xs text-gray-500 font-mono">📱 {editKhataModal.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditKhataModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 <strong>नोट:</strong> यहाँ आप सदस्य का कुल जमा (Credit), कुल उठाया हुआ (Debit), और लेट फाइन सीधे बदल सकते हैं। यह परिवर्तन तुरंत सदस्य के खाते और खाता-बही में दिखने लगेगा।
            </p>

            <form onSubmit={handleSaveKhata} className="space-y-4">
              
              {/* Credit Input */}
              <div>
                <label className="block text-xs font-bold text-emerald-800 uppercase mb-1 flex items-center justify-between">
                  <span>🟢 कुल जमा किया (Total Credit ₹)</span>
                  <span className="text-[10px] text-gray-400 font-normal">पहले था: ₹{editKhataModal.total_credit || 0}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  className="input font-bold text-emerald-700 text-lg"
                  value={editCredit}
                  onChange={e => setEditCredit(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-0.5">कमिटी में अब तक जमा कुल किश्तें</p>
              </div>

              {/* Debit Input */}
              <div>
                <label className="block text-xs font-bold text-red-800 uppercase mb-1 flex items-center justify-between">
                  <span>🔴 कुल उठाया हुआ (Total Debit ₹)</span>
                  <span className="text-[10px] text-gray-400 font-normal">पहले था: ₹{editKhataModal.total_debit || 0}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  className="input font-bold text-red-600 text-lg"
                  value={editDebit}
                  onChange={e => setEditDebit(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-0.5">कमिटी से अब तक उठाया गया कुल पैसा</p>
              </div>

              {/* Late Fine Input */}
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1 flex items-center justify-between">
                  <span>⚡ कुल लेट फाइन (Total Late Fine ₹)</span>
                  <span className="text-[10px] text-gray-400 font-normal">पहले था: ₹{editKhataModal.total_late_fine || 0}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  className="input font-bold text-amber-800 text-lg"
                  value={editLateFine}
                  onChange={e => setEditLateFine(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-0.5">कुल लगाया गया लेट जुर्माना</p>
              </div>

              {/* Calculated Net Preview */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 flex justify-between items-center text-xs">
                <span className="font-bold text-indigo-900">नया नेट बैलेंस (Net Balance Preview):</span>
                <span className="font-extrabold text-sm text-indigo-700">
                  ₹ {((parseFloat(editCredit || 0) + parseFloat(editLateFine || 0)) - parseFloat(editDebit || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  📝 कारण या टिप्पणी (Reason / Note)
                </label>
                <input
                  type="text"
                  placeholder="e.g. कैश से जमा किया / हिसाब मिलान किया"
                  className="input text-sm"
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditKhataModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-50 transition-all"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingKhata}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  {savingKhata ? 'सेव हो रहा है...' : '💾 खाता सुरक्षित करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Late Fine Modal for Admin */}
      {fineModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  ⚡ लेट फाइन जोड़ें (Levy Late Fine)
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-2">
                  {fineModal.memberName}
                </h2>
                <p className="text-xs text-gray-500 font-mono">📱 {fineModal.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setFineModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFine} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  💵 लेट फाइन की रकम (Fine Amount in ₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 100, 200, 500"
                  className="input font-bold text-amber-800 text-lg"
                  value={fineAmount}
                  onChange={e => setFineAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    📅 महीना (Month)
                  </label>
                  <select
                    className="input text-sm"
                    value={fineMonth}
                    onChange={e => setFineMonth(parseInt(e.target.value))}
                  >
                    {MONTH_NAMES.slice(1).map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    📅 साल (Year)
                  </label>
                  <select
                    className="input text-sm"
                    value={fineYear}
                    onChange={e => setFineYear(parseInt(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  📝 कारण या नोट (Reason / Note)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10 तारीख के बाद जमा करने का फाइन"
                  className="input text-sm"
                  value={fineReason}
                  onChange={e => setFineReason(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
                💡 यह फाइन सदस्य के खाते में तुरंत जुड़ जाएगा और सदस्य को भी अपनी पेमेंट स्क्रीन पर दिखेगा।
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFineModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-50 transition-all"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submittingFine}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-sm text-white shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  {submittingFine ? 'जोड़ रहे हैं...' : '⚡ फाइन लगाएं'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}