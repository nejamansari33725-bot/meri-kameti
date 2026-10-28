const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Multer for QR code uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `qr_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Sirf images allow hain (jpg, png, webp).'));
    }
  }
});

// Get settings (public for all authenticated members and guests)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({ data: settings });
});

// Update settings (Admin only)
router.put('/', authMiddleware, adminOnly, upload.single('qr_image'), (req, res) => {
  const { committee_name, upi_id, upi_name, default_late_fine, whatsapp_group_link } = req.body;
  
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  if (committee_name !== undefined) upsert.run('committee_name', committee_name);
  if (upi_id !== undefined) upsert.run('upi_id', upi_id);
  if (upi_name !== undefined) upsert.run('upi_name', upi_name);
  if (default_late_fine !== undefined) upsert.run('default_late_fine', default_late_fine);
  if (whatsapp_group_link !== undefined) upsert.run('whatsapp_group_link', whatsapp_group_link);

  if (req.file) {
    const qrUrl = `/uploads/${req.file.filename}`;
    upsert.run('qr_code_url', qrUrl);
  }

  // Fetch updated settings
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const updated = {};
  rows.forEach(r => { updated[r.key] = r.value; });

  res.json({ message: 'Settings successfully update ho gayi! ✅', data: updated });
});

module.exports = router;
