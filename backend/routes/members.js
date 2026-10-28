const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper to query all members with full credit and debit calculations
function getMembersWithLedger() {
  return db.prepare(`
    SELECT 
      u.id, 
      u.name, 
      u.phone, 
      u.email, 
      u.status, 
      u.created_at,
      COALESCE(p.total_credit, 0) as total_credit,
      COALESCE(p.approved_count, 0) as total_payments,
      COALESCE(r.total_debit, 0) as total_debit,
      COALESCE(r.rounds_won_count, 0) as rounds_won_count,
      COALESCE(r.rounds_won_info, '') as rounds_won_info,
      (COALESCE(p.total_credit, 0) - COALESCE(r.total_debit, 0)) as net_balance
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(amount) as total_credit, 
        COUNT(id) as approved_count
      FROM payments 
      WHERE status = 'approved'
      GROUP BY user_id
    ) p ON u.id = p.user_id
    LEFT JOIN (
      SELECT 
        winner_user_id, 
        SUM(CASE WHEN payout_amount > 0 THEN payout_amount ELSE total_collected END) as total_debit,
        COUNT(id) as rounds_won_count,
        GROUP_CONCAT(month || '/' || year, ', ') as rounds_won_info
      FROM committee_rounds
      WHERE winner_user_id IS NOT NULL
      GROUP BY winner_user_id
    ) r ON u.id = r.winner_user_id
    WHERE u.role = 'member'
    ORDER BY u.name ASC
  `).all();
}

// Get all members with full ledger details
router.get('/', authMiddleware, (req, res) => {
  const members = getMembersWithLedger();
  res.json({ data: members });
});

// Dedicated Khata / Ledger summary of all members (Overall Total Credit & Total Debit)
router.get('/ledger', authMiddleware, (req, res) => {
  const members = getMembersWithLedger();

  // Calculate overall totals
  const totalCreditAll = members.reduce((sum, m) => sum + (m.total_credit || 0), 0);
  const totalDebitAll = members.reduce((sum, m) => sum + (m.total_debit || 0), 0);
  const netBalanceAll = totalCreditAll - totalDebitAll;

  // Get chronological feed of recent transactions (Approved Deposits + Winner Payouts)
  const approvedPayments = db.prepare(`
    SELECT 
      p.id,
      p.user_id,
      u.name as member_name,
      u.phone as member_phone,
      'credit' as type,
      'जमा (Payment Deposit)' as type_label,
      p.amount,
      p.month,
      p.year,
      p.reference_no,
      p.submitted_at as date,
      'approved' as status
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved'
    ORDER BY p.submitted_at DESC
    LIMIT 30
  `).all();

  const winnerPayouts = db.prepare(`
    SELECT 
      cr.id,
      cr.winner_user_id as user_id,
      u.name as member_name,
      u.phone as member_phone,
      'debit' as type,
      'उठाया (Committee Won)' as type_label,
      (CASE WHEN cr.payout_amount > 0 THEN cr.payout_amount ELSE cr.total_collected END) as amount,
      cr.month,
      cr.year,
      cr.notes as reference_no,
      cr.created_at as date,
      'paid' as status
    FROM committee_rounds cr
    JOIN users u ON cr.winner_user_id = u.id
    WHERE cr.winner_user_id IS NOT NULL
    ORDER BY cr.created_at DESC
    LIMIT 30
  `).all();

  // Combine and sort by date descending
  const recentTransactions = [...approvedPayments, ...winnerPayouts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30);

  res.json({
    data: {
      summary: {
        total_credit: totalCreditAll,
        total_debit: totalDebitAll,
        net_balance: netBalanceAll,
        total_members: members.length
      },
      members,
      recentTransactions
    }
  });
});

// Member-specific detailed statement / passbook
router.get('/:id/statement', authMiddleware, (req, res) => {
  const memberId = parseInt(req.params.id);
  // Security check: regular member can only see their own statement unless admin
  if (req.user.role !== 'admin' && req.user.id !== memberId) {
    return res.status(403).json({ error: 'Sirf apna statement dekh sakte hain.' });
  }

  const member = db.prepare("SELECT id, name, phone, email, status, created_at FROM users WHERE id = ?").get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  const payments = db.prepare(`
    SELECT id, amount, month, year, reference_no, status, admin_note, submitted_at, reviewed_at
    FROM payments
    WHERE user_id = ?
    ORDER BY year DESC, month DESC
  `).all(memberId);

  const roundsWon = db.prepare(`
    SELECT id, month, year, total_collected, payout_amount, notes, created_at
    FROM committee_rounds
    WHERE winner_user_id = ?
    ORDER BY year DESC, month DESC
  `).all(memberId);

  const totalCredit = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDebit = roundsWon
    .reduce((sum, r) => sum + (r.payout_amount > 0 ? r.payout_amount : r.total_collected), 0);

  res.json({
    data: {
      member,
      total_credit: totalCredit,
      total_debit: totalDebit,
      net_balance: totalCredit - totalDebit,
      payments,
      roundsWon
    }
  });
});

// Toggle member status (admin only)
router.put('/:id/status', authMiddleware, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status sirf active ya inactive ho sakta hai.' });
  }
  const member = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'member'").get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Member ${status === 'active' ? 'activate' : 'deactivate'} ho gaya.` });
});

module.exports = router;
