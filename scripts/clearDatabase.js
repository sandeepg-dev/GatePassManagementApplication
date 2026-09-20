/**
 * Script to clear the entire MongoDB database (Passes, Students, Users)
 */
const mongoose = require('mongoose');
const Pass = require('../src/models/Pass');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

async function clearEntireDatabase() {
  try {
    await connectDB();

    const passCount = await Pass.countDocuments();
    const studentCount = await Student.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`Current Database Counts:`);
    console.log(` - Passes / Applications: ${passCount}`);
    console.log(` - Students: ${studentCount}`);
    console.log(` - Users / Logins: ${userCount}`);

    const passRes = await Pass.deleteMany({});
    const studentRes = await Student.deleteMany({});
    const userRes = await User.deleteMany({});

    console.log('\n[Database] Database successfully cleared:');
    console.log(` - Removed ${passRes.deletedCount} pass(es)`);
    console.log(` - Removed ${studentRes.deletedCount} student profile(s)`);
    console.log(` - Removed ${userRes.deletedCount} user account(s)`);

    await mongoose.disconnect();
    console.log('[Database] Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('[Database] Error while clearing database:', err.message);
    process.exit(1);
  }
}

clearEntireDatabase();
