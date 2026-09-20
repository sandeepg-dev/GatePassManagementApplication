/**
 * Vercel Serverless Function Handler
 * Boots Express with global connection caching for high-speed API routes
 */
const app = require('../src/app');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  // Ensure database connection is established
  try {
    await connectDB();
  } catch (err) {
    console.error('Serverless MongoDB Connection Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server failed to connect to database. Please check MongoDB Atlas IP Access (0.0.0.0/0).',
      error: err.message
    });
  }

  // Normalize req.url to guarantee /api prefix for Express router
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }

  return app(req, res);
};
