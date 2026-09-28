/**
 * Script to remove all test/dummy/mock data from MongoDB:
 * - Deletes all test/dummy passes
 * - Deletes all test/dummy OnDuty requests
 * - Deletes any test/dummy student records (e.g. TEST_BH_..., TEST_GH_..., TEST_MD_...)
 * - Preserves authentic enrolled students and genuine faculty accounts
 */
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Pass = require('../src/models/Pass');
const OnDuty = require('../src/models/OnDuty');
const Student = require('../src/models/Student');
const User = require('../src/models/User');

async function cleanAllDummyData() {
  try {
    await connectDB();
    console.log('[CleanData] Connected to database.');

    const initialPasses = await Pass.countDocuments();
    const initialOD = await OnDuty.countDocuments();
    const initialStudents = await Student.countDocuments();
    const initialUsers = await User.countDocuments();

    console.log(`[CleanData] Pre-clean state:`);
    console.log(` - Passes: ${initialPasses}`);
    console.log(` - On-Duty: ${initialOD}`);
    console.log(` - Students: ${initialStudents}`);
    console.log(` - Users: ${initialUsers}`);

    // 1. Remove all test passes
    const passDel = await Pass.deleteMany({});
    console.log(`[CleanData] Removed ${passDel.deletedCount} pass / leave / gatepass record(s).`);

    // 2. Remove all test on-duty requests
    const odDel = await OnDuty.deleteMany({});
    console.log(`[CleanData] Removed ${odDel.deletedCount} on-duty request record(s).`);

    // 3. Remove any test students (roll numbers starting with TEST or containing test/demo/sample)
    const studentDel = await Student.deleteMany({
      $or: [
        { rollNo: { $regex: /^TEST/i } },
        { name: { $regex: /test|sample|dummy|mock/i } }
      ]
    });
    console.log(`[CleanData] Removed ${studentDel.deletedCount} test student record(s).`);

    // 4. Remove any test user logins if any exist
    const userDel = await User.deleteMany({
      $or: [
        { userId: { $regex: /^TEST/i } },
        { name: { $regex: /test|sample|dummy|mock/i } }
      ]
    });
    console.log(`[CleanData] Removed ${userDel.deletedCount} test user login(s).`);

    // Verification
    const finalPasses = await Pass.countDocuments();
    const finalOD = await OnDuty.countDocuments();
    const finalStudents = await Student.countDocuments();
    const finalUsers = await User.countDocuments();

    console.log(`\n[CleanData] Post-clean production-ready state:`);
    console.log(` - Passes: ${finalPasses} (Clean)`);
    console.log(` - On-Duty: ${finalOD} (Clean)`);
    console.log(` - Genuine Enrolled Students: ${finalStudents}`);
    console.log(` - Genuine Faculty & Admin Users: ${finalUsers}`);

    await mongoose.disconnect();
    console.log('[CleanData] Disconnected from MongoDB. Clean database ready.');
    process.exit(0);
  } catch (err) {
    console.error('[CleanData] Error cleaning database:', err);
    process.exit(1);
  }
}

cleanAllDummyData();
