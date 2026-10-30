const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const BACKUP_SECRET = process.env.BACKUP_SECRET || 'mera_kameti_backup_secret_9988';

function allowAdminOrSecret(req, res, next) {
  const secret = req.query.secret || req.headers['x-backup-secret'];
  if (secret && secret === BACKUP_SECRET) {
    return next();
  }
  authMiddleware(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Unauthorized: Sirf admin ya valid backup secret allowed hai.' });
  });
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Monthly report JSON
router.get('/monthly', authMiddleware, adminOnly, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Month aur year daalen.' });

  const m = parseInt(month);
  const y = parseInt(year);

  const payments = db.prepare(`
    SELECT p.*, u.name as member_name, u.phone as member_phone
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.month = ? AND p.year = ?
    ORDER BY p.status, u.name
  `).all(m, y);

  const totalApproved = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(m, y);

  const winner = db.prepare(`
    SELECT r.*, u.name as winner_name
    FROM committee_rounds r
    LEFT JOIN users u ON r.winner_user_id = u.id
    WHERE r.month = ? AND r.year = ?
  `).get(m, y);

  const payout = winner 
    ? (winner.payout_amount > 0 ? winner.payout_amount : winner.total_collected)
    : 0;

  res.json({
    data: {
      month: m, year: y,
      monthName: MONTH_NAMES[m],
      totalCollected: totalApproved.total,
      winner: winner || null,
      payoutAmount: payout,
      payments
    }
  });
});

// Download PDF report
router.get('/pdf', authMiddleware, adminOnly, (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Month aur year daalen.' });

  const m = parseInt(month);
  const y = parseInt(year);

  const payments = db.prepare(`
    SELECT p.*, u.name as member_name, u.phone as member_phone
    FROM payments p
    JOIN users u ON p.user_id = u.id
    WHERE p.month = ? AND p.year = ?
    ORDER BY u.name
  `).all(m, y);

  const totalApproved = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments
    WHERE month = ? AND year = ? AND status = 'approved'
  `).get(m, y);

  const winner = db.prepare(`
    SELECT r.*, u.name as winner_name
    FROM committee_rounds r
    LEFT JOIN users u ON r.winner_user_id = u.id
    WHERE r.month = ? AND r.year = ?
  `).get(m, y);

  const payout = winner 
    ? (winner.payout_amount > 0 ? winner.payout_amount : winner.total_collected)
    : 0;

  // Generate PDF
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=mera-kameti-${MONTH_NAMES[m]}-${y}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#16a34a').text('Mera Kameti', { align: 'center' });
  doc.fontSize(14).fillColor('#333').text(`Monthly Report & Ledger: ${MONTH_NAMES[m]} ${y}`, { align: 'center' });
  doc.moveDown();

  // Summary box
  doc.fontSize(12).fillColor('#000');
  doc.text(`Total Credit (Approved Collection): Rs. ${totalApproved.total.toFixed(2)}`);
  doc.text(`Total Debit (Payout to Winner): Rs. ${payout.toFixed(2)}`);
  doc.text(`Winner: ${winner ? `${winner.winner_name} (Rs. ${payout})` : 'Not announced yet'}`);
  doc.text(`Total Submissions: ${payments.length}`);
  doc.moveDown();

  // Table header
  doc.fontSize(11).fillColor('#16a34a').text('Member Payments / Ledger:', { underline: true });
  doc.fillColor('#000').moveDown(0.5);

  payments.forEach((p, i) => {
    const statusSymbol = p.status === 'approved' ? '✓' : p.status === 'rejected' ? '✗' : '⏳';
    doc.fontSize(10).text(
      `${i + 1}. ${p.member_name} (${p.member_phone}) | Rs. ${p.amount} | ${statusSymbol} ${p.status.toUpperCase()} | Ref: ${p.reference_no || '-'}`
    );
  });

  doc.moveDown();
  doc.fontSize(9).fillColor('#888').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });

  doc.end();
});

// Full database JSON backup (For Admin UI and Cloud Migration)
router.get('/backup-data', allowAdminOrSecret, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    const payments = db.prepare('SELECT * FROM payments').all();
    const committee_rounds = db.prepare('SELECT * FROM committee_rounds').all();
    const settings = db.prepare('SELECT * FROM settings').all();
    let late_fines = [];
    let payout_requests = [];
    let notifications = [];

    try { late_fines = db.prepare('SELECT * FROM late_fines').all(); } catch (e) {}
    try { payout_requests = db.prepare('SELECT * FROM payout_requests').all(); } catch (e) {}
    try { notifications = db.prepare('SELECT * FROM notifications').all(); } catch (e) {}

    const backupPayload = {
      app: 'Mera Kameti',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      counts: {
        users: users.length,
        payments: payments.length,
        committee_rounds: committee_rounds.length,
        settings: settings.length,
        late_fines: late_fines.length,
        payout_requests: payout_requests.length,
        notifications: notifications.length
      },
      data: {
        users,
        payments,
        committee_rounds,
        settings,
        late_fines,
        payout_requests,
        notifications
      }
    };

    if (req.query.download === 'true') {
      const filename = `mera-kameti-backup-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(JSON.stringify(backupPayload, null, 2));
    }

    res.json(backupPayload);
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'डेटा बैकअप तैयार करने में त्रुटि: ' + err.message });
  }
});

