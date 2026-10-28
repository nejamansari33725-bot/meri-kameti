const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { notifyWhatsApp } = require('../utils/whatsapp');

// Multer setup for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
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

// Register - New members require Admin approval
router.post('/register', (req, res) => {
  const { name, phone, password, email } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Naam, phone aur password zaroori hain.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password kam se kam 6 characters ka hona chahiye.' });
  }

  const existing = db.prepare('SELECT id, status FROM users WHERE phone = ?').get(phone);
  if (existing) {
    if (existing.status === 'pending') {
      return res.status(400).json({ error: 'Yeh phone number pehle se registered hai aur Admin approval ke liye pending hai.' });
    }
    return res.status(400).json({ error: 'Yeh phone number pehle se registered hai.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, phone, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone, email || null, hashed, 'member', 'pending');

  // Notify Admin via WhatsApp that a new member registered
  const admin = db.prepare("SELECT phone FROM users WHERE role = 'admin' LIMIT 1").get();
  if (admin) {
    notifyWhatsApp(admin.phone, `👤 Naya Member Registration Request!\nName: ${name}\nPhone: ${phone}\nKripya Admin Panel me jakar approve karein.`);
  }

  res.json({
    message: 'Registration safal! Aapka account Admin ke approval ke liye bhej diya gaya hai. Admin approve karega tab aap login kar sakenge.',
    pendingApproval: true,
    name
  });
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
  if (user.status === 'pending') {
    return res.status(403).json({ 
      error: 'Aapka account Admin approval ke liye pending hai. Admin dwara approve kiye jaane ke baad hi aap login kar sakenge.' 
    });
  }
  if (user.status === 'rejected') {
    return res.status(403).json({ 
      error: 'Aapka account Admin dwara reject kar diya gaya hai. Kripya Admin se sampark karein.' 
    });
  }
  if (user.status === 'inactive') {
    return res.status(403).json({ 
      error: 'Aapka account deactivate hai. Admin se sampark karein.' 
    });
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
  const user = db.prepare('SELECT id, name, phone, email, profile_photo, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User nahi mila.' });
  res.json({ data: user });
});

// Update Profile & Login Details (Phone, Password, Name, Email, Photo)
router.put('/profile', authMiddleware, upload.single('photo'), (req, res) => {
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
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : user.profile_photo;

  db.prepare(`
    UPDATE users 
    SET name = ?, phone = ?, password = ?, email = ?, profile_photo = ?
    WHERE id = ?
  `).run(updatedName, updatedPhone, newHashed, updatedEmail, photoUrl, user.id);

  // Generate new token with updated details
  const token = jwt.sign(
    { id: user.id, name: updatedName, phone: updatedPhone, role: user.role, profile_photo: photoUrl },
    (process.env.JWT_SECRET || 'mera_kameti_fallback_secret_2024'),
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Profile aur Login details successfully update ho gayi! ✅',
    token,
    role: user.role,
    name: updatedName,
    phone: updatedPhone,
    email: updatedEmail,
    profile_photo: photoUrl
  });
});

// Member Forgot Password (Reset via Name & Phone verification)
router.post('/forgot-password', (req, res) => {
  const { phone, name, new_password } = req.body;
  if (!phone || !name || !new_password) {
    return res.status(400).json({ error: 'Mobile number, Registered Name aur Naya Password sabhi zaroori hain.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Naya password kam se kam 6 aksharon ka hona chahiye.' });
  }

  const user = db.prepare('SELECT id, name, phone, role, status FROM users WHERE phone = ?').get(phone.trim());
  if (!user) {
    return res.status(404).json({ error: 'Yeh mobile number registered nahi hai.' });
  }

  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Admin password yahan se reset nahi ho sakta. Admin Panel ki Settings me jaakar badlein.' });
  }

  // Security check: verify registered name matches
  const enteredName = name.trim().toLowerCase();
  const dbName = user.name.trim().toLowerCase();
  const isMatch = dbName === enteredName || dbName.includes(enteredName) || enteredName.includes(dbName);
  
  if (!isMatch) {
    return res.status(400).json({ 
      error: 'Darj kiya gaya naam registered naam se match nahi kar raha hai. Sahi naam daalein ya Admin se sampark karein.' 
    });
  }

  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

  notifyWhatsApp(user.phone, `🔐 Mera Kameti: Aapka password safaltapoorvak badal diya gaya hai. Ab aap naye password se login kar sakte hain.`);

  res.json({ message: 'Password safaltapoorvak reset ho gaya! Ab aap naye password se login kar sakte hain. ✅' });
});

module.exports = router;
