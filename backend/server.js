const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch(e) { /* ok */ }
}

const db = require('./database');
const { uploadsDir } = require('./utils/storagePath');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure DB is ready and synchronized before handling requests
let lastSyncCheck = 0;
app.use(async (req, res, next) => {
  try {
    await db.ensureReady();
    const now = Date.now();
    if (now - lastSyncCheck > 3000) {
      lastSyncCheck = now;
      await db.refreshFromGitHub(false);
    }
    next();
  } catch (err) {
    console.error('Database connection error in request:', err);
    res.status(503).json({ error: 'Database initializing. Please retry in 2 seconds.' });
  }
});

// Await GitHub commit persistence on write requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const originalJson = res.json.bind(res);
    res.json = async function (data) {
      try {
        await db.syncToGitHub();
      } catch (err) {
        console.warn('GitHub write sync error:', err.message);
      }
      return originalJson(data);
    };
  }
  next();
});

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback for uploaded files (redirect to GitHub raw if file not cached in serverless container)
app.get(['/uploads/:filename', '/api/uploads/:filename'], (req, res) => {
  const filename = req.params.filename;
  const p1 = path.join(uploadsDir, filename);
  if (fs.existsSync(p1)) return res.sendFile(p1);
  const p2 = path.join(__dirname, 'uploads', filename);
  if (fs.existsSync(p2)) return res.sendFile(p2);
  return res.redirect(302, `https://raw.githubusercontent.com/nejamansari33725-bot/meri-kameti/main/backend/uploads/${filename}`);
});

// Route imports
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const memberRoutes = require('./routes/members');
const committeeRoutes = require('./routes/committee');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');

// Mount routes with BOTH '/api/xyz' and '/xyz' to handle any Vercel rewrite variation
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/payments', paymentRoutes);

app.use('/api/members', memberRoutes);
app.use('/members', memberRoutes);

app.use('/api/committee', committeeRoutes);
app.use('/committee', committeeRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

app.use('/api/settings', settingRoutes);
app.use('/settings', settingRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mera Kameti chal raha hai! 🟢',
    platform: 'Vercel Serverless + GitHub Storage',
    dbReady: db.isReady,
    hasGhToken: !!(process.env.GITHUB_TOKEN || db.hasToken),
    admin: 'MD NEJAM ANSARI (8434776690)'
  });
});

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
