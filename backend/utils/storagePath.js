const path = require('path');
const fs = require('fs');

let baseDir = path.join(__dirname, '../..');
if (fs.existsSync('/app/data')) {
  baseDir = '/app/data';
} else if (process.env.DATABASE_DIR && fs.existsSync(process.env.DATABASE_DIR)) {
  baseDir = process.env.DATABASE_DIR;
} else if (process.env.VERCEL) {
  baseDir = '/tmp';
}

const dbPath = path.join(baseDir, 'kameti.db');
const uploadsDir = path.join(baseDir, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {}
}

console.log(`🛡️ Storage Path Initialized: DB=${dbPath} | Uploads=${uploadsDir} | Persistent=${baseDir === '/app/data' ? 'YES (Railway Cloud Volume)' : 'Local'}`);

module.exports = {
  baseDir,
  dbPath,
  uploadsDir,
  isPersistent: baseDir === '/app/data'
};
