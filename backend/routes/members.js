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
      u.profile_photo,
      u.role,
      u.status, 
      u.created_at,
      u.custom_credit,
      u.custom_debit,
      u.custom_late_fine,
      u.custom_late_fine_due,
      COALESCE(u.custom_late_fine_due, lf.total_late_fine_due, 0) as late_fine_due,
      COALESCE(u.custom_credit, p.total_credit, 0) as total_credit,
      COALESCE(u.custom_late_fine, p.total_late_fine, 0) as total_late_fine,
      COALESCE(p.approved_count, 0) as total_payments,
      COALESCE(p.total_repayment, 0) as total_repayment,
      COALESCE(u.custom_debit, MAX(0, COALESCE(r.total_debit, 0) - COALESCE(p.total_repayment, 0)), 0) as total_debit,
      COALESCE(r.rounds_won_count, 0) as rounds_won_count,
      COALESCE(r.rounds_won_info, '') as rounds_won_info,
      COALESCE(pend.pending_payment_count, 0) as pending_payment_count,
      COALESCE(pend.pending_payment_amount, 0) as pending_payment_amount,
      COALESCE(u.custom_credit, p.total_credit, 0) as net_balance
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(amount) as total_late_fine_due,
        COUNT(id) as unpaid_fines_count
      FROM late_fines 
      WHERE status = 'unpaid'
      GROUP BY user_id
    ) lf ON u.id = lf.user_id
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(amount) as total_credit, 
        SUM(COALESCE(late_fine, 0)) as total_late_fine,
        SUM(COALESCE(repayment_amount, 0)) as total_repayment,
        COUNT(id) as approved_count
      FROM payments 
      WHERE status = 'approved'
      GROUP BY user_id
    ) p ON u.id = p.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(id) as pending_payment_count,
        SUM(amount + COALESCE(repayment_amount, 0)) as pending_payment_amount
      FROM payments
      WHERE status = 'pending'
      GROUP BY user_id
    ) pend ON u.id = pend.user_id
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
    SELECT id, name, phone, email, profile_photo, status, created_at
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
  const totalLateFineDueAll = members.reduce((sum, m) => sum + (m.late_fine_due || 0), 0);
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
        total_late_fine_due: totalLateFineDueAll,
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

  const member = db.prepare("SELECT id, name, phone, email, role, status, created_at, custom_credit, custom_debit, custom_late_fine, custom_late_fine_due FROM users WHERE id = ?").get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  const payments = db.prepare(`
    SELECT id, amount, late_fine, repayment_amount, month, year, reference_no, status, admin_note, submitted_at, reviewed_at
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

  // Active Unpaid Late Fines
  const unpaidFines = db.prepare(`
    SELECT id, amount, month, year, reason, status, created_at
    FROM late_fines
    WHERE user_id = ? AND status = 'unpaid'
    ORDER BY created_at DESC
  `).all(memberId);

  const totalRepayment = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + (p.repayment_amount || 0), 0);

  const calcCredit = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const calcLateFine = payments
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + (p.late_fine || 0), 0);

  const calcDebit = Math.max(0, roundsWon
    .reduce((sum, r) => sum + (r.payout_amount > 0 ? r.payout_amount : r.total_collected), 0) - totalRepayment);

  const calcLateFineDue = unpaidFines.reduce((sum, f) => sum + (f.amount || 0), 0);

  const totalCredit = member.custom_credit !== null ? member.custom_credit : calcCredit;
  const totalDebit = member.custom_debit !== null ? member.custom_debit : calcDebit;
  const totalLateFine = member.custom_late_fine !== null ? member.custom_late_fine : calcLateFine;
  const totalLateFineDue = member.custom_late_fine_due !== null ? member.custom_late_fine_due : calcLateFineDue;

  // If member has no unpaid late fine, clear any stale late_fine alerts
  if (totalLateFineDue === 0) {
    try {
      db.prepare("DELETE FROM notifications WHERE user_id = ? AND type = 'late_fine'").run(memberId);
    } catch (e) {}
  }

  res.json({
    data: {
      member,
      total_credit: totalCredit,
      total_late_fine: totalLateFine,
      late_fine_due: totalLateFineDue,
      unpaid_fines: unpaidFines,
      total_debit: totalDebit,
      total_repayment: totalRepayment,
      net_balance: totalCredit,
      payments,
      roundsWon
    }
  });
});

// Admin Edit Member Khata / Ledger (Credit, Debit, Late Fine, Fine Due directly)
router.put('/:id/ledger-adjustment', authMiddleware, adminOnly, (req, res) => {
  const memberId = parseInt(req.params.id);
  const { total_credit, total_debit, total_late_fine, late_fine_due, note } = req.body;
  const member = db.prepare('SELECT id, name, phone FROM users WHERE id = ?').get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  const creditVal = (total_credit !== undefined && total_credit !== null && total_credit !== '') ? parseFloat(total_credit) : null;
  const debitVal = (total_debit !== undefined && total_debit !== null && total_debit !== '') ? parseFloat(total_debit) : null;
  const fineVal = (total_late_fine !== undefined && total_late_fine !== null && total_late_fine !== '') ? parseFloat(total_late_fine) : null;
  const fineDueVal = (late_fine_due !== undefined && late_fine_due !== null && late_fine_due !== '') ? parseFloat(late_fine_due) : null;

  db.prepare(`
    UPDATE users 
    SET custom_credit = ?, custom_debit = ?, custom_late_fine = ?, custom_late_fine_due = ? 
    WHERE id = ?
  `).run(creditVal, debitVal, fineVal, fineDueVal, memberId);

  if (member.phone && note) {
    notifyWhatsApp(member.phone, `ℹ️ Mera Kameti Notice: Admin dwara aapka khata hisab update kiya gaya hai:\nKul Jama (Credit): Rs. ${creditVal !== null ? creditVal : 'N/A'}\nKul Uthaya (Debit): Rs. ${debitVal !== null ? debitVal : 'N/A'}\nLate Fine Jama: Rs. ${fineVal !== null ? fineVal : 'N/A'}\nLate Fine Bakaya (Due): Rs. ${fineDueVal !== null ? fineDueVal : 'N/A'}\nNote: ${note}`);
  }

  res.json({ 
    message: `${member.name} ka khata hisab safaltapoorvak update ho gaya! ✅`,
    data: { total_credit: creditVal, total_debit: debitVal, total_late_fine: fineVal, late_fine_due: fineDueVal }
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

  // Delete all member dependencies safely inside a transaction
  const deleteTx = db.transaction(() => {
    try { db.prepare('DELETE FROM notifications WHERE user_id = ?').run(memberId); } catch(e){}
    try { db.prepare('DELETE FROM payout_requests WHERE user_id = ?').run(memberId); } catch(e){}
    try { db.prepare('DELETE FROM late_fines WHERE user_id = ?').run(memberId); } catch(e){}
    try { db.prepare('DELETE FROM payments WHERE user_id = ?').run(memberId); } catch(e){}
    try { db.prepare('UPDATE committee_rounds SET winner_user_id = NULL WHERE winner_user_id = ?').run(memberId); } catch(e){}
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

// Add / impose Late Fine on a member directly (Admin only) - Tracks as active Due
router.post('/:id/late-fine', authMiddleware, adminOnly, (req, res) => {
  const memberId = parseInt(req.params.id);
  const { amount, month, year, reason } = req.body;
  const fineAmount = parseFloat(amount);

  if (isNaN(fineAmount) || fineAmount <= 0) {
    return res.status(400).json({ error: 'Valid late fine amount daalen (jaise Rs. 100).' });
  }

  const member = db.prepare("SELECT id, name, phone, role, custom_late_fine_due FROM users WHERE id = ?").get(memberId);
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });

  const m = parseInt(month) || (new Date().getMonth() + 1);
  const y = parseInt(year) || new Date().getFullYear();

  // Insert into late_fines table as 'unpaid' Due
  const result = db.prepare(`
    INSERT INTO late_fines (user_id, amount, month, year, reason, status)
    VALUES (?, ?, ?, ?, ?, 'unpaid')
  `).run(
    memberId,
    fineAmount,
    m,
    y,
    reason || 'समय पर किश्त जमा न करने पर'
  );

  // If member had custom override, increment it
  if (member.custom_late_fine_due !== null) {
    db.prepare('UPDATE users SET custom_late_fine_due = custom_late_fine_due + ? WHERE id = ?')
      .run(fineAmount, memberId);
  }

  // Calculate updated total unpaid late fine due for this member
  const totalDueObj = db.prepare(
    "SELECT SUM(amount) as total FROM late_fines WHERE user_id = ? AND status = 'unpaid'"
  ).get(memberId);
  const totalDue = totalDueObj?.total || fineAmount;

  // Insert in-app notification for the member
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'late_fine')
    `).run(
      memberId,
      `⚡ लेट फाइन बकाया सूचना (Late Fine Due) - ${MONTH_NAMES[m]} ${y}`,
      `एडमिन द्वारा आपके खाते में ₹${fineAmount} का लेट फाइन लगाया गया है (${MONTH_NAMES[m]} ${y})। कुल लेट फाइन बकाया: ₹${totalDue}। कारण: ${reason || 'समय पर किश्त जमा न करने पर'}। कृपया Pay पेज पर जाकर इसे जमा करें।`
    );
  } catch (err) {
    console.error('Notification error:', err);
  }

  // Notify member via WhatsApp placeholder
  if (member.phone) {
    notifyWhatsApp(member.phone, `⚠️ Mera Kameti Notice: Admin dwara aapke khate me Rs. ${fineAmount} ka Late Fine Due lagaya gaya hai (${MONTH_NAMES[m]} ${y}).\nKul Bakaya Late Fine: Rs. ${totalDue}\nKaran: ${reason || 'Kisht time par jama na karne par'}\nKripya Pay page par jakar ise jama karein: https://merakameti.vercel.app/pay\n- Mera Kameti`);
  }

  res.json({ 
    message: `${member.name} के खाते में ₹${fineAmount} का लेट फाइन बकाया (Due) दर्ज हो गया! ✅`,
    data: {
      fineId: result.lastInsertRowid,
      memberId,
      name: member.name,
      phone: member.phone,
      amount: fineAmount,
      total_late_fine_due: totalDue,
      month: m,
      year: y,
      reason: reason || 'समय पर किश्त जमा न करने पर'
    }
  });
});

