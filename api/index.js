let app;
let db;
let initError = null;

try {
  app = require('../backend/server');
  db = require('../backend/database');
} catch (err) {
  initError = err;
  console.error('Initial module require error:', err);
}

module.exports = async (req, res) => {
  if (initError) {
    return res.status(500).json({
      error: 'Module require failed',
      message: initError.message,
      stack: initError.stack
    });
  }

  try {
    if (db && db.ensureReady) {
      await db.ensureReady();
    }
    return app(req, res);
  } catch (err) {
    console.error('Serverless request handling error:', err);
    return res.status(500).json({
      error: 'Request handling error',
      message: err.message,
      stack: err.stack
    });
  }
};
