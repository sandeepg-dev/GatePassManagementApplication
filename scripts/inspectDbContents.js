const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Pass = require('../src/models/Pass');
const OnDuty = require('../src/models/OnDuty');
const mongoose = require('mongoose');

async function inspectDb() {
  await connectDB();
  const [users, students, passes, ods] = await Promise.all([
    User.find({}).lean(),
    Student.find({}).lean(),
    Pass.find({}).lean(),
    OnDuty.find({}).lean()
  ]);

  console.log(`=== DATABASE AUDIT ===`);
  console.log(`Total Users: ${users.length}`);
  users.forEach(u => console.log(`User: ${u.userId} | ${u.name} | ${u.role} | ${u.dept} | ${u.yearSec || ''}`));

  console.log(`\nTotal Students: ${students.length}`);
  console.log(`Total Passes: ${passes.length}`);
  console.log(`Total OnDuty: ${ods.length}`);

  await mongoose.disconnect();
}

inspectDb().catch(console.error);
