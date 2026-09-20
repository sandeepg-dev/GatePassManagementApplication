/**
 * MongoDB Database Connection Manager
 */
const mongoose = require('mongoose');
const dns = require('dns');

// Set reliable public DNS servers ONLY in local development
// Never override DNS in serverless environments (e.g. Vercel / AWS Lambda / Cloud containers)
if (!process.env.VERCEL && !process.env.AWS_REGION && !process.env.LAMBDA_TASK_ROOT && process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
  } catch (e) {
    // Ignore if not permitted
  }
}

const DEFAULT_MONGO_URI = "mongodb+srv://admin:AdminPass123@cluster0.gpgplkf.mongodb.net/gatepass?retryWrites=true&w=majority";

// Global connection caching for serverless environments (Vercel / AWS Lambda)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async (retries = 3, delay = 1500) => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    }).then(conn => {
      console.log(`[DB] Connected to MongoDB: ${conn.connection.host}`);
      return conn;
    });
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (err) {
      cached.promise = null;
      console.error(`[DB] Connection Failure (Attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        console.log(`[DB] Retrying connection in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        cached.promise = mongoose.connect(uri, {
          serverSelectionTimeoutMS: 8000,
          socketTimeoutMS: 45000,
        });
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
