const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { notifyWhatsApp } = require('../utils/whatsapp');
const bcrypt = require('bcryptjs');

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper to query all approved participants with full ledger details
function getMembersWithLedger() {
  return db.prepare(`
    SELECT 
      u.id, 
      u.name, 
      u.phone, 
      u.email, 
      u.role,
      u.status, 
      u.created_at,
      COALESCE(p.total_credit, 0) as total_credit,
      COALESCE(p.total_late_fine, 0) as total_late_fine,
      COALESCE(p.approved_count, 0) as total_payments,
      COALESCE(r.total_debit, 0) as total_debit,
      COALESCE(r.rounds_won_count, 0) as rounds_won_count,
      COALESCE(r.rounds_won_info, '') as rounds_won_info,
      ((COALESCE(p.total_credit, 0) + COALESCE(p.total_late_fine, 0)) - COALESCE(r.total_debit, 0)) as net_balance
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(amount) as total_credit, 
        SUM(COALESCE(late_fine, 0)) as total_late_fine,
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
    WHERE u.status IN ('active', 'inactive')
    ORDER BY (CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END), u.name ASC
  `).all();
}

// Get all members with full ledger details
router.get('/', authMiddleware, (req, res) => {
  const members = getMembersWithLedger();
  res.json({ data: members });
});

// Get pending member registrations waiting for Admin approval
router.get('/pending-registrations', authMiddleware, adminOnly, (req, res) => {
  const pending = db.prepare(`
    SELECT id, name, phone, email, status, created_at
    FROM users
    WHERE role = 'member' AND status = 'pending'
    ORDER BY created_at DESC
  `).all();
  res.json({ data: pending });
});

