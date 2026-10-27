const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Get all members (admin)
router.get('/', authMiddleware, adminOnly, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.name, u.phone, u.email, u.status, u.created_at,
      COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as total_payments,
      COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.amount ELSE 0 END), 0) as total_paid
    FROM users u
    LEFT JOIN payments p ON u.id = p.user_id
    WHERE u.role = 'member'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ data: members });
});

// Toggle member status (admin)
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