// Download actual SQLite database file (.db)
router.get('/download-db', allowAdminOrSecret, (req, res) => {
  try {
    const { dbPath: persistentDbPath } = require('../utils/storagePath');
    const possiblePaths = [
      persistentDbPath,
      db.name,
      '/app/data/kameti.db',
      path.join(__dirname, '../kameti.db'),
      path.join(__dirname, '../../kameti.db'),
      path.join(process.cwd(), 'kameti.db')
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        dbPath = p;
        break;
      }
    }

    if (!dbPath) {
      return res.status(404).json({ error: 'डेटाबेस फ़ाइल सर्वर पर नहीं मिली।' });
    }

    const filename = `kameti-backup-${new Date().toISOString().slice(0, 10)}.db`;
    res.download(dbPath, filename);
  } catch (err) {
    console.error('Download DB error:', err);
    res.status(500).json({ error: 'डेटाबेस फ़ाइल डाउनलोड करने में त्रुटि: ' + err.message });
  }
});

// Restore full database from backup JSON (Strict zero data loss guarantee)
router.post('/restore-data', allowAdminOrSecret, (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'बैकअप डेटा नहीं मिला।' });

    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, name, phone, email, password, role, status, created_at, profile_photo, custom_credit, custom_debit, custom_late_fine, custom_late_fine_due)
      VALUES (@id, @name, @phone, @email, @password, @role, @status, @created_at, @profile_photo, @custom_credit, @custom_debit, @custom_late_fine, @custom_late_fine_due)
    `);

    const insertPayment = db.prepare(`
      INSERT OR REPLACE INTO payments (id, user_id, amount, late_fine, screenshot_path, reference_no, note, month, year, status, admin_note, submitted_at, reviewed_at, repayment_amount)
      VALUES (@id, @user_id, @amount, @late_fine, @screenshot_path, @reference_no, @note, @month, @year, @status, @admin_note, @submitted_at, @reviewed_at, @repayment_amount)
    `);

    const insertRound = db.prepare(`
      INSERT OR REPLACE INTO committee_rounds (id, month, year, winner_user_id, total_collected, payout_amount, notes, created_at)
      VALUES (@id, @month, @year, @winner_user_id, @total_collected, @payout_amount, @notes, @created_at)
    `);

    const insertSetting = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)
    `);

    let insertFine = null;
    try {
      insertFine = db.prepare(`
        INSERT OR REPLACE INTO late_fines (id, user_id, amount, month, year, reason, status, payment_id, created_at, paid_at)
        VALUES (@id, @user_id, @amount, @month, @year, @reason, @status, @payment_id, @created_at, @paid_at)
      `);
    } catch (e) {}

    let insertPayout = null;
    try {
      insertPayout = db.prepare(`
        INSERT OR REPLACE INTO payout_requests (id, user_id, month, year, requested_amount, reason, status, created_at)
        VALUES (@id, @user_id, @month, @year, @requested_amount, @reason, @status, @created_at)
      `);
    } catch (e) {}

    let insertNotification = null;
    try {
      insertNotification = db.prepare(`
        INSERT OR REPLACE INTO notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (@id, @user_id, @title, @message, @type, @is_read, @created_at)
      `);
    } catch (e) {}

    const restoreTransaction = db.transaction(() => {
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          insertUser.run({
            id: u.id,
            name: u.name,
            phone: u.phone,
            email: u.email || null,
            password: u.password,
            role: u.role || 'member',
            status: u.status || 'active',
            created_at: u.created_at || new Date().toISOString(),
            profile_photo: u.profile_photo || null,
            custom_credit: u.custom_credit ?? null,
            custom_debit: u.custom_debit ?? null,
            custom_late_fine: u.custom_late_fine ?? null,
            custom_late_fine_due: u.custom_late_fine_due ?? null
          });
        }
      }

      if (Array.isArray(data.payments)) {
        for (const p of data.payments) {
          insertPayment.run({
            id: p.id,
            user_id: p.user_id,
            amount: p.amount,
            late_fine: p.late_fine || 0,
            screenshot_path: p.screenshot_path || null,
            reference_no: p.reference_no || null,
            note: p.note || null,
            month: p.month,
            year: p.year,
            status: p.status || 'pending',
            admin_note: p.admin_note || null,
            submitted_at: p.submitted_at || new Date().toISOString(),
            reviewed_at: p.reviewed_at || null,
            repayment_amount: p.repayment_amount || 0
          });
        }
      }

      if (Array.isArray(data.committee_rounds)) {
        for (const r of data.committee_rounds) {
          insertRound.run({
            id: r.id,
            month: r.month,
            year: r.year,
            winner_user_id: r.winner_user_id || null,
            total_collected: r.total_collected || 0,
            payout_amount: r.payout_amount || 0,
            notes: r.notes || null,
            created_at: r.created_at || new Date().toISOString()
          });
        }
      }

      if (Array.isArray(data.settings)) {
        for (const s of data.settings) {
          insertSetting.run({ key: s.key, value: s.value });
        }
      }

      if (insertFine && Array.isArray(data.late_fines)) {
        for (const f of data.late_fines) {
          insertFine.run({
            id: f.id,
            user_id: f.user_id,
            amount: f.amount,
            month: f.month,
            year: f.year,
            reason: f.reason || null,
            status: f.status || 'unpaid',
            payment_id: f.payment_id || null,
            created_at: f.created_at || new Date().toISOString(),
            paid_at: f.paid_at || null
          });
        }
      }

      if (insertPayout && Array.isArray(data.payout_requests)) {
        for (const pr of data.payout_requests) {
          insertPayout.run({
            id: pr.id,
            user_id: pr.user_id,
            month: pr.month,
            year: pr.year,
            requested_amount: pr.requested_amount,
            reason: pr.reason || null,
            status: pr.status || 'pending',
            created_at: pr.created_at || new Date().toISOString()
          });
        }
      }

      if (insertNotification && Array.isArray(data.notifications)) {
        for (const n of data.notifications) {
          insertNotification.run({
            id: n.id,
            user_id: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type || 'info',
            is_read: n.is_read || 0,
            created_at: n.created_at || new Date().toISOString()
          });
        }
      }
    });

    restoreTransaction();
    res.json({
      message: 'डेटा सफलतापूर्वक रिस्टोर हो गया! ✅',
      restored: {
        users: (data.users || []).length,
        payments: (data.payments || []).length,
        committee_rounds: (data.committee_rounds || []).length
      }
    });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'डेटा रिस्टोर करने में त्रुटि: ' + err.message });
  }
});

module.exports = router;
