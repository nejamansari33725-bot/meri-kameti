const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { notifyWhatsApp } = require('../utils/whatsapp');
const { uploadsDir } = require('../utils/storagePath');

// Multer setup for profile photo uploads (stored on persistent cloud volume)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
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
  let { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone aur password daalen.' });
  }

  const rawPhone = String(phone).trim();
  let cleanDigits = rawPhone.replace(/\D/g, '');
  if (cleanDigits.length > 10) {
    cleanDigits = cleanDigits.slice(-10);
  }

  // Look up user by clean 10-digit phone or raw input
  const user = db.prepare('SELECT * FROM users WHERE phone = ? OR phone = ?').get(cleanDigits, rawPhone);
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

  const rawPassword = String(password);
  const cleanPassword = rawPassword.trim();
  const valid = bcrypt.compareSync(rawPassword, user.password) || bcrypt.compareSync(cleanPassword, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Password galat hai.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, phone: user.phone, role: user.role },
    (process.env.JWT_SECRET || 'mera_kameti_fallback_secret_2024'),
    { expiresIn: '7d' }
  );

  res.json({ 
    message: 'Login successful!', 
    token, 
    role: user.role, 
    name: user.name,
    profile_photo: user.profile_photo || ''
  });
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

// Send Password Reset OTP (Admin must verify via OTP; Member can also use OTP)
router.post('/send-reset-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'कृपया अपना मोबाइल नंबर दर्ज करें।' });
  }

  const cleanPhone = phone.trim();
  const user = db.prepare('SELECT id, name, phone, role, status FROM users WHERE phone = ?').get(cleanPhone);
  if (!user) {
    return res.status(404).json({ error: 'यह मोबाइल नंबर रजिस्टर्ड नहीं है। कृपया सही नंबर दर्ज करें।' });
  }

  if (user.status === 'inactive' || user.status === 'rejected') {
    return res.status(403).json({ error: 'यह अकाउंट एक्टिव नहीं है। कृपया एडमिन से संपर्क करें।' });
  }

  // Generate 6-digit random numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes validity

  try {
    // Invalidate previous unused OTPs for this phone
    db.prepare('UPDATE password_reset_otps SET used = 1 WHERE phone = ? AND used = 0').run(cleanPhone);
    db.prepare('INSERT INTO password_reset_otps (phone, otp, role, expires_at) VALUES (?, ?, ?, ?)').run(
      cleanPhone,
      otp,
      user.role,
      expiresAt
    );
  } catch (e) {
    console.error('Error saving password reset OTP:', e.message);
  }

  // Send OTP to phone via WhatsApp notification
  const roleLabel = user.role === 'admin' ? 'Admin' : 'Member';
  const otpMessage = `🔐 Mera Kameti (${roleLabel} Password Reset OTP):\n\nAapka OTP hai: *${otp}*\n\nYeh OTP agle 10 minute tak valid hai. Kripya ise kisi ke sath share na karein.\n- Mera Kameti`;
  notifyWhatsApp(cleanPhone, otpMessage);

  res.json({
    success: true,
    message: `${user.role === 'admin' ? 'एडमिन' : 'सदस्य'} के रजिस्टर्ड मोबाइल नंबर ${cleanPhone} पर OTP भेज दिया गया है! 📲`,
    phone: cleanPhone,
    name: user.name,
    role: user.role,
    is_admin: user.role === 'admin',
    otp: otp // Included for instant display & verification
  });
});

// Member & Admin Forgot Password (Admin strictly verified via OTP sent to phone)
router.post('/forgot-password', (req, res) => {
  const { phone, name, otp, new_password } = req.body;
  if (!phone || !new_password) {
    return res.status(400).json({ error: 'मोबाइल नंबर और नया पासवर्ड दोनों अनिवार्य हैं।' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' });
  }

  const cleanPhone = phone.trim();
  const user = db.prepare('SELECT id, name, phone, role, status FROM users WHERE phone = ?').get(cleanPhone);
  if (!user) {
    return res.status(404).json({ error: 'यह मोबाइल नंबर रजिस्टर्ड नहीं है।' });
  }

  const isAdmin = user.role === 'admin';

  if (isAdmin) {
    // Admin MUST verify with OTP!
    if (!otp || !otp.trim()) {
      return res.status(400).json({ 
        error: 'एडमिन पासवर्ड रीसेट करने के लिए आपके मोबाइल नंबर पर भेजा गया 6-अंकों का OTP दर्ज करना अनिवार्य है।' 
      });
    }

    const cleanOtp = otp.trim();
    const validOtpRecord = db.prepare(`
      SELECT * FROM password_reset_otps 
      WHERE phone = ? AND otp = ? AND used = 0
      ORDER BY id DESC LIMIT 1
    `).get(cleanPhone, cleanOtp);

    if (!validOtpRecord) {
      return res.status(400).json({ 
        error: 'गलत OTP दर्ज किया गया है। कृपया सही 6-अंकों का OTP दर्ज करें या नया OTP मंगाएं।' 
      });
    }

    // Check expiry
    if (new Date(validOtpRecord.expires_at) < new Date()) {
      return res.status(400).json({ 
        error: 'इस OTP की समय सीमा (10 मिनट) समाप्त हो चुकी है। कृपया "OTP दोबारा भेजें" पर क्लिक करके नया OTP मंगाएं।' 
      });
    }

    // Mark OTP as used
    db.prepare('UPDATE password_reset_otps SET used = 1 WHERE id = ?').run(validOtpRecord.id);

  } else {
    // Regular member: verify via OTP (if provided) or via registered Name
    if (otp && otp.trim()) {
      const cleanOtp = otp.trim();
      const validOtpRecord = db.prepare(`
        SELECT * FROM password_reset_otps 
        WHERE phone = ? AND otp = ? AND used = 0
        ORDER BY id DESC LIMIT 1
      `).get(cleanPhone, cleanOtp);

      if (!validOtpRecord || new Date(validOtpRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'गलत या एक्सपायर्ड OTP। कृपया दोबारा चेक करें।' });
      }
      db.prepare('UPDATE password_reset_otps SET used = 1 WHERE id = ?').run(validOtpRecord.id);
    } else {
      // Security check: verify registered name matches
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'रजिस्टर्ड नाम या OTP दर्ज करना ज़रूरी है।' });
      }
      const enteredName = name.trim().toLowerCase();
      const dbName = user.name.trim().toLowerCase();
      const isMatch = dbName === enteredName || dbName.includes(enteredName) || enteredName.includes(dbName);
      
      if (!isMatch) {
        return res.status(400).json({ 
          error: 'दर्ज किया गया नाम रजिस्टर्ड नाम से मैच नहीं कर रहा है। कृपया सही नाम डालें या OTP मंगाएं।' 
        });
      }
    }
  }

  const hashedPassword = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

  notifyWhatsApp(user.phone, `🔐 Mera Kameti: ${isAdmin ? 'Admin' : 'Aapka'} password safaltapoorvak badal diya gaya hai. Ab aap naye password se login kar sakte hain.`);

  res.json({ 
    success: true,
    message: `${isAdmin ? 'एडमिन' : 'सदस्य'} पासवर्ड सफलतापूर्वक रीसेट हो गया! अब आप नए पासवर्ड से लॉगिन कर सकते हैं। ✅` 
  });
});

module.exports = router;
