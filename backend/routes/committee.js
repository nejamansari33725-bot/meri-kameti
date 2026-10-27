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

// Get current month summary
router.get('/summary', authMiddleware, (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const totalCollected = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(month, year);

  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM payments
    WHERE month = ? AND year = ? AND status = 'pending'
  `).get(month, year);

  const winner = db.prepare(`
    SELECT r.*, u.name as winner_name
    FROM committee_rounds r
    LEFT JOIN users u ON r.winner_user_id = u.id
    WHERE r.month = ? AND r.year = ?
  `).get(month, year);

  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member' AND status = 'active'").get();
  const paidMembers = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(month, year);

  res.json({
    data: {
      month, year,
      totalCollected: totalCollected.total,
      pendingCount: pendingCount.count,
      winner: winner || null,
      totalMembers: totalMembers.count,
      paidMembers: paidMembers.count
    }
  });
});

// Assign winner for a month (admin)
router.post('/rounds', authMiddleware, adminOnly, (req, res) => {
  const { month, year, winner_user_id, notes } = req.body;
  if (!month || !year || !winner_user_id) {
    return res.status(400).json({ error: 'Month, year aur winner zaroori hain.' });
  }

  // Check if round already exists
  const existing = db.prepare('SELECT id FROM committee_rounds WHERE month = ? AND year = ?').get(parseInt(month), parseInt(year));
  if (existing) {
    // Update existing
    db.prepare(`
      UPDATE committee_rounds SET winner_user_id = ?, notes = ? WHERE month = ? AND year = ?
    `).run(parseInt(winner_user_id), notes || null, parseInt(month), parseInt(year));
  } else {
    // Get total collected for that month
    const totalCollected = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
      WHERE month = ? AND year = ? AND status = 'approved'
    `).get(parseInt(month), parseInt(year));

    db.prepare(`
      INSERT INTO committee_rounds (month, year, winner_user_id, total_collected, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(parseInt(month), parseInt(year), parseInt(winner_user_id), totalCollected.total, notes || null);
  }

  // Notify winner
  const winner = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(parseInt(winner_user_id));
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  if (winner) {
    notifyWhatsApp(winner.phone, `🎉 Mubarak ho ${winner.name}!\nAap is mahine (${monthNames[month]} ${year}) ki committee jeet gaye hain!\n- Mera Kameti`);
  }

  res.json({ message: `${winner?.name} ko winner set kar diya gaya!` });
});

// Get members with their payment status for a specific month (for winner selection)
router.get('/members-status', authMiddleware, adminOnly, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Month aur year daalen.' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.phone,
      p.amount, p.status as payment_status, p.reference_no
    FROM users u
    LEFT JOIN payments p ON u.id = p.user_id AND p.month = ? AND p.year = ? AND p.status = 'approved'
    WHERE u.role = 'member' AND u.status = 'active'
    ORDER BY u.name
  `).all(parseInt(month), parseInt(year));

  res.json({ data: members });
});

module.exports = router;
