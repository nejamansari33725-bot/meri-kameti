const initSqlJs = require('./lib/sql-wasm');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let SQL = null;
let db = null;
let isReady = false;
let initPromise = null;

const { dbPath, baseDir } = require('./utils/storagePath');
const liveDataPath = path.join(__dirname, '../data/live_data.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'nejamansari33725-bot/meri-kameti';
const GITHUB_FILE = 'data/live_data.json';

function normalizeParams(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0].map(v => (v === undefined ? null : v));
  }
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    const obj = args[0];
    const normalized = {};
    for (const [k, v] of Object.entries(obj)) {
      const val = (v === undefined ? null : v);
      normalized[k] = val;
      if (!k.startsWith('@') && !k.startsWith(':') && !k.startsWith('$')) {
        normalized[`@${k}`] = val;
        normalized[`:${k}`] = val;
        normalized[`$${k}`] = val;
      }
    }
    return normalized;
  }
  return args.map(v => (v === undefined ? null : v));
}

function ensureDbAvailable() {
  if (!db) {
    throw new Error('Database is still initializing. Please retry in a moment.');
  }
}

function saveToDisk() {
  if (!db) return;
  try {
    const binary = db.export();
    const buffer = Buffer.from(binary);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.warn('⚠️ Could not save DB to disk:', err.message);
  }
}

let syncTimer = null;
function scheduleGitHubSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToGitHub().catch(e => console.error('GitHub sync background error:', e.message));
  }, 400);
}

async function fetchFromGitHub() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'MeraKameti-Sync',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.content) return null;
    const decoded = Buffer.from(json.content, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    console.warn('⚠️ fetchFromGitHub failed:', e.message);
    return null;
  }
}

async function syncToGitHub() {
  if (!db) return;
  try {
    const payload = dumpDatabaseToJSON();
    const jsonStr = JSON.stringify(payload, null, 2);
    const base64Content = Buffer.from(jsonStr).toString('base64');

    try {
      if (fs.existsSync(path.dirname(liveDataPath))) {
        fs.writeFileSync(liveDataPath, jsonStr, 'utf8');
      }
    } catch (e) {}

    let sha = null;
    try {
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'MeraKameti-Sync',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const meta = await getRes.json();
        sha = meta.sha;
      }
    } catch (e) {}

    const putBody = {
      message: `data: auto-sync committee updates (${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`,
      content: base64Content
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'MeraKameti-Sync',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(putBody)
    });

    if (putRes.ok) {
      console.log('☁️ Database successfully persisted to GitHub repository!');
    } else {
      console.warn('⚠️ GitHub commit returned status:', putRes.status);
    }
  } catch (err) {
    console.error('❌ syncToGitHub failed:', err.message);
  }
}

function dumpDatabaseToJSON() {
  ensureDbAvailable();
  return {
    users: wrapper.prepare('SELECT * FROM users').all(),
    payments: wrapper.prepare('SELECT * FROM payments').all(),
    committee_rounds: wrapper.prepare('SELECT * FROM committee_rounds').all(),
    settings: wrapper.prepare('SELECT * FROM settings').all(),
    late_fines: wrapper.prepare('SELECT * FROM late_fines').all(),
    payout_requests: wrapper.prepare('SELECT * FROM payout_requests').all(),
    notifications: wrapper.prepare('SELECT * FROM notifications').all(),
    exported_at: new Date().toISOString()
  };
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      profile_photo TEXT,
      security_hint TEXT DEFAULT NULL,
      custom_credit REAL DEFAULT NULL,
      custom_debit REAL DEFAULT NULL,
      custom_late_fine REAL DEFAULT NULL,
      custom_late_fine_due REAL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      late_fine REAL DEFAULT 0,
      repayment_amount REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS late_fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'unpaid',
      payment_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );

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

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      otp TEXT NOT NULL,
      role TEXT,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getTableCount(tableName) {
  try {
    const res = wrapper.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return res ? res.count : 0;
  } catch (e) {
    return 0;
  }
}

