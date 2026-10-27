const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { notifyWhatsApp } = require('../utils/whatsapp');

// Multer setup for screenshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `payment_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Sirf images allow hain (jpg, png, gif, webp).'));
    }
  }
});

// Submit payment (member)
router.post('/', authMiddleware, upload.single('screenshot'), (req, res) => {
  const { amount, reference_no, note, month, year } = req.body;
  if (!amount || !month || !year) {
    return res.status(400).json({ error: 'Amount, month aur year zaroori hain.' });
  }
  const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;

  // Check if already submitted for this month
  const existing = db.prepare(
    'SELECT id FROM payments WHERE user_id = ? AND month = ? AND year = ? AND status != ?'
  ).get(req.user.id, parseInt(month), parseInt(year), 'rejected');
  if (existing) {
    return res.status(400).json({ error: 'Is mahine ka payment pehle se submit hai.' });
  }

  const result = db.prepare(`
    INSERT INTO payments (user_id, amount, screenshot_path, reference_no, note, month, year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, parseFloat(amount), screenshotPath, reference_no || null, note || null, parseInt(month), parseInt(year));

  // Notify admin via WhatsApp placeholder
  const admin = db.prepare("SELECT phone FROM users WHERE role = 'admin' LIMIT 1").get();
  if (admin) {
    notifyWhatsApp(admin.phone, `💰 Naya payment submit hua!\nMember: ${req.user.name}\nAmount: Rs. ${amount}\nMonth: ${month}/${year}\nRef: ${reference_no || 'N/A'}`);
  }

  res.json({ message: 'Payment submit ho gaya! Admin approve karega.', data: { id: result.lastInsertRowid } });
});

// Get my payments (member)
router.get('/my', authMiddleware, (req, res) => {
  const payments = db.prepare(`
    SELECT * FROM payments WHERE user_id = ? ORDER BY submitted_at DESC
  `).all(req.user.id);
  res.json({ data: payments });
});

// Get pending payments (admin)
router.get('/pending', authMiddleware, adminOnly, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, u.name as member_name, u.phone as member_phone
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'pending'
    ORDER BY p.submitted_at DESC
  `).all();
  res.json({ data: payments });
});

// Get all payments (admin)
router.get('/all', authMiddleware, adminOnly, (req, res) => {
  const { month, year, status } = req.query;
  let query = `
    SELECT p.*, u.name as member_name, u.phone as member_phone
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (month) { query += ' AND p.month = ?'; params.push(parseInt(month)); }
  if (year) { query += ' AND p.year = ?'; params.push(parseInt(year)); }
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  query += ' ORDER BY p.submitted_at DESC';
  const payments = db.prepare(query).all(...params);
  res.json({ data: payments });
});

// Approve payment (admin)
router.put('/:id/approve', authMiddleware, adminOnly, (req, res) => {
  const { admin_note } = req.body;
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment nahi mila.' });
  if (payment.status !== 'pending') return res.status(400).json({ error: 'Yeh payment already review ho chuka hai.' });

  db.prepare(`
    UPDATE payments SET status = 'approved', admin_note = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(admin_note || null, req.params.id);

  // Notify member
  const member = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(payment.user_id);
  if (member) {
    notifyWhatsApp(member.phone, `✅ Aapka payment approve ho gaya!\nAmount: Rs. ${payment.amount}\nMonth: ${payment.month}/${payment.year}\n${admin_note ? 'Note: ' + admin_note : ''}\n- Mera Kameti`);
  }

  res.json({ message: 'Payment approve ho gaya!' });
});

// Reject payment (admin)
router.put('/:id/reject', authMiddleware, adminOnly, (req, res) => {
  const { admin_note } = req.body;
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment nahi mila.' });
  if (payment.status !== 'pending') return res.status(400).json({ error: 'Yeh payment already review ho chuka hai.' });

  db.prepare(`
    UPDATE payments SET status = 'rejected', admin_note = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(admin_note || null, req.params.id);

  // Notify member
  const member = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(payment.user_id);
  if (member) {
    notifyWhatsApp(member.phone, `❌ Aapka payment reject ho gaya.\nAmount: Rs. ${payment.amount}\nMonth: ${payment.month}/${payment.year}\nReason: ${admin_note || 'Admin ne check kiya'}\nDobara submit karein.\n- Mera Kameti`);
  }

  res.json({ message: 'Payment reject ho gaya.' });
});

module.exports = router;