// Approve member registration (Admin only)
router.put('/:id/approve-registration', authMiddleware, adminOnly, (req, res) => {
  const user = db.prepare("SELECT id, name, phone, status FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User nahi mila.' });

  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(req.params.id);

  // Notify member via WhatsApp placeholder
  notifyWhatsApp(user.phone, `🎉 Mubarak ho ${user.name}!\nAapka Mera Kameti account Admin dwara approve kar diya gaya hai. Ab aap login kar sakte hain!\n- Mera Kameti`);

  res.json({ message: `${user.name} ka account approve ho gaya! Ab yeh login kar sakte hain. ✅` });
});

// Reject member registration (Admin only)
router.put('/:id/reject-registration', authMiddleware, adminOnly, (req, res) => {
  const user = db.prepare("SELECT id, name, phone, status FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User nahi mila.' });

  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(req.params.id);

  notifyWhatsApp(user.phone, `Aapka Mera Kameti registration request Admin dwara reject kar diya gaya hai.`);

  res.json({ message: `${user.name} ka registration request reject kar diya gaya.` });
});

// Dedicated Khata / Ledger summary of all members (Overall Total Credit, Debit, Late Fine)
router.get('/ledger', authMiddleware, (req, res) => {
  const members = getMembersWithLedger();

  // Calculate overall totals
  const totalCreditAll = members.reduce((sum, m) => sum + (m.total_credit || 0), 0);
  const totalLateFineAll = members.reduce((sum, m) => sum + (m.total_late_fine || 0), 0);
  const totalDebitAll = members.reduce((sum, m) => sum + (m.total_debit || 0), 0);
  const netBalanceAll = (totalCreditAll + totalLateFineAll) - totalDebitAll;

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
      COALESCE(p.late_fine, 0) as late_fine,
      p.month,
      p.year,
      p.reference_no,
      p.submitted_at as date,
      'approved' as status
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved'
    ORDER BY p.submitted_at DESC
    LIMIT 40
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
      0 as late_fine,
      cr.month,
      cr.year,
      cr.notes as reference_no,
      cr.created_at as date,
      'paid' as status
    FROM committee_rounds cr
    JOIN users u ON cr.winner_user_id = u.id
    WHERE cr.winner_user_id IS NOT NULL
    ORDER BY cr.created_at DESC
    LIMIT 40
  `).all();

  const recentTransactions = [...approvedPayments, ...winnerPayouts]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 40);

  res.json({
    data: {
      summary: {
        total_credit: totalCreditAll,
        total_late_fine: totalLateFineAll,
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
  if (req.user.role !== 'admin' && req.user.id !== memberId) {
    return res.status(403).json({ error: 'Sirf apna statement dekh sakte hain.' });
  }

  const member = db.prepare("SELECT id, name, phone, email, role, status, created_at FROM users WHERE id = ?").get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  const payments = db.prepare(`
    SELECT id, amount, late_fine, month, year, reference_no, status, admin_note, submitted_at, reviewed_at
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

  const totalLateFine = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + (p.late_fine || 0), 0);

  const totalDebit = roundsWon
    .reduce((sum, r) => sum + (r.payout_amount > 0 ? r.payout_amount : r.total_collected), 0);

  res.json({
    data: {
      member,
      total_credit: totalCredit,
      total_late_fine: totalLateFine,
      total_debit: totalDebit,
      net_balance: (totalCredit + totalLateFine) - totalDebit,
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
  const member = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });
  if (member.role === 'admin') return res.status(400).json({ error: 'Admin ko deactivate nahi kiya ja sakta.' });

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Member ${status === 'active' ? 'activate' : 'deactivate'} ho gaya.` });
});

// Remove / Delete member permanently (Admin only)
router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const memberId = parseInt(req.params.id);
  const member = db.prepare("SELECT id, name, phone, role FROM users WHERE id = ?").get(memberId);
  if (!member) {
    return res.status(404).json({ error: 'Member nahi mila.' });
  }
  if (member.role === 'admin') {
    return res.status(400).json({ error: 'Admin account ko remove nahi kiya ja sakta.' });
  }

  // Delete all member payments and unlink from committee rounds, then delete user
  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM payments WHERE user_id = ?').run(memberId);
    db.prepare('UPDATE committee_rounds SET winner_user_id = NULL WHERE winner_user_id = ?').run(memberId);
    db.prepare('DELETE FROM users WHERE id = ?').run(memberId);
  });

  try {
    deleteTx();
    if (member.phone) {
      notifyWhatsApp(member.phone, `Aapka account Mera Kameti se remove kar diya gaya hai.`);
    }
    res.json({ message: `${member.name} ko kameti se safaltapoorvak remove kar diya gaya. 🗑️` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Member remove karne me truti aayi: ' + err.message });
  }
});

// Add / impose Late Fine on a member directly (Admin only)
router.post('/:id/late-fine', authMiddleware, adminOnly, (req, res) => {
  const memberId = parseInt(req.params.id);
  const { amount, month, year, reason } = req.body;
  const fineAmount = parseFloat(amount);

  if (isNaN(fineAmount) || fineAmount <= 0) {
    return res.status(400).json({ error: 'Valid late fine amount daalen (jaise Rs. 100).' });
  }

  const member = db.prepare("SELECT id, name, phone, role FROM users WHERE id = ?").get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();

  // Check if there is already a payment for this user, month & year
  const existingPayment = db.prepare(
    "SELECT id, amount, late_fine, admin_note FROM payments WHERE user_id = ? AND month = ? AND year = ? AND status != 'rejected' ORDER BY id DESC LIMIT 1"
  ).get(memberId, m, y);

  if (existingPayment) {
    const newFine = (existingPayment.late_fine || 0) + fineAmount;
    const noteText = `Late fine Rs. ${fineAmount} added${reason ? ' (' + reason + ')' : ''}`;
    const updatedNote = existingPayment.admin_note 
      ? `${existingPayment.admin_note} | ${noteText}` 
      : noteText;

    db.prepare(`
      UPDATE payments 
      SET late_fine = ?, admin_note = ?
      WHERE id = ?
    `).run(newFine, updatedNote, existingPayment.id);
  } else {
    // Insert a standalone late fine record
    db.prepare(`
      INSERT INTO payments (user_id, amount, late_fine, month, year, status, note, admin_note, reviewed_at)
      VALUES (?, 0, ?, ?, ?, 'approved', ?, ?, CURRENT_TIMESTAMP)
    `).run(
      memberId,
      fineAmount,
      m,
      y,
      `Late Fine: ${reason || 'Late payment penalty'}`,
      `Admin dwara late fine lagaya gaya: Rs. ${fineAmount}${reason ? ' (' + reason + ')' : ''}`
    );
  }

  // Notify member via WhatsApp placeholder
  if (member.phone) {
    notifyWhatsApp(member.phone, `⚠️ Mera Kameti Notice: Admin dwara aapke khate me Rs. ${fineAmount} ka Late Fine lagaya gaya hai (${MONTH_NAMES[m]} ${y}).\nKaran: ${reason || 'Kisht time par jama na karne par'}\n- Mera Kameti`);
  }

  res.json({ message: `${member.name} ke khate me Rs. ${fineAmount} ka Late Fine safaltapoorvak jod diya gaya! ✅` });
});

// Admin Reset Member Password
router.put('/:id/reset-password', authMiddleware, adminOnly, (req, res) => {
  const memberId = parseInt(req.params.id);
  const { new_password } = req.body;
  const pass = new_password && new_password.trim() ? new_password.trim() : '123456';

  const member = db.prepare('SELECT id, name, phone, role FROM users WHERE id = ?').get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });
  if (member.role === 'admin') return res.status(400).json({ error: 'Admin password yahan se reset nahi kiya ja sakta.' });

  const hashedPassword = bcrypt.hashSync(pass, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, memberId);

  if (member.phone) {
    notifyWhatsApp(member.phone, `🔐 Mera Kameti: Admin dwara aapka password reset karke '${pass}' kar diya gaya hai. Ab aap login kar sakte hain.`);
  }

  res.json({ message: `${member.name} ka password reset ho gaya! Naya password: ${pass} ✅` });
});

module.exports = router;
