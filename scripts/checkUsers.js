const path = require('path');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

async function check() {
  await connectDB();
  const allUsers = await User.find({});
  const staff = allUsers.filter(u => u.role !== 'student');
  console.log('Total users:', allUsers.length);
  console.log('Staff users:', staff.map(s => ({ userId: s.userId, role: s.role, name: s.name, dept: s.dept })));
  process.exit(0);
}
check();
