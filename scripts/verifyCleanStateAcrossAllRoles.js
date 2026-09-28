/**
 * End-to-end verification of clean database and zero mock data across all roles:
 * - Student
 * - Counselor
 * - Class Advisor
 * - HOD
 * - Principal
 * - Warden
 * - Admin
 *
 * Verifies that:
 * 1. Database has 0 passes, 0 on-duty records, 0 dummy students.
 * 2. Only genuine enrolled students (122) and faculty/admin exist.
 * 3. All API endpoints return genuine data and empty arrays [] for passes/on-duty.
 * 4. All portal rendering engines produce clean empty state messages ("No data available" / "No requests found" / "No Requisitions Found") without any mock data fallback.
 */
const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Pass = require('../src/models/Pass');
const OnDuty = require('../src/models/OnDuty');
const Student = require('../src/models/Student');
const User = require('../src/models/User');

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

// Simple DOM Mock for frontend view testing
class MockElement {
  constructor(id = '') {
    this.id = id;
    this.innerHTML = '';
    this.innerText = '';
    this.textContent = '';
    this.classList = new Set();
    this.classList.add = (c) => this.classList[c] = true;
    this.classList.remove = (c) => delete this.classList[c];
    this.classList.contains = (c) => !!this.classList[c];
    this.style = {};
  }
}

const mockDom = {};
function getMockEl(id) {
  if (!mockDom[id]) mockDom[id] = new MockElement(id);
  return mockDom[id];
}

global.document = {
  getElementById: getMockEl,
  querySelectorAll: () => [],
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getMockEl(sel.slice(1));
    return new MockElement();
  },
  createElement: () => new MockElement(),
  body: new MockElement('body')
};
global.window = {
  location: { reload: () => {} },
  loggedUser: null
};

