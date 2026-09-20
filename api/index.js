/**
 * Vercel Serverless Function Handler
 * Boots Express with global connection caching for high-speed API routes
 */
const app = require('../src/app');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Serverless MongoDB Connection Error:', err.message);
  }
  return app(req, res);
};
