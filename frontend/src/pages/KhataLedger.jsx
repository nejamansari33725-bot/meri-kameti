import { useEffect, useState } from 'react'
import api from '../api/axios'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function KhataLedger() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [statement, setStatement] = useState(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('members') // 'members' | 'transactions'

  const fetchLedger = () => {
    setLoading(true)
    api.get('/members/ledger')
      .then(res => setData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLedger()
  }, [])

  const openStatement = (member) => {
    setSelectedMember(member)
    setStatementLoading(true)
    api.get(`/members/${member.id}/statement`)
      .then(res => setStatement(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setStatementLoading(false))
  }

  const closeStatement = () => {
    setSelectedMember(null)
    setStatement = null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  const summary = data?.summary || { total_credit: 0, total_debit: 0, net_balance: 0, total_members: 0 }
  const members = data?.members || []
  const transactions = data?.recentTransactions || []

  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  )

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-primary-700 to-teal-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span>📖</span> कमिटी खाता बही (Khata Ledger)
            </h1>
            <p className="text-emerald-100 mt-1">
              सभी सदस्यों का कुल जमा (Credit) और कुल उठाया गया (Debit) हिसाब-किताब
            </p>
          </div>
          <button
            onClick={fetchLedger}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur transition-all flex items-center gap-1.5"
          >
            🔄 रिफ्रेश करें
          </button>
        </div>
      </div>

      {/* Big Highlights: Total Credit, Total Debit, Net Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credit */}
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-800 uppercase tracking-wider">कुल जमा (Credit)</span>
            <span className="text-2xl">🟢</span>
          </div>
          <div className="text-3xl font-extrabold text-green-700 mt-2">
            ₹ {summary.total_credit?.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-green-600 mt-1">
            सभी सदस्यों द्वारा जमा की गई कुल राशि
          </p>
        </div>

        {/* Total Debit */}
        <div className="card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-red-800 uppercase tracking-wider">कुल उठाया (Debit)</span>
            <span className="text-2xl">🔴</span>
          </div>
          <div className="text-3xl font-extrabold text-red-700 mt-2">
            ₹ {summary.total_debit?.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-red-600 mt-1">
            कमेटी विनर को दी गई / उठाई गई कुल राशि
          </p>
        </div>

        {/* Net Fund Balance */}
        <div className={`card ${
          summary.net_balance >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' 
            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">तिजोरी शेष (Net Balance)</span>
            <span className="text-2xl">💼</span>
          </div>
          <div className={`text-3xl font-extrabold mt-2 ${summary.net_balance >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
            ₹ {summary.net_balance?.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {summary.net_balance >= 0 ? 'कमेटी फंड में मौजूद शेष बचत' : 'अग्रिम दी गई राशि'}
          </p>
        </div>

        {/* Total Members */}
        <div className="card bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-purple-900 uppercase tracking-wider">कुल सदस्य</span>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-3xl font-extrabold text-purple-700 mt-2">
            {summary.total_members} मेम्बर
          </div>
          <p className="text-xs text-purple-600 mt-1">
            कमेटी में जुड़े सभी सक्रिय सदस्य
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'members'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 सभी सदस्यों का हिसाब ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'transactions'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📜 लेन-देन डायरी (Recent Entries)
            </button>
          </div>

          {activeTab === 'members' && (
            <div className="w-full sm:w-64">
              <input
                type="text"
                className="input text-sm"
                placeholder="🔍 नाम या फोन से खोजें..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Tab 1: Member-wise Ledger Table */}
        {activeTab === 'members' && (
          <div className="overflow-x-auto">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <span className="text-4xl block mb-2">🔍</span>
                कोई सदस्य नहीं मिला।
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50/70">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">सदस्य का नाम</th>
                    <th className="py-3 px-3">मोबाइल</th>
                    <th className="py-3 px-3 text-right text-green-700 font-bold">कुल जमा (Credit)</th>
                    <th className="py-3 px-3 text-right text-red-700 font-bold">कुल उठाया (Debit)</th>
                    <th className="py-3 px-3 text-right font-bold">नेट बैलेंस (Net)</th>
                    <th className="py-3 px-3 text-center">कमेटी स्थिति</th>
                    <th className="py-3 px-3 text-center">पासबुक</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-3.5 px-3 font-semibold text-gray-900">
                        {m.name}
                        {m.status === 'inactive' && (
                          <span className="ml-2 text-xs text-red-500 font-normal">(Inactive)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-gray-600 font-mono text-xs">{m.phone}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-green-600">
                        ₹ {m.total_credit?.toLocaleString('en-IN')}
                        <span className="block text-[11px] font-normal text-gray-400">
                          {m.total_payments || 0} किश्तें
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-red-600">
                        ₹ {m.total_debit?.toLocaleString('en-IN')}
                        <span className="block text-[11px] font-normal text-gray-400">
                          {m.rounds_won_count > 0 ? `${m.rounds_won_count} बार उठाई` : '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {m.net_balance > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            + ₹{m.net_balance.toLocaleString('en-IN')} (जमा)
                          </span>
                        ) : m.net_balance < 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            - ₹{Math.abs(m.net_balance).toLocaleString('en-IN')} (उठाया)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            ₹ 0 (बराबर)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {m.rounds_won_count > 0 ? (
                          <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                            🏆 {m.rounds_won_count} बार ({m.rounds_won_info})
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">अभी नहीं उठाई</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => openStatement(m)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          📋 खाता देखें
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Recent Transactions Stream */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">अभी तक कोई लेन-देन दर्ज नहीं हुआ है।</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <div key={`${t.type}-${t.id}`} className="py-3 px-2 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.type === 'credit' ? '⬇️' : '⬆️'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {t.member_name}
                          <span className="text-xs text-gray-400 font-mono">({t.member_phone})</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.type_label} &nbsp;•&nbsp; महीना: {MONTH_NAMES[t.month]} {t.year}
                          {t.reference_no && ` • Ref: ${t.reference_no}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold text-base ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'credit' ? '+' : '-'} ₹ {t.amount?.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(t.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member Passbook Statement Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>👤</span> {selectedMember.name} की पासबुक
                </h3>
                <p className="text-sm text-gray-500">मोबाइल: {selectedMember.phone}</p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold">
                ✕
              </button>
            </div>

            {statementLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
              </div>
            ) : statement ? (
              <div className="space-y-4">
                {/* Statement Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-center">
                    <span className="text-xs text-green-700 font-semibold uppercase block">कुल जमा</span>
                    <span className="text-lg font-bold text-green-700">₹ {statement.total_credit?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                    <span className="text-xs text-red-700 font-semibold uppercase block">कुल उठाया</span>
                    <span className="text-lg font-bold text-red-700">₹ {statement.total_debit?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                    <span className="text-xs text-indigo-700 font-semibold uppercase block">बाकी शेष</span>
                    <span className={`text-lg font-bold ${statement.net_balance >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                      ₹ {statement.net_balance?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Committee Payouts Won */}
                {statement.roundsWon && statement.roundsWon.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="font-semibold text-amber-900 text-sm mb-2 flex items-center gap-1.5">
                      <span>🏆</span> उठाई गई कमेटियाँ (Debits)
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {statement.roundsWon.map(r => (
                        <div key={r.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-200">
                          <span className="font-medium text-gray-800">
                            {MONTH_NAMES[r.month]} {r.year} की कमिटी
                          </span>
                          <span className="font-bold text-red-600">
                            - ₹ {(r.payout_amount > 0 ? r.payout_amount : r.total_collected)?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm mb-2">जमा की गई किश्तों का विवरण:</h4>
                  {statement.payments && statement.payments.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                      {statement.payments.map(p => (
                        <div key={p.id} className="p-2.5 flex justify-between items-center text-xs hover:bg-gray-50">
                          <div>
                            <span className="font-semibold text-gray-800">
                              {MONTH_NAMES[p.month]} {p.year}
                            </span>
                            {p.reference_no && <span className="text-gray-400 ml-2">Ref: {p.reference_no}</span>}
                            <span className="text-gray-400 block text-[10px]">
                              {new Date(p.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-green-700 block">
                              + ₹ {p.amount?.toLocaleString('en-IN')}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                              p.status === 'approved' ? 'bg-green-100 text-green-700' :
                              p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs">कोई पेमेंट दर्ज नहीं है।</p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedMember(null)}
                className="btn-secondary text-sm px-4 py-2"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