async function verifyZeroMockCleanState() {
  console.log('====================================================');
  console.log('AUDITING CLEAN ZERO-MOCK STATE ACROSS SYSTEM');
  console.log('====================================================\n');

  // --- Step 1: Direct MongoDB Audit ---
  console.log('--- Step 1: MongoDB Database Audit ---');
  await connectDB();
  const passCount = await Pass.countDocuments();
  const odCount = await OnDuty.countDocuments();
  const studentCount = await Student.countDocuments();
  const userCount = await User.countDocuments();

  console.log(`[DB] Passes count: ${passCount}`);
  console.log(`[DB] OnDuty count: ${odCount}`);
  console.log(`[DB] Students count: ${studentCount}`);
  console.log(`[DB] Users count: ${userCount}`);

  assert.strictEqual(passCount, 0, 'Database passes count must be strictly 0');
  assert.strictEqual(odCount, 0, 'Database onduty count must be strictly 0');
  assert(studentCount >= 120, 'Database students count must reflect genuine enrolled students');

  // Verify zero test student roll numbers exist
  const testStudents = await Student.find({
    $or: [
      { rollNo: { $regex: /^TEST/i } },
      { name: { $regex: /test|dummy|sample|mock/i } }
    ]
  }).lean();
  assert.strictEqual(testStudents.length, 0, 'No test students should exist in database');
  console.log('✓ Database contains 0 dummy requests, 0 dummy students, and strictly genuine production records.');

  // --- Step 2: Live API Endpoints Check ---
  console.log('\n--- Step 2: Live API Endpoints Validation ---');

  // 1. Passes API
  const passesRes = await request('GET', '/api/passes');
  assert.strictEqual(passesRes.status, 200);
  assert(Array.isArray(passesRes.data), 'Passes API must return array');
  assert.strictEqual(passesRes.data.length, 0, 'Passes API must return 0 records in clean state');
  console.log('✓ /api/passes returns 0 records');

  // 2. OnDuty API
  const odRes = await request('GET', '/api/onduty');
  assert.strictEqual(odRes.status, 200);
  assert(Array.isArray(odRes.data), 'OD API must return array');
  assert.strictEqual(odRes.data.length, 0, 'OD API must return 0 records in clean state');
  console.log('✓ /api/onduty returns 0 records');

  // 3. Scan History API
  const scanRes = await request('GET', '/api/scan-history');
  assert.strictEqual(scanRes.status, 200);
  assert(Array.isArray(scanRes.data.history), 'Scan history must return history array');
  assert.strictEqual(scanRes.data.history.length, 0, 'Scan history must return 0 records in clean state');
  console.log('✓ /api/scan-history returns 0 records');

  // 4. Admin Students Registry API
  const adminStudentsRes = await request('GET', '/api/admin/students?limit=5000&all=true');
  assert.strictEqual(adminStudentsRes.status, 200);
  const studentsList = adminStudentsRes.data.students || adminStudentsRes.data;
  assert(studentsList.length >= 120, 'Admin student registry should return genuine enrolled students');
  console.log(`✓ /api/admin/students returns genuine enrolled students (${studentsList.length})`);

  // --- Step 3: Frontend Rendering Clean Empty States Check ---
  console.log('\n--- Step 3: Frontend Portal Rendering Empty States ---');

  const fs = require('fs');
  global.window = global;
  global.Api = {
    get: async () => [],
    post: async () => ({ success: true })
  };
  global.escapeHtml = (s) => String(s || '');
  global.escapeAttr = (s) => String(s || '');
  global.showToast = () => {};
  global.formatAcademicDateTime = (d, t) => `${d || ''} ${t || ''}`.trim() || '-';
  global.formatAcademicDate = (d) => d || '-';
  global.formatAppliedDateStamp = () => '-';
  global.getDetailedStatusInfo = () => ({ statusText: 'Pending', statusClass: 'badge-pending', authorityText: '-' });

  // Load authorityPortal in sandbox
  const authPortalCode = fs.readFileSync('js/modules/authorityPortal.js', 'utf8');
  eval(authPortalCode);

  const ROLES = [
    { role: 'counselor', name: 'Mrs shanmugavalli', userId: '7471', ward: '110324104081 - 110324104100' },
    { role: 'advisor', name: 'shanmugavalli', userId: '7472', dept: 'CSE', yearSec: 'B' },
    { role: 'hod', name: 'Dr kamal', userId: '7247', dept: 'CSE' },
    { role: 'principal', name: 'Dr Arumugam', userId: 'grt@head' },
    { role: 'boys_warden', name: 'Mr Arul Prasad', userId: '6661' }
  ];

  for (const roleObj of ROLES) {
    window.loggedUser = roleObj;
    authState.requests = [];
    authState.subFilter = 'gatepass';
    authState.activeTab = 'gatepass';

    // Call renderAuthorityRequestsTable
    renderAuthorityRequestsTable();

    const cardsHtml = getMockEl('counselorCardsContainer').innerHTML;
    assert(cardsHtml.includes('No') && cardsHtml.includes('Pending'), `${roleObj.role} cards container must render clean empty state`);
    assert(!cardsHtml.includes('Automated Test Leave'), `${roleObj.role} must not display any fake data`);
    console.log(`✓ ${roleObj.role} Portal: cleanly renders "No Gate Pass Requests Pending" empty state with 0 records.`);
  }

  // Load studentRequests in sandbox
  const studentRequestsCode = fs.readFileSync('js/modules/student/studentRequests.js', 'utf8');
  eval(studentRequestsCode);

  const studentUser = {
    userId: '110324104061',
    name: 'NAVEEN K R',
    rollNo: '110324104061',
    role: 'student',
    dept: 'CSE',
    yearSec: 'B',
    accommodation: 'Day Scholar'
  };
  window.loggedUser = studentUser;
  cachedStudentPasses = [];
  cachedStudentODs = [];

  renderUnifiedRequestsTable();
  const studentTableHtml = getMockEl('stuUnifiedRequestsTableBody').innerHTML;
  const recentHtml = getMockEl('dashRecentRequestsContainer').innerHTML;

  assert(studentTableHtml.includes('No Requisitions Found'), 'Student unified requests must render "No Requisitions Found"');
  assert(recentHtml.includes('No Requisitions Submitted Yet'), 'Student recent requisitions must render "No Requisitions Submitted Yet"');
  assert.strictEqual(getMockEl('dashKpiPending').innerText, '0', 'Student pending KPI must be 0');
  assert.strictEqual(getMockEl('dashKpiApproved').innerText, '0', 'Student approved KPI must be 0');
  assert.strictEqual(getMockEl('dashKpiTotal').innerText, '0', 'Student total KPI must be 0');

  console.log('✓ Student Portal: cleanly renders "No Requisitions Found", "No Requisitions Submitted Yet", and 0 KPI counts.');

  console.log('\n======================================================');
  console.log('✅ ALL TESTS PASSED: DATABASE & APPLICATION 100% CLEAN!');
  console.log('======================================================\n');
  process.exit(0);
}

verifyZeroMockCleanState().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
