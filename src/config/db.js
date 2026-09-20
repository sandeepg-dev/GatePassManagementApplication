/**
 * MongoDB Database Connection Manager
 */
const mongoose = require('mongoose');
const dns = require('dns');

// Set reliable public DNS servers (Google & Cloudflare) to prevent querySrv ECONNREFUSED with Atlas on local/ISP DNS
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
} catch (e) {
  // Ignore if not permitted
}

const DEFAULT_MONGO_URI = "mongodb+srv://admin:AdminPass123@cluster0.gpgplkf.mongodb.net/gatepass?retryWrites=true&w=majority";

const connectDB = async (retries = 5, delay = 3000) => {
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      });
      console.log(`[DB] Connected to MongoDB: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      console.error(`[DB] Connection Failure (Attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        console.log(`[DB] Retrying connection in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Connection lost. Attempting to reconnect...');
});

module.exports = connectDB;
