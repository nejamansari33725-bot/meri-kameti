const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { notifyWhatsApp } = require('../utils/whatsapp');

// Get all committee rounds
router.get('/rounds', authMiddleware, (req, res) => {
  const rounds = db.prepare(`
    SELECT r.*, u.name as winner_name, u.phone as winner_phone
    FROM committee_rounds r
    LEFT JOIN users u ON r.winner_user_id = u.id
    ORDER BY r.year DESC, r.month DESC
  `).all();
  res.json({ data: rounds });
});

// Get current month and overall committee summary
router.get('/summary', authMiddleware, (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // This month collected
  const totalCollected = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(month, year);

  // This month pending payments
  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM payments
    WHERE month = ? AND year = ? AND status = 'pending'
  `).get(month, year);

  // Pending Member registrations waiting for approval
  const pendingMembers = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE role = 'member' AND status = 'pending'
  `).get();

  // This month winner
  const winner = db.prepare(`
    SELECT r.*, u.name as winner_name
    FROM committee_rounds r
    LEFT JOIN users u ON r.winner_user_id = u.id
    WHERE r.month = ? AND r.year = ?
  `).get(month, year);

  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get();
  const paidMembers = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(month, year);

  // Lifetime Overall Credit (All approved payments)
  const allCredit = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'approved'
  `).get();

  // Lifetime Overall Late Fine
  const allLateFine = db.prepare(`
    SELECT COALESCE(SUM(COALESCE(late_fine, 0)), 0) as total FROM payments WHERE status = 'approved'
  `).get();

  // Lifetime Overall Debit (All payouts to winners)
  const allDebit = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN payout_amount > 0 THEN payout_amount ELSE total_collected END), 0) as total
    FROM committee_rounds
    WHERE winner_user_id IS NOT NULL
  `).get();

  res.json({
    data: {
      month, year,
      totalCollected: totalCollected.total,
      pendingCount: pendingCount.count,
      pendingMembersCount: pendingMembers.count,
      winner: winner || null,
      totalMembers: totalMembers.count,
      paidMembers: paidMembers.count,
      overallTotalCredit: allCredit.total,
      overallTotalLateFine: allLateFine.total,
      overallTotalDebit: allDebit.total,
      overallNetBalance: (allCredit.total + allLateFine.total) - allDebit.total
    }
  });
});

// Assign winner for a month (admin)
router.post('/rounds', authMiddleware, adminOnly, (req, res) => {
  const { month, year, winner_user_id, payout_amount, notes } = req.body;
  if (!month || !year || !winner_user_id) {
    return res.status(400).json({ error: 'Month, year aur winner zaroori hain.' });
  }

  // Get total collected for that month
  const totalCollected = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(parseInt(month), parseInt(year));

  const actualPayout = payout_amount && parseFloat(payout_amount) > 0 
    ? parseFloat(payout_amount) 
    : totalCollected.total;

  // Check if round already exists
  const existing = db.prepare('SELECT id FROM committee_rounds WHERE month = ? AND year = ?').get(parseInt(month), parseInt(year));
  if (existing) {
    db.prepare(`
      UPDATE committee_rounds 
      SET winner_user_id = ?, total_collected = ?, payout_amount = ?, notes = ? 
      WHERE month = ? AND year = ?
    `).run(parseInt(winner_user_id), totalCollected.total, actualPayout, notes || null, parseInt(month), parseInt(year));
  } else {
    db.prepare(`
      INSERT INTO committee_rounds (month, year, winner_user_id, total_collected, payout_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(parseInt(month), parseInt(year), parseInt(winner_user_id), totalCollected.total, actualPayout, notes || null);
  }

  // Notify winner
  const winner = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(parseInt(winner_user_id));
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  if (winner) {
    notifyWhatsApp(winner.phone, `🎉 Mubarak ho ${winner.name}!\nAap is mahine (${monthNames[month]} ${year}) ki committee jeet gaye hain!\nUthayi hui raashi: Rs. ${actualPayout}\n- Mera Kameti`);
  }

  res.json({ message: `${winner?.name} ko winner set kar diya gaya! (Rs. ${actualPayout})` });
});

// Get members with their payment status for a specific month (distinct, no duplicate rows)
router.get('/members-status', authMiddleware, adminOnly, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Month aur year daalen.' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.phone,
      COALESCE((
        SELECT SUM(amount) FROM payments 
        WHERE user_id = u.id AND month = ? AND year = ? AND status = 'approved'
      ), 0) as amount,
      (SELECT COUNT(id) FROM committee_rounds WHERE winner_user_id = u.id) as previous_wins
    FROM users u
    WHERE u.status = 'active'
    ORDER BY u.name ASC
  `).all(parseInt(month), parseInt(year));

  res.json({ data: members });
});

// Member Apply for Committee Payout / Bid
router.post('/apply-payout', authMiddleware, (req, res) => {
  const { month, year, requested_amount, reason } = req.body;
  if (!month || !year || !requested_amount) {
    return res.status(400).json({ error: 'Month, Year aur Requested Amount bharna zaroori hai.' });
  }

  const amt = parseFloat(requested_amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Valid amount daalen.' });
  }

  // Check if member already applied for this month
  const existing = db.prepare("SELECT id FROM payout_requests WHERE user_id = ? AND month = ? AND year = ? AND status = 'pending'").get(req.user.id, parseInt(month), parseInt(year));
  if (existing) {
    db.prepare('UPDATE payout_requests SET requested_amount = ?, reason = ? WHERE id = ?').run(amt, reason || null, existing.id);
    return res.json({ message: 'Aapka aavedan update ho gaya! ✅' });
  }

  db.prepare(`
    INSERT INTO payout_requests (user_id, month, year, requested_amount, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, parseInt(month), parseInt(year), amt, reason || null);

  // Notify admin
  const admin = db.prepare("SELECT phone FROM users WHERE role = 'admin' LIMIT 1").get();
  if (admin) {
    notifyWhatsApp(admin.phone, `🙋‍♂️ Naya Committee Payout Application!\nMember: ${req.user.name} (${req.user.phone})\nMaangi gayi Rakam: Rs. ${amt}\nMonth: ${month}/${year}\nReason: ${reason || 'Zaroorat'}`);
  }

  res.json({ message: 'Aapka aavedan safaltapoorvak bhej diya gaya hai! Admin winner chunenge tab faisla hoga. ✅' });
});

// Member Get My Payout Requests
router.get('/my-payout-requests', authMiddleware, (req, res) => {
  const requests = db.prepare(`
    SELECT * FROM payout_requests WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ data: requests });
});

// Admin Get Payout Requests for a Month
router.get('/payout-requests', authMiddleware, adminOnly, (req, res) => {
  const { month, year } = req.query;
  const m = month ? parseInt(month) : null;
  const y = year ? parseInt(year) : null;

  let query = `
    SELECT pr.*, u.name as member_name, u.phone as member_phone,
      COALESCE((
        SELECT SUM(amount) FROM payments 
        WHERE user_id = u.id AND month = pr.month AND year = pr.year AND status = 'approved'
      ), 0) as paid_amount,
      (SELECT COUNT(id) FROM committee_rounds WHERE winner_user_id = u.id) as previous_wins
    FROM payout_requests pr
    JOIN users u ON pr.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (m) { query += ' AND pr.month = ?'; params.push(m); }
  if (y) { query += ' AND pr.year = ?'; params.push(y); }
  query += ' ORDER BY pr.created_at DESC';

  const requests = db.prepare(query).all(...params);
  res.json({ data: requests });
});

module.exports = router;
