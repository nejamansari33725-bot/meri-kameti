const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Register
router.post('/register', (req, res) => {
  const { name, phone, password, email } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Naam, phone aur password zaroori hain.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password kam se kam 6 characters ka hona chahiye.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(400).json({ error: 'Yeh phone number pehle se registered hai.' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)'
  ).run(name, phone, email || null, hashed);

  const token = jwt.sign(
    { id: result.lastInsertRowid, name, phone, role: 'member' },
    (process.env.JWT_SECRET || 'mera_kameti_fallback_secret_2024'),
    { expiresIn: '7d' }
  );
  res.json({ message: 'Registration successful!', token, role: 'member', name });
});

// Login
router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone aur password daalen.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    return res.status(400).json({ error: 'Phone number registered nahi hai.' });
  }
  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Aapka account deactivate hai. Admin se contact karein.' });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Password galat hai.' });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, phone: user.phone, role: user.role },
    (process.env.JWT_SECRET || 'mera_kameti_fallback_secret_2024'),
    { expiresIn: '7d' }
  );
  res.json({ message: 'Login successful!', token, role: user.role, name: user.name });
});

// Get current user
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token nahi mila.' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, (process.env.JWT_SECRET || 'mera_kameti_fallback_secret_2024'));
    const user = db.prepare('SELECT id, name, phone, email, role, status, created_at FROM users WHERE id = ?').get(decoded.id);
    res.json({ data: user });
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

module.exports = router;
