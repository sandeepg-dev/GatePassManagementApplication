/**
 * Comprehensive Verification Suite: Principal & Warden Portals
 * - Principal: Only Gate Pass Requests (No Leave, No OD), Spacious Card View
 * - Warden: Spacious Card View, Strict Gender Separation (Boys Warden -> Male only, Girls Warden -> Female only) at Backend/Data level
 */
const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const PORT = 10000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('====================================================');
  console.log('PRINCIPAL & WARDEN PORTAL INTEGRATION & ISOLATION SUITE');
  console.log('====================================================\n');

  // --- Suite 1: Source Code & Configuration Static Verification ---
  console.log('--- Suite 1: Static Architecture & Layout Rules ---');
  
  const authPortalJs = fs.readFileSync(path.join(__dirname, '../js/modules/authorityPortal.js'), 'utf8');
  const passControllerJs = fs.readFileSync(path.join(__dirname, '../src/controllers/passController.js'), 'utf8');
  const adminControllerJs = fs.readFileSync(path.join(__dirname, '../src/controllers/adminController.js'), 'utf8');
  const onDutyControllerJs = fs.readFileSync(path.join(__dirname, '../src/controllers/onDutyController.js'), 'utf8');
  const dashboardHtml = fs.readFileSync(path.join(__dirname, '../components/authority/authorityDashboard.html'), 'utf8');

  // 1. Principal & Warden use the card layout
  assert(
    authPortalJs.includes('usesCardsView = isCounselor || isAdvisor || isHod || isPrincipal || isWarden'),
    'Authority portal must enable usesCardsView for Principal and Warden'
  );
  console.log('✓ Principal and Warden Portals enabled for dedicated card layout (usesCardsView)');

  // 2. Comfortable spacing classes
  assert(
    authPortalJs.includes('space-y-6 sm:space-y-7'),
    'Cards container must use spacious gap (space-y-6 sm:space-y-7)'
  );
  assert(
    authPortalJs.includes('p-6 sm:p-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-6'),
    'Card element must have generous padding and vertical spacing'
  );
  assert(
    dashboardHtml.includes('id="counselorCardsContainer" class="hidden space-y-6 sm:space-y-7"'),
    'HTML cards container template must specify space-y-6 sm:space-y-7'
  );
  console.log('✓ Spacious request card styling and generous gaps verified (space-y-6 sm:space-y-7, p-6 sm:p-7)');

  // 3. Principal Portal Gate Pass Only rules
  assert(
    passControllerJs.includes("if (role === 'principal') {\n      filter.requestCategory = { $nin: ['leave', 'onduty'] };"),
    'Pass controller must filter out leave and onduty for principal query'
  );
  assert(
    onDutyControllerJs.includes("if (cleanRole === 'principal' || cleanRole.includes('warden')) {\n      return res.json([]);\n    }"),
    'OnDuty controller must return empty array for principal and warden'
  );
  console.log('✓ Principal Portal backend isolation verified: Leave & OD strictly excluded from database queries');

  // 4. Warden Gender Separation at Backend Level
  assert(
    adminControllerJs.includes("if (cleanRole === 'boys_warden' || cleanRole === 'warden_boys' || cleanRole.includes('boys')) {\n      filter.gender = { $regex: /^male$/i };"),
    'AdminController getStudents must enforce male gender filter for boys warden'
  );
  assert(
    adminControllerJs.includes("else if (cleanRole === 'girls_warden' || cleanRole === 'warden_girls' || cleanRole.includes('girls')) {\n      filter.gender = { $regex: /^female$/i };"),
    'AdminController getStudents must enforce female gender filter for girls warden'
  );
  console.log('✓ AdminController getStudents backend gender isolation verified for Boys & Girls Warden');

  // --- Suite 2: Live Backend API Verification ---
  console.log('\n--- Suite 2: Live Backend API Verification ---');

  // Connect to MongoDB using project connectDB
  const connectDB = require('../src/config/db');
  await connectDB();

  const Student = require('../src/models/Student');
  const Pass = require('../src/models/Pass');
  const OnDuty = require('../src/models/OnDuty');

  // Create test students: 1 Male Hosteller, 1 Female Hosteller, 1 Male Day Scholar
  const ts = Date.now();
  const maleHostelRoll = `TEST_BH_${ts}`;
  const femaleHostelRoll = `TEST_GH_${ts}`;
  const maleDayRoll = `TEST_MD_${ts}`;

  await Student.create([
    {
      rollNo: maleHostelRoll,
      name: 'Rohan Sharma',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Hosteller',
      gender: 'Male',
      parentContact: '9876543210',
      parentName: 'Mr Sharma'
    },
    {
      rollNo: femaleHostelRoll,
      name: 'Pooja Reddy',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Hosteller',
      gender: 'Female',
      parentContact: '9876543211',
      parentName: 'Mr Reddy'
    },
    {
      rollNo: maleDayRoll,
      name: 'Karthik Kumar',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Day Scholar',
      gender: 'Male',
      parentContact: '9876543212',
      parentName: 'Mr Kumar'
    }
  ]);

  // Test Student List Endpoint for Boys Warden
  const bwStudentsRes = await request('GET', `/api/admin/students?role=boys_warden&limit=5000&all=true`);
  assert.strictEqual(bwStudentsRes.status, 200);
  const bwStudents = bwStudentsRes.data.students || bwStudentsRes.data;
  assert(Array.isArray(bwStudents), 'Students must be an array');
  
  // Verify Boys Warden contains the male hosteller and DOES NOT contain the female hosteller
  const bwHasMaleHostel = bwStudents.some(s => s.rollNo === maleHostelRoll);
  const bwHasFemaleHostel = bwStudents.some(s => s.rollNo === femaleHostelRoll);
  assert(bwHasMaleHostel, 'Boys Warden student list must include Male Hosteller');
  assert(!bwHasFemaleHostel, 'Boys Warden student list MUST NOT include Female student at backend level');
  assert(bwStudents.every(s => s.gender === 'Male' || !/^female$/i.test(s.gender || '')), 'All students returned to Boys Warden must be Male');
  console.log(`✓ Boys Warden Student List API: Contains Male hostellers, strictly 0 Female students (${bwStudents.length} students checked)`);

  // Test Student List Endpoint for Girls Warden
  const gwStudentsRes = await request('GET', `/api/admin/students?role=girls_warden&limit=5000&all=true`);
  assert.strictEqual(gwStudentsRes.status, 200);
  const gwStudents = gwStudentsRes.data.students || gwStudentsRes.data;
  assert(Array.isArray(gwStudents), 'Students must be an array');

  // Verify Girls Warden contains the female hosteller and DOES NOT contain the male hosteller
  const gwHasFemaleHostel = gwStudents.some(s => s.rollNo === femaleHostelRoll);
  const gwHasMaleHostel = gwStudents.some(s => s.rollNo === maleHostelRoll);
  assert(gwHasFemaleHostel, 'Girls Warden student list must include Female Hosteller');
  assert(!gwHasMaleHostel, 'Girls Warden student list MUST NOT include Male student at backend level');
  assert(gwStudents.every(s => s.gender === 'Female' || /^female$/i.test(s.gender || '')), 'All students returned to Girls Warden must be Female');
  console.log(`✓ Girls Warden Student List API: Contains Female hostellers, strictly 0 Male students (${gwStudents.length} students checked)`);

  // --- Suite 3: Passes & OnDuty API Isolation ---
  console.log('\n--- Suite 3: Passes & OnDuty API Isolation ---');

  // Create Passes:
  // 1. Male Hosteller Gate Pass pending Principal/Warden
  // 2. Female Hosteller Gate Pass pending Principal/Warden
  // 3. Leave Request pending HOD (should never reach Principal)
  const [malePass, femalePass, leavePass] = await Promise.all([
    Pass.create({
      rollNo: maleHostelRoll,
      name: 'Rohan Sharma',
      dept: 'CSE',
      yearSec: 'A',
      accommodation: 'Hosteller',
      gender: 'Male',
      reason: 'Weekend Home Visit',
      requestCategory: 'gate_pass',
      status: 'Pending Principal',
      departureDate: '2026-10-01',
      departureTime: '16:00',
      expectedReturnDate: '2026-10-04',
      expectedReturnTime: '08:00',
      hodApproval: { approved: true, approvedBy: 'HOD CSE', date: new Date() }
    }),
    Pass.create({
      rollNo: femaleHostelRoll,
      name: 'Pooja Reddy',
      dept: 'CSE',
      yearSec: 'A',
      accommodation: 'Hosteller',
      gender: 'Female',
      reason: 'Family Event Visit',
      requestCategory: 'gate_pass',
      status: 'Pending Principal',
      departureDate: '2026-10-01',
      departureTime: '16:00',
      expectedReturnDate: '2026-10-04',
      expectedReturnTime: '08:00',
      hodApproval: { approved: true, approvedBy: 'HOD CSE', date: new Date() }
    }),
    Pass.create({
      rollNo: maleHostelRoll,
      name: 'Rohan Sharma',
      dept: 'CSE',
      yearSec: 'A',
      accommodation: 'Hosteller',
      gender: 'Male',
      reason: 'Medical Leave',
      requestCategory: 'leave',
      status: 'Pending HOD',
      fromDate: '2026-10-05',
      toDate: '2026-10-07',
      advisorApproval: { approved: true, approvedBy: 'Advisor CSE', date: new Date() }
    })
  ]);

  // Create an OD Request
  const odRequest = await OnDuty.create({
    rollNo: maleHostelRoll,
    name: 'Rohan Sharma',
    dept: 'CSE',
    yearSec: 'A',
    eventTitle: 'National Hackathon',
    reason: 'Inter-college symposium',
    mode: 'dates',
    fromDate: '2026-10-08',
    toDate: '2026-10-09',
    status: 'Pending HOD'
  });

  // Verify Principal Passes Endpoint: Only Gate Passes (No Leave)
  const principalPassesRes = await request('GET', '/api/passes?role=principal');
  assert.strictEqual(principalPassesRes.status, 200);
  const principalPasses = principalPassesRes.data;
  assert(Array.isArray(principalPasses), 'Principal passes must be an array');
  
  assert(principalPasses.some(p => p._id === String(malePass._id)), 'Principal must see Male Hosteller Gate Pass');
  assert(principalPasses.some(p => p._id === String(femalePass._id)), 'Principal must see Female Hosteller Gate Pass');
  assert(!principalPasses.some(p => p._id === String(leavePass._id)), 'Principal MUST NOT receive Leave requests at API level');
  assert(principalPasses.every(p => p.requestCategory !== 'leave'), 'No request with requestCategory "leave" can be returned to Principal');
  console.log('✓ Principal Portal: Only Gate Pass requests returned, Leave requests strictly excluded');

  // Verify Principal OnDuty Endpoint: Completely empty []
  const principalOdRes = await request('GET', '/api/onduty?role=principal');
  assert.strictEqual(principalOdRes.status, 200);
  assert(Array.isArray(principalOdRes.data) && principalOdRes.data.length === 0, 'Principal OD API must return an empty array []');
  console.log('✓ Principal Portal: OD requests endpoint strictly returns empty list []');

  // Verify Warden OnDuty Endpoint: Completely empty []
  const wardenOdRes = await request('GET', '/api/onduty?role=boys_warden');
  assert.strictEqual(wardenOdRes.status, 200);
  assert(Array.isArray(wardenOdRes.data) && wardenOdRes.data.length === 0, 'Warden OD API must return an empty array []');
  console.log('✓ Warden Portal: OD requests endpoint strictly returns empty list []');

  // Now advance malePass and femalePass to Warden level:
  malePass.status = 'Pending Boys Warden';
  malePass.principalApproval = { approved: true, approvedBy: 'Dr Principal', date: new Date() };
  await malePass.save();

  femalePass.status = 'Pending Girls Warden';
  femalePass.principalApproval = { approved: true, approvedBy: 'Dr Principal', date: new Date() };
  await femalePass.save();

  // Test Boys Warden Passes: Male only
  const bwPassesRes = await request('GET', '/api/passes?role=boys_warden');
  assert.strictEqual(bwPassesRes.status, 200);
  const bwPasses = bwPassesRes.data;
  assert(bwPasses.some(p => p._id === String(malePass._id)), 'Boys Warden must see Male Gate Pass');
  assert(!bwPasses.some(p => p._id === String(femalePass._id)), 'Boys Warden MUST NOT see Female Gate Pass');
  assert(!bwPasses.some(p => p._id === String(leavePass._id)), 'Boys Warden MUST NOT see Leave Requests');
  assert(bwPasses.every(p => p.gender === 'Male' || !/^female$/i.test(p.gender || '')), 'All passes returned to Boys Warden must be for Male students');
  console.log('✓ Boys Warden: Sees Male Gate Passes only, Female Gate Passes strictly excluded');

  // Test Girls Warden Passes: Female only
  const gwPassesRes = await request('GET', '/api/passes?role=girls_warden');
  assert.strictEqual(gwPassesRes.status, 200);
  const gwPasses = gwPassesRes.data;
  assert(gwPasses.some(p => p._id === String(femalePass._id)), 'Girls Warden must see Female Gate Pass');
  assert(!gwPasses.some(p => p._id === String(malePass._id)), 'Girls Warden MUST NOT see Male Gate Pass');
  assert(!gwPasses.some(p => p._id === String(leavePass._id)), 'Girls Warden MUST NOT see Leave Requests');
  assert(gwPasses.every(p => p.gender === 'Female' || /^female$/i.test(p.gender || '')), 'All passes returned to Girls Warden must be for Female students');
  console.log('✓ Girls Warden: Sees Female Gate Passes only, Male Gate Passes strictly excluded');

  // --- Suite 4: Clean up test fixtures ---
  await Student.deleteMany({ rollNo: { $in: [maleHostelRoll, femaleHostelRoll, maleDayRoll] } });
  await Pass.deleteMany({ _id: { $in: [malePass._id, femalePass._id, leavePass._id] } });
  await OnDuty.deleteMany({ _id: odRequest._id });
  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log('✅ ALL PRINCIPAL & WARDEN PORTAL TESTS PASSED (100%)!');
  console.log('======================================================');
}

runSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
