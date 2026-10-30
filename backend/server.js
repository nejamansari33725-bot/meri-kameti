const express = require('express');
const cors = require('cors');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch(e) { /* ok */ }
}

// Initialize DB (creates tables + seeds admin)
require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { uploadsDir } = require('./utils/storagePath');

// Serve uploaded screenshots & QR codes (both persistent cloud volume and local fallback)
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/members', require('./routes/members'));
app.use('/api/committee', require('./routes/committee'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mera Kameti chal raha hai! 🟢' });
});

// Serve React frontend build (production for standalone node servers like Railway/Render)
if (!process.env.VERCEL) {
  const frontendBuild = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error.' });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Mera Kameti server port ${PORT} pe chal raha hai`);
    console.log(`📱 Admin: MD NEJAM ANSARI (8434776690)`);
  });
}

module.exports = app;
