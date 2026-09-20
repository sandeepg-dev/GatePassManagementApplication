/**
 * Script to clear all leave applications and gate passes from MongoDB
 */
const mongoose = require('mongoose');
const Pass = require('../src/models/Pass');
const connectDB = require('../src/config/db');

async function clearAllPasses() {
  try {
    await connectDB();
    const countBefore = await Pass.countDocuments();
    console.log(`Found ${countBefore} leave applications/gate passes in the database.`);

    const result = await Pass.deleteMany({});
    console.log(`[Database] Successfully removed ${result.deletedCount} pass record(s). All queues, logs, and trackers are now empty.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Database] Error while clearing passes:', err.message);
    process.exit(1);
  }
}

clearAllPasses();
