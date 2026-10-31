const app = require('../backend/server');
const db = require('../backend/database');

module.exports = async (req, res) => {
  try {
    await db.ensureReady();
  } catch (err) {
    console.error('Serverless DB init error:', err);
  }
  return app(req, res);
};
