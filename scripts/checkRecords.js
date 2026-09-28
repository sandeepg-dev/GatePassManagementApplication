const connectDB = require('../src/config/db');
const Pass = require('../src/models/Pass');
const OnDuty = require('../src/models/OnDuty');
const mongoose = require('mongoose');

async function checkPasses() {
  await connectDB();
  const passes = await Pass.find({}).lean();
  console.log(`Total Passes in DB: ${passes.length}`);
  const passSummaries = passes.map(p => ({
    id: p._id,
    rollNo: p.rollNo,
    name: p.name,
    reason: p.reason,
    category: p.requestCategory,
    status: p.status,
    createdAt: p.createdAt
  }));
  console.log(JSON.stringify(passSummaries.slice(0, 30), null, 2));

  const ods = await OnDuty.find({}).lean();
  console.log(`\nTotal ODs in DB: ${ods.length}`);
  const odSummaries = ods.map(o => ({
    id: o._id,
    rollNo: o.rollNo,
    name: o.name,
    purpose: o.purpose || o.eventTitle || o.reason,
    status: o.status,
    createdAt: o.createdAt
  }));
  console.log(JSON.stringify(odSummaries.slice(0, 30), null, 2));

  await mongoose.disconnect();
}

checkPasses().catch(console.error);
