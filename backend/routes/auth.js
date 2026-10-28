const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

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
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, phone, email, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User nahi mila.' });
  res.json({ data: user });
});

// Update Profile & Login Details (Phone, Password, Name)
router.put('/profile', authMiddleware, (req, res) => {
  const { name, phone, current_password, new_password, email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User nahi mila.' });

  // If changing phone, check uniqueness
  if (phone && phone !== user.phone) {
    const existing = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, user.id);
    if (existing) {
      return res.status(400).json({ error: 'Yeh phone number kisi aur ke pass registered hai.' });
    }
  }

  // If changing password, verify current password
  let newHashed = user.password;
  if (new_password) {
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Naya password kam se kam 6 characters ka hona chahiye.' });
    }
    if (current_password) {
      const valid = bcrypt.compareSync(current_password, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Purana password galat hai.' });
      }
    }
    newHashed = bcrypt.hashSync(new_password, 10);
  }

  const updatedName = name || user.name;
  const updatedPhone = phone || user.phone;
  const updatedEmail = email !== undefined ? email : user.email;

  db.prepare(`
    UPDATE users 
    SET name = ?, phone = ?, password = ?, email = ?
    WHERE id = ?
  `).run(updatedName, updatedPhone, newHashed, updatedEmail, user.id);

  // Generate new token with updated details
  const token = jwt.sign(
    { id: user.id, name: updatedName, phone: updatedPhone, role: user.role },
    (process.env.JWT_SECRET || 'mera_kameti_fallback_secret_2024'),
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Profile aur Login details successfully update ho gayi! ✅',
    token,
    role: user.role,
    name: updatedName,
    phone: updatedPhone
  });
});

module.exports = router;
