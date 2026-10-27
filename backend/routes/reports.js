const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

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

  res.json({
    data: {
      month: m, year: y,
      monthName: MONTH_NAMES[m],
      totalCollected: totalApproved.total,
      winner: winner || null,
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

  // Generate PDF
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=mera-kameti-${MONTH_NAMES[m]}-${y}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#16a34a').text('Mera Kameti', { align: 'center' });
  doc.fontSize(14).fillColor('#333').text(`Monthly Report: ${MONTH_NAMES[m]} ${y}`, { align: 'center' });
  doc.moveDown();

  // Summary box
  doc.fontSize(12).fillColor('#000');
  doc.text(`Total Collected: Rs. ${totalApproved.total.toFixed(2)}`);
  doc.text(`Total Payments: ${payments.length}`);
  doc.text(`Winner: ${winner ? winner.winner_name : 'Not announced yet'}`);
  doc.moveDown();

  // Table header
  doc.fontSize(11).fillColor('#16a34a').text('Member Payments:', { underline: true });
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

module.exports = router;