async function populateFromLiveData() {
  let data = null;

  try {
    data = require('../data/live_data.json');
    console.log('📦 Loaded bundled live data from data/live_data.json');
  } catch (e) {}

  if (!data && fs.existsSync(liveDataPath)) {
    try {
      const raw = fs.readFileSync(liveDataPath, 'utf8');
      data = JSON.parse(raw);
    } catch (e) {
      console.warn('⚠️ Error reading live_data.json:', e.message);
    }
  }

  if (!data || !data.users || data.users.length === 0) {
    try {
      const ghData = await fetchFromGitHub();
      if (ghData && ghData.users) {
        data = ghData;
        console.log('🌐 Loaded latest data from GitHub repository');
      }
    } catch (e) {
      console.warn('⚠️ GitHub fetch failed:', e.message);
    }
  }

  if (!data) return;

  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO users (id, name, phone, email, password, role, status, created_at, profile_photo, security_hint, custom_credit, custom_debit, custom_late_fine, custom_late_fine_due)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)._runRaw([
        u.id,
        u.name,
        u.phone,
        u.email || null,
        u.password,
        u.role || 'member',
        u.status || 'active',
        u.created_at || new Date().toISOString(),
        u.profile_photo || null,
        u.security_hint || null,
        u.custom_credit ?? null,
        u.custom_debit ?? null,
        u.custom_late_fine ?? null,
        u.custom_late_fine_due ?? null
      ]);
    }
  }

  if (Array.isArray(data.payments)) {
    for (const p of data.payments) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO payments (id, user_id, amount, late_fine, repayment_amount, screenshot_path, reference_no, note, month, year, status, admin_note, submitted_at, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)._runRaw([
        p.id,
        p.user_id,
        p.amount,
        p.late_fine || 0,
        p.repayment_amount || 0,
        p.screenshot_path || null,
        p.reference_no || null,
        p.note || null,
        p.month,
        p.year,
        p.status || 'pending',
        p.admin_note || null,
        p.submitted_at || new Date().toISOString(),
        p.reviewed_at || null
      ]);
    }
  }

  if (Array.isArray(data.committee_rounds)) {
    for (const r of data.committee_rounds) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO committee_rounds (id, month, year, winner_user_id, total_collected, payout_amount, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)._runRaw([
        r.id,
        r.month,
        r.year,
        r.winner_user_id || null,
        r.total_collected || 0,
        r.payout_amount || 0,
        r.notes || null,
        r.created_at || new Date().toISOString()
      ]);
    }
  }

  if (Array.isArray(data.settings)) {
    for (const s of data.settings) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
      `)._runRaw([s.key, s.value]);
    }
  }

  if (Array.isArray(data.late_fines)) {
    for (const f of data.late_fines) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO late_fines (id, user_id, amount, month, year, reason, status, payment_id, created_at, paid_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)._runRaw([
        f.id,
        f.user_id,
        f.amount,
        f.month,
        f.year,
        f.reason || null,
        f.status || 'unpaid',
        f.payment_id || null,
        f.created_at || new Date().toISOString(),
        f.paid_at || null
      ]);
    }
  }

  if (Array.isArray(data.payout_requests)) {
    for (const pr of data.payout_requests) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO payout_requests (id, user_id, month, year, requested_amount, reason, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)._runRaw([
        pr.id,
        pr.user_id,
        pr.month,
        pr.year,
        pr.requested_amount,
        pr.reason || null,
        pr.status || 'pending',
        pr.created_at || new Date().toISOString()
      ]);
    }
  }

  if (Array.isArray(data.notifications)) {
    for (const n of data.notifications) {
      wrapper.prepare(`
        INSERT OR REPLACE INTO notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)._runRaw([
        n.id,
        n.user_id,
        n.title,
        n.message,
        n.type || 'info',
        n.is_read || 0,
        n.created_at || new Date().toISOString()
      ]);
    }
  }

  console.log('✅ Initial database populated from live data snapshot!');
}

