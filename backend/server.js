// Production server - env vars injected by Railway
// For local: set env vars manually
const express = require('express');
const cors = require('cors');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch(e) { /* ok */ }
}

require('./database');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/members', require('./routes/members'));
app.use('/api/committee', require('./routes/committee'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mera Kameti chal raha hai! 🟢' });
});

const frontendBuild = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Mera Kameti port ${PORT} pe chal raha hai`);
  console.log(`📱 Admin: 0000000000 / admin123`);
});