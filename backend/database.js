const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

try { require('dotenv').config(); } catch(e) {}

const db = new Database(path.join(__dirname, '../kameti.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    late_fine REAL DEFAULT 0,
    screenshot_path TEXT,
    reference_no TEXT,
    note TEXT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_note TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS committee_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    winner_user_id INTEGER,
    total_collected REAL DEFAULT 0,
    payout_amount REAL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (winner_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Add payout_amount column if table was created in an older version
try {
  db.exec(`ALTER TABLE committee_rounds ADD COLUMN payout_amount REAL DEFAULT 0;`);
} catch (e) {}

// Add late_fine column to payments if not exists
try {
  db.exec(`ALTER TABLE payments ADD COLUMN late_fine REAL DEFAULT 0;`);
} catch (e) {}

// Add profile_photo column to users if not exists
try {
  db.exec(`ALTER TABLE users ADD COLUMN profile_photo TEXT;`);
} catch (e) {}

// Add repayment_amount column to payments if not exists (for uthaya hua paisa wapsi)
try {
  db.exec(`ALTER TABLE payments ADD COLUMN repayment_amount REAL DEFAULT 0;`);
} catch (e) {}

// Add custom ledger override columns to users for admin direct editing
try {
  db.exec(`ALTER TABLE users ADD COLUMN custom_credit REAL DEFAULT NULL;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN custom_debit REAL DEFAULT NULL;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN custom_late_fine REAL DEFAULT NULL;`);
} catch (e) {}

// Create payout_requests table for members to apply for committee payout / bid
db.exec(`
  CREATE TABLE IF NOT EXISTS payout_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    requested_amount REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed default settings if not exists
const defaultSettings = [
  ['committee_name', 'Mera Kameti'],
  ['upi_id', 'ansarinizam57970-2@oksbi'],
  ['upi_name', 'Nizam Ansari'],
  ['qr_code_url', '/upi-qr.png'],
  ['default_late_fine', '0'],
  ['whatsapp_group_link', 'https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(([k, v]) => insertSetting.run(k, v));

// Also ensure whatsapp_group_link is set to the provided group link
try {
  const existingGroup = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_group_link'").get();
  if (!existingGroup || !existingGroup.value) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('whatsapp_group_link', ?)").run(
      'https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2'
    );
  }
} catch (e) {}

// Seed admin user if not exists
const adminExists = db.prepare("SELECT id FROM users WHERE phone = '0000000000'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (name, phone, password, role)
    VALUES ('Admin', '0000000000', ?, 'admin')
  `).run(hashedPassword);
  console.log('✅ Admin user created: phone=0000000000, password=admin123');
}

module.exports = db;