function ensureAdmin() {
  try {
    const admin8434 = wrapper.prepare("SELECT id, security_hint, password FROM users WHERE phone = '8434776690'").get();
    const hashed = bcrypt.hashSync('admin123', 10);
    if (!admin8434) {
      wrapper.prepare(`
        INSERT INTO users (name, phone, password, role, status, security_hint)
        VALUES ('MD NEJAM ANSARI', '8434776690', ?, 'admin', 'active', 'Ansari')
      `)._runRaw([hashed]);
    } else {
      wrapper.prepare("UPDATE users SET name = 'MD NEJAM ANSARI', role = 'admin', status = 'active' WHERE phone = '8434776690'")._runRaw([]);
      if (!admin8434.security_hint) {
        wrapper.prepare("UPDATE users SET security_hint = 'Ansari' WHERE phone = '8434776690'")._runRaw([]);
      }
    }
  } catch (e) {
    console.error('ensureAdmin error:', e);
  }
}

async function _init() {
  let wasmBinary = null;
  try {
    wasmBinary = require('./lib/sql-wasm-binary');
    console.log('✅ Loaded wasm from bundled sql-wasm-binary module');
  } catch (e) {
    const wasmBinaryPath = path.join(__dirname, 'lib', 'sql-wasm.wasm');
    wasmBinary = fs.readFileSync(wasmBinaryPath);
  }

  SQL = await initSqlJs({ wasmBinary });

  if (fs.existsSync(dbPath)) {
    try {
      const buf = fs.readFileSync(dbPath);
      db = new SQL.Database(buf);
      console.log('✅ Loaded existing SQLite database from disk:', dbPath);
    } catch (e) {
      console.warn('⚠️ Could not open existing dbPath, creating fresh:', e.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('🆕 Created fresh SQLite database instance');
  }

  createSchema();

  const userCount = getTableCount('users');
  if (userCount === 0) {
    await populateFromLiveData();
  }

  ensureAdmin();
  saveToDisk();

  isReady = true;
  return db;
}

async function ensureReady() {
  if (isReady && db) return db;
  if (!initPromise) {
    initPromise = _init();
  }
  return initPromise;
}

const wrapper = {
  ensureReady,
  syncToGitHub,
  saveToDisk,
  get isReady() {
    return isReady;
  },
  prepare: (sql) => {
    return {
      get: (...args) => {
        ensureDbAvailable();
        const params = normalizeParams(args);
        const stmt = db.prepare(sql);
        try {
          if (params) stmt.bind(params);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },
      all: (...args) => {
        ensureDbAvailable();
        const params = normalizeParams(args);
        const stmt = db.prepare(sql);
        const rows = [];
        try {
          if (params) stmt.bind(params);
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          return rows;
        } finally {
          stmt.free();
        }
      },
      run: (...args) => {
        ensureDbAvailable();
        const params = normalizeParams(args);
        const stmt = db.prepare(sql);
        try {
          if (params) stmt.bind(params);
          stmt.step();
          const changes = db.getRowsModified();
          let lastInsertRowid = 0;
          try {
            const res = db.exec("SELECT last_insert_rowid() AS id");
            if (res && res[0] && res[0].values && res[0].values[0]) {
              lastInsertRowid = res[0].values[0][0];
            }
          } catch (e) {}

          saveToDisk();
          scheduleGitHubSync();

          return { changes, lastInsertRowid };
        } finally {
          stmt.free();
        }
      },
      _runRaw: (params) => {
        const stmt = db.prepare(sql);
        try {
          if (params) stmt.bind(params);
          stmt.step();
          return { changes: db.getRowsModified() };
        } finally {
          stmt.free();
        }
      }
    };
  },
  exec: (sql) => {
    ensureDbAvailable();
    db.exec(sql);
    saveToDisk();
    if (/INSERT|UPDATE|DELETE|DROP|ALTER/i.test(sql)) {
      scheduleGitHubSync();
    }
  },
  pragma: (sql) => {
    ensureDbAvailable();
    try {
      db.exec(`PRAGMA ${sql};`);
    } catch (e) {}
  },
  transaction: (fn) => {
    return (...args) => {
      ensureDbAvailable();
      db.exec('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        db.exec('COMMIT;');
        saveToDisk();
        scheduleGitHubSync();
        return result;
      } catch (err) {
        try { db.exec('ROLLBACK;'); } catch (e) {}
        throw err;
      }
    };
  }
};

// Kick off initialization immediately
ensureReady().catch(err => console.error('Database bootstrap error:', err));

module.exports = wrapper;
