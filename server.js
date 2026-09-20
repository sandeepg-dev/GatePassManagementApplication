/**
 * Campus PassPro Autonomous Outpass & Governance System
 * Server Entry Point
 */
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional; system env and defaults will be used
}
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[Campus PassPro] Server active and listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