// Admin Get Member's All Late Fines (Unpaid & Paid)
router.get('/:id/late-fines', authMiddleware, (req, res) => {
  const memberId = parseInt(req.params.id);
  const fines = db.prepare(`
    SELECT * FROM late_fines 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(memberId);
  res.json({ data: fines });
});

// Admin Waive / Remove an Unpaid Late Fine
router.delete('/:id/late-fine/:fineId', authMiddleware, adminOnly, (req, res) => {
  const memberId = parseInt(req.params.id);
  const fineId = parseInt(req.params.fineId);

  const fine = db.prepare("SELECT * FROM late_fines WHERE id = ? AND user_id = ? AND status = 'unpaid'").get(fineId, memberId);
  if (!fine) return res.status(404).json({ error: 'Unpaid late fine record nahi mila.' });

  db.prepare("DELETE FROM late_fines WHERE id = ?").run(fineId);

  // If user had custom_late_fine_due, deduct it
  try {
    db.prepare('UPDATE users SET custom_late_fine_due = MAX(0, custom_late_fine_due - ?) WHERE id = ? AND custom_late_fine_due IS NOT NULL')
      .run(fine.amount, memberId);
  } catch(e) {}

  res.json({ message: `₹${fine.amount} का लेट फाइन सफलतापूर्वक माफ / हटा दिया गया! ✅` });
});

// Admin Reset Member Password
router.put('/:id/reset-password', authMiddleware, adminOnly, async (req, res) => {
  const memberId = parseInt(req.params.id);
  const { new_password } = req.body;
  const pass = new_password && new_password.trim() ? new_password.trim() : '123456';

  let member = db.prepare('SELECT id, name, phone, role FROM users WHERE id = ?').get(memberId);
  if (!member) {
    try {
      await db.refreshFromGitHub(true);
      member = db.prepare('SELECT id, name, phone, role FROM users WHERE id = ?').get(memberId);
    } catch (e) {}
  }
  if (!member) return res.status(404).json({ error: 'Member nahi mila.' });
  if (member.role === 'admin') return res.status(400).json({ error: 'Admin password yahan se reset nahi kiya ja sakta.' });

  const hashedPassword = bcrypt.hashSync(pass, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, memberId);

  // Immediately commit updated password to GitHub
  await db.syncToGitHub();

  if (member.phone) {
    notifyWhatsApp(member.phone, `🔐 Mera Kameti: Admin dwara aapka password reset karke '${pass}' kar diya gaya hai. Ab aap login kar sakte hain.`);
  }

  res.json({ message: `${member.name} ka password reset ho gaya! Naya password: ${pass} ✅` });
});

module.exports = router;
