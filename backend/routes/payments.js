const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { notifyWhatsApp } = require('../utils/whatsapp');

// Helper to settle unpaid late fines for a member when a payment with late fine is approved
function settleMemberLateFines(userId, paymentId, fineAmount, month, year) {
  if (!fineAmount || fineAmount <= 0) return;
  try {
    const unpaidFines = db.prepare(`
      SELECT id, amount FROM late_fines
      WHERE user_id = ? AND status = 'unpaid'
      ORDER BY id ASC
    `).all(userId);

    let remaining = fineAmount;
    for (const uf of unpaidFines) {
      if (remaining <= 0) break;
      if (uf.amount <= remaining) {
        db.prepare(`
          UPDATE late_fines 
          SET status = 'paid', payment_id = ?, paid_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(paymentId, uf.id);
        remaining -= uf.amount;
      } else {
        // Partially paid: mark current as paid for paid portion, insert unpaid for rest
        db.prepare(`
          UPDATE late_fines 
          SET amount = ?, status = 'paid', payment_id = ?, paid_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(remaining, paymentId, uf.id);

        db.prepare(`
          INSERT INTO late_fines (user_id, amount, month, year, reason, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'unpaid', CURRENT_TIMESTAMP)
        `).run(userId, uf.amount - remaining, month, year, 'Remaining unpaid fine balance');

        remaining = 0;
      }
    }

    // Also deduct from custom_late_fine_due if set
    db.prepare('UPDATE users SET custom_late_fine_due = MAX(0, custom_late_fine_due - ?) WHERE id = ? AND custom_late_fine_due IS NOT NULL')
      .run(fineAmount, userId);

    // If all late fines are settled, clear stale late fine notifications for this member
    const remainingDue = db.prepare("SELECT COUNT(*) as cnt FROM late_fines WHERE user_id = ? AND status = 'unpaid'").get(userId);
    if (!remainingDue || remainingDue.cnt === 0) {
      db.prepare("DELETE FROM notifications WHERE user_id = ? AND type = 'late_fine'").run(userId);
    }
  } catch (err) {
    console.error('Error settling late fine:', err);
  }
}

const { uploadsDir } = require('../utils/storagePath');

// Multer setup for screenshot uploads (stored on persistent cloud storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
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

// Submit payment (member or admin)
router.post('/', authMiddleware, upload.single('screenshot'), (req, res) => {
  const { amount, reference_no, note, month, year, late_fine, repayment_amount } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'महीना (Month) और वर्ष (Year) चुनना आवश्यक है।' });
  }

  const installment = (amount !== undefined && amount !== null && amount !== '') ? parseFloat(amount) : 0;
  const fine = (late_fine !== undefined && late_fine !== null && late_fine !== '') ? parseFloat(late_fine) : 0;
  const repayment = (repayment_amount !== undefined && repayment_amount !== null && repayment_amount !== '') ? parseFloat(repayment_amount) : 0;

  if (installment <= 0 && fine <= 0 && repayment <= 0) {
    return res.status(400).json({ error: 'कृपया किश्त, लेट फाइन या उठाया हुआ पैसा वापसी में से कोई एक राशि दर्ज करें।' });
  }

  const screenshotPath = req.file ? `/uploads/${req.file.filename}` : null;
  const initialStatus = req.user.role === 'admin' ? 'approved' : 'pending';

  // 1. Kisht (installment) check: Member can pay again after a minimum of 15 days from their previous installment!
  if (installment > 0 && req.user.role !== 'admin') {
    const lastKisht = db.prepare(`
      SELECT id, amount, submitted_at, status, month, year 
      FROM payments 
      WHERE user_id = ? AND amount > 0 AND status != 'rejected'
      ORDER BY submitted_at DESC, id DESC 
      LIMIT 1
    `).get(req.user.id);

    if (lastKisht && lastKisht.submitted_at) {
      const lastDate = new Date(lastKisht.submitted_at);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 15) {
        const daysRemaining = 15 - diffDays;
        const formattedLastDate = lastDate.toLocaleDateString('hi-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
        return res.status(400).json({
          error: `आपकी पिछली किश्त (₹${lastKisht.amount}) दिनांक ${formattedLastDate} को जमा हुई थी। कमिटी नियम के अनुसार कम से कम 15 दिन बाद ही अगली किश्त जमा कर सकते हैं। कृपया ${daysRemaining} दिन बाद पुनः प्रयास करें।`
        });
      }
    }
  }

  // 2. Check if there is an existing standalone fine-only record (amount = 0) to merge into if installment > 0
  const existingFineOnly = db.prepare(
    'SELECT id, amount, late_fine, repayment_amount FROM payments WHERE user_id = ? AND month = ? AND year = ? AND amount = 0 AND status != ?'
  ).get(req.user.id, parseInt(month), parseInt(year), 'rejected');

  let paymentId;
  if (existingFineOnly && installment > 0) {
    const totalFine = fine > 0 ? (existingFineOnly.late_fine + fine) : existingFineOnly.late_fine;
    const totalRepayment = (existingFineOnly.repayment_amount || 0) + repayment;
    db.prepare(`
      UPDATE payments 
      SET amount = ?, late_fine = ?, repayment_amount = ?, screenshot_path = COALESCE(?, screenshot_path), 
          reference_no = COALESCE(?, reference_no), note = COALESCE(?, note), 
          status = ?, submitted_at = CURRENT_TIMESTAMP, reviewed_at = ?
      WHERE id = ?
    `).run(
      installment,
      totalFine,
      totalRepayment,
      screenshotPath,
      reference_no || null,
      note || null,
      initialStatus,
      initialStatus === 'approved' ? new Date().toISOString() : null,
      existingFineOnly.id
    );
    paymentId = existingFineOnly.id;
  } else {
    // Insert new payment record (Late fine & Uthaya paisa repayment can be submitted UNLIMITED times in a month!)
    const result = db.prepare(`
      INSERT INTO payments (user_id, amount, late_fine, repayment_amount, screenshot_path, reference_no, note, month, year, status, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, 
      installment, 
      fine, 
      repayment,
      screenshotPath, 
      reference_no || null, 
      note || null, 
      parseInt(month), 
      parseInt(year),
      initialStatus,
      initialStatus === 'approved' ? new Date().toISOString() : null
    );
    paymentId = result.lastInsertRowid;
  }

  // If approved immediately (e.g. admin action) and late fine is included, settle unpaid dues
  if (initialStatus === 'approved' && fine > 0) {
    settleMemberLateFines(req.user.id, paymentId, fine, parseInt(month), parseInt(year));
  }

  // Notify admin via WhatsApp if submitted by a member
  if (req.user.role !== 'admin') {
    const admin = db.prepare("SELECT phone FROM users WHERE role = 'admin' LIMIT 1").get();
    if (admin) {
      const kishtMsg = installment > 0 ? `\nKisht: Rs. ${installment}` : '';
      const repMsg = repayment > 0 ? `\nUthaya Paisa Wapsi: Rs. ${repayment}` : '';
      const fineMsg = fine > 0 ? `\nLate Fine: Rs. ${fine}` : '';
      const total = installment + repayment + fine;
      notifyWhatsApp(admin.phone, `💰 Naya payment submit hua!\nMember: ${req.user.name}${kishtMsg}${repMsg}${fineMsg}\nTotal: Rs. ${total}\nMonth: ${month}/${year}\nRef: ${reference_no || 'N/A'}`);
    }
  }

  res.json({ 
    message: initialStatus === 'approved' 
      ? 'Payment successfully recorded & approved! ✅' 
      : 'Payment submit ho gaya! Admin approve karega.', 
    data: { id: paymentId } 
  });
});

// Get my payments (current user)
router.get('/my', authMiddleware, (req, res) => {
  const payments = db.prepare(`
    SELECT * FROM payments WHERE user_id = ? ORDER BY submitted_at DESC
  `).all(req.user.id);
  res.json({ data: payments });
});

// Get pending payments (admin)
router.get('/pending', authMiddleware, adminOnly, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, u.name as member_name, u.phone as member_phone, u.profile_photo as member_photo
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
    SELECT p.*, u.name as member_name, u.phone as member_phone, u.profile_photo as member_photo
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

// Approve payment (with optional late fine & admin note)
router.put('/:id/approve', authMiddleware, adminOnly, (req, res) => {
  const { admin_note, late_fine } = req.body;
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment nahi mila.' });
  if (payment.status !== 'pending') return res.status(400).json({ error: 'Yeh payment already review ho chuka hai.' });

  // Use explicitly passed late_fine, or fallback to the late_fine submitted with payment
  const fine = (late_fine !== undefined && late_fine !== null && parseFloat(late_fine) > 0)
    ? parseFloat(late_fine)
    : (payment.late_fine && parseFloat(payment.late_fine) > 0 ? parseFloat(payment.late_fine) : 0);

  db.prepare(`
    UPDATE payments 
    SET status = 'approved', admin_note = ?, late_fine = ?, reviewed_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(admin_note || null, fine, req.params.id);

  // Settle member's unpaid late fines if fine was paid/approved
  if (fine > 0) {
    settleMemberLateFines(payment.user_id, payment.id, fine, payment.month, payment.year);
  }

  // If member has custom ledger baseline, update it with newly approved amounts
  if (payment.amount > 0) {
    db.prepare('UPDATE users SET custom_credit = custom_credit + ? WHERE id = ? AND custom_credit IS NOT NULL')
      .run(payment.amount, payment.user_id);
  }
  if (payment.repayment_amount > 0) {
    db.prepare('UPDATE users SET custom_debit = MAX(0, custom_debit - ?) WHERE id = ? AND custom_debit IS NOT NULL')
      .run(payment.repayment_amount, payment.user_id);
  }
  if (fine > 0) {
    db.prepare('UPDATE users SET custom_late_fine = custom_late_fine + ? WHERE id = ? AND custom_late_fine IS NOT NULL')
      .run(fine, payment.user_id);
  }

  // Notify member
  const member = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(payment.user_id);
  if (member) {
    const fineMsg = fine > 0 ? `\nLate Fine: Rs. ${fine}` : '';
    notifyWhatsApp(member.phone, `✅ Aapka payment approve ho gaya!\nAmount: Rs. ${payment.amount}${fineMsg}\nMonth: ${payment.month}/${payment.year}\n${admin_note ? 'Note: ' + admin_note : ''}\n- Mera Kameti`);
  }

  // Insert in-app notification
  try {
    const fineMsg = fine > 0 ? ` (+ ₹${fine} लेट फाइन)` : '';
    const repMsg = payment.repayment_amount > 0 ? ` (+ ₹${payment.repayment_amount} उठाया वापसी)` : '';
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'payment_approved')
    `).run(
      payment.user_id,
      `✅ पेमेंट स्वीकृत (Payment Approved) - ${payment.month}/${payment.year}`,
      `आपकी ₹${payment.amount}${fineMsg}${repMsg} की पेमेंट एडमिन द्वारा स्वीकृत कर दी गई है।`
    );
  } catch (err) {}

  res.json({ message: 'Payment approve ho gaya! ✅' });
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

  // Insert in-app notification
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'payment_rejected')
    `).run(
      payment.user_id,
      `❌ पेमेंट अस्वीकृत (Payment Rejected) - ${payment.month}/${payment.year}`,
      `आपकी ₹${payment.amount} की पेमेंट अस्वीकृत कर दी गई है। कारण: ${admin_note || 'एडमिन द्वारा चेक किया गया'}`
    );
  } catch (err) {}

  res.json({ message: 'Payment reject ho gaya.' });
});

// Edit late fine directly on any payment (admin)
router.put('/:id/late-fine', authMiddleware, adminOnly, (req, res) => {
  const { late_fine, admin_note } = req.body;
  const fine = late_fine !== undefined && parseFloat(late_fine) >= 0 ? parseFloat(late_fine) : 0;
  db.prepare(`
    UPDATE payments 
    SET late_fine = ?, admin_note = COALESCE(?, admin_note)
    WHERE id = ?
  `).run(fine, admin_note || null, req.params.id);
  res.json({ message: 'Late fine update ho gaya! ✅' });
});

module.exports = router;
