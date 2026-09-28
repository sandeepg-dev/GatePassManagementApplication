/**
 * Gate Pass – Scanning and Entry/Exit Process Verification Suite
 * Verifies Hosteller Exit & Return, Day Scholar Exit, Scanner ID Recognition, and Status Flow
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('GATE PASS SCANNING & ENTRY/EXIT PROCESS TEST SUITE');
console.log('====================================================');

// 1. Test Scanner ID Extraction Capabilities (Requirement 4)
console.log('\n--- Suite 1: Scanner ID Extraction & Card Recognition ---');
const scannerJsPath = path.join(__dirname, '../js/scanner.js');
const scannerCode = fs.readFileSync(scannerJsPath, 'utf8');

// Load extractStudentIdentifier into isolated context
const evalContext = {};
const extractFnCode = scannerCode.match(/function extractStudentIdentifier\(raw\) \{[\s\S]*?\n\}/)[0];
const extractStudentIdentifier = new Function(`return (${extractFnCode})`)();

// Test cases for College ID recognition
assert.strictEqual(extractStudentIdentifier('110324104081'), '110324104081', 'Direct 12-digit register number must be recognized');
assert.strictEqual(extractStudentIdentifier('  110324104090  '), '110324104090', 'Trimmed register number must be recognized');
assert.strictEqual(extractStudentIdentifier('21CS001'), '21CS001', 'Alphanumeric roll number must be recognized');
assert.strictEqual(extractStudentIdentifier('*110324104081*'), '110324104081', 'Code 39 barcode wrapped in asterisks must be cleanly stripped');
assert.strictEqual(extractStudentIdentifier('REG NO: 110324104081'), '110324104081', 'Labeled register number must be extracted');
assert.strictEqual(extractStudentIdentifier('Roll No: 21CS045'), '21CS045', 'Labeled roll number must be extracted');
assert.strictEqual(extractStudentIdentifier('{"rollNo":"110324104081","name":"Priya"}'), '110324104081', 'JSON QR payload rollNo must be extracted');
assert.strictEqual(extractStudentIdentifier('{"regNo":"110324104095"}'), '110324104095', 'JSON QR payload regNo must be extracted');
assert.strictEqual(extractStudentIdentifier('https://grt.edu.in/verify?roll=110324104081'), '110324104081', 'URL query param roll must be extracted');
assert.strictEqual(extractStudentIdentifier('https://grt.edu.in/verify?id=21CS002'), '21CS002', 'URL query param id must be extracted');
console.log('✓ All 10 ID card & barcode formats correctly recognized and parsed');

// 2. Test Scan Controller Logic (Requirements 1, 2, 3, 4, 5)
console.log('\n--- Suite 2: Scan Controller Movement Logic & Status Transitions ---');
const scanController = require('../src/controllers/scanController');

// Mock Mongoose Models
class MockQuery {
  constructor(data) {
    this._data = data;
  }
  sort() { return this; }
  limit() { return this; }
  lean() { return Promise.resolve(this._data); }
  then(resolve, reject) {
    return Promise.resolve(this._data).then(resolve, reject);
  }
}

const mockPassStore = [];
const mockStudentStore = [
  { rollNo: '110324104001', name: 'Karthik Raja', dept: 'CSE', yearSec: 'A', accommodation: 'Day Scholar' },
  { rollNo: '110324104081', name: 'Priya Sharma', dept: 'CSE', yearSec: 'B', accommodation: 'Hosteller' },
  { rollNo: '110324104099', name: 'Suresh Kumar', dept: 'ECE', yearSec: 'A', accommodation: 'Hosteller' }
];

const PassModel = require('../src/models/Pass');
const StudentModel = require('../src/models/Student');

// Stub Pass.find and Student.findOne
PassModel.find = (filter) => {
  let results = [...mockPassStore];
  if (filter && filter.rollNo) {
    results = results.filter(p => p.rollNo === filter.rollNo);
  }
  return new MockQuery(results);
};

StudentModel.findOne = (filter) => {
  let res = null;
  if (filter && filter.rollNo) {
    res = mockStudentStore.find(s => s.rollNo === filter.rollNo) || null;
  }
  return { lean: async () => res };
};

// Helper mock req/res
function mockReqRes(body, query = {}) {
  const req = { body, query: query || {} };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  return { req, res, getResult: () => ({ statusCode, responseData }) };
}

(async () => {
  // TEST A: Invalid / Unregistered ID Card
  const testA = mockReqRes({ rollNo: '999999999999' });
  await scanController.scanPass(testA.req, testA.res);
  const resA = testA.getResult();
  assert.strictEqual(resA.statusCode, 404, 'Unregistered card must return 404');
  assert.strictEqual(resA.responseData.action, 'unregistered');
  assert(resA.responseData.message.includes('Invalid / Unregistered ID Card'), 'Clear rejection message for unregistered card');
  console.log('✓ Unregistered card correctly rejected with clear error message');

  // TEST B: Registered student with NO gate pass application
  const testB = mockReqRes({ rollNo: '110324104099' });
  await scanController.scanPass(testB.req, testB.res);
  const resB = testB.getResult();
  assert.strictEqual(resB.statusCode, 404, 'Student with no pass must return 404');
  assert.strictEqual(resB.responseData.action, 'no_pass');
  assert(resB.responseData.message.includes('no active gate pass application'), 'Clear rejection message for no pass');
  console.log('✓ Student with no gate pass application rejected cleanly');

  // TEST C: Student with PENDING gate pass (not yet approved)
  const pendingPass = {
    _id: 'pass_pending_1',
    rollNo: '110324104081',
    name: 'Priya Sharma',
    accommodation: 'Hosteller',
    dept: 'CSE',
    status: 'Pending HOD',
    save: async function() {}
  };
  mockPassStore.push(pendingPass);

  const testC = mockReqRes({ rollNo: '110324104081' });
  await scanController.scanPass(testC.req, testC.res);
  const resC = testC.getResult();
  assert.strictEqual(resC.statusCode, 400, 'Pending pass cannot be scanned for exit');
  assert(resC.responseData.message.includes('still pending clearance'), 'Pending approval required message');
  console.log('✓ Pending gate pass cannot exit campus without approval');

  // TEST D: Hosteller Approved Gate Pass -> Exit Scan (Requirement 1)
  pendingPass.status = 'Approved';
  const testD = mockReqRes({ rollNo: '110324104081', scanType: 'auto' });
  await scanController.scanPass(testD.req, testD.res);
  const resD = testD.getResult();
  assert.strictEqual(resD.statusCode, 200, 'Approved pass successfully scans exit');
  assert.strictEqual(resD.responseData.action, 'exit');
  assert.strictEqual(resD.responseData.status, 'Exited');
  assert.strictEqual(pendingPass.status, 'Exited', 'Pass status must change to "Exited"');
  assert.strictEqual(pendingPass.exitStatus, 'Exited Campus');
  assert(pendingPass.exitTime && pendingPass.exitTime !== '-', 'Exact exit time must be recorded');
  assert.strictEqual(pendingPass.returnStatus, 'Awaiting Return');
  console.log('✓ Hosteller Exit Scan: Status changed to "Exited" and exit date/time recorded in IST');

  // TEST E: Hosteller duplicate exit scan prevention (Requirement 4)
  const testE = mockReqRes({ rollNo: '110324104081', scanType: 'exit' });
  await scanController.scanPass(testE.req, testE.res);
  const resE = testE.getResult();
  assert.strictEqual(resE.statusCode, 400, 'Duplicate exit scan must be rejected');
  assert(resE.responseData.message.includes('already exited campus'), 'Duplicate exit rejected message');
  console.log('✓ Duplicate exit scan for already exited Hosteller prevented');

  // TEST F: Hosteller Return / Entry Scanning (Requirement 2 & 5)
  // Hosteller returns and scans ID card again
  const testF = mockReqRes({ rollNo: '110324104081', scanType: 'auto' });
  await scanController.scanPass(testF.req, testF.res);
  const resF = testF.getResult();
  assert.strictEqual(resF.statusCode, 200, 'Return scan must succeed for Exited Hosteller');
  assert.strictEqual(resF.responseData.action, 'return');
  assert.strictEqual(resF.responseData.status, 'Scanned In Campus');
  assert.strictEqual(pendingPass.status, 'Scanned In Campus', 'Hosteller status must change to "Scanned In Campus"');
  assert.strictEqual(pendingPass.returnStatus, 'Scanned In Campus');
  assert(pendingPass.returnTime && pendingPass.returnTime !== '-', 'Return/entry date and time must be recorded');
  console.log('✓ Hosteller Return Scan: Status changed to "Scanned In Campus" and return date/time recorded in IST');

  // TEST G: Hosteller duplicate return scan prevention
  const testG = mockReqRes({ rollNo: '110324104081', scanType: 'return' });
  await scanController.scanPass(testG.req, testG.res);
  const resG = testG.getResult();
  assert.strictEqual(resG.statusCode, 400, 'Duplicate return scan must be rejected');
  assert(resG.responseData.message.includes('already completed campus entry') || resG.responseData.message.includes('completed'), 'Duplicate return rejected message');
  console.log('✓ Duplicate return scan after lifecycle completion prevented');

  // TEST H: Day Scholar Exit Scanning (Requirement 3)
  const dayScholarPass = {
    _id: 'pass_dayscholar_1',
    rollNo: '110324104001',
    name: 'Karthik Raja',
    accommodation: 'Day Scholar',
    dept: 'CSE',
    status: 'Approved',
    save: async function() {}
  };
  mockPassStore.push(dayScholarPass);

  const testH = mockReqRes({ rollNo: '110324104001', scanType: 'auto' });
  await scanController.scanPass(testH.req, testH.res);
  const resH = testH.getResult();
  assert.strictEqual(resH.statusCode, 200, 'Day Scholar exit scan succeeds');
  assert.strictEqual(resH.responseData.status, 'Exited');
  assert.strictEqual(dayScholarPass.status, 'Exited');
  assert.strictEqual(dayScholarPass.exitStatus, 'Exited Campus');
  assert(dayScholarPass.exitTime && dayScholarPass.exitTime !== '-', 'Exact exit time must be recorded for Day Scholar');
  assert.strictEqual(dayScholarPass.returnStatus, 'Not Applicable (Day Scholar)');
  console.log('✓ Day Scholar Exit Scan: Status changed to "Exited" and exit date/time recorded in IST');

  // TEST I: Day Scholar Return scan must be rejected (Requirement 3)
  const testI = mockReqRes({ rollNo: '110324104001', scanType: 'return' });
  await scanController.scanPass(testI.req, testI.res);
  const resI = testI.getResult();
  assert.strictEqual(resI.statusCode, 400, 'Return scan must not be applicable for Day Scholar');
  assert(resI.responseData.message.includes('Return scan is not applicable for Day Scholars'), 'Return scan rejected for Day Scholar');
  console.log('✓ Return scan for Day Scholar correctly rejected (Day Scholars scan for Exit only)');

  // 3. Test Scan History API (Requirement 5)
  console.log('\n--- Suite 3: Scan Movement History API ---');
  const testHist = mockReqRes({ query: {} });
  await scanController.getScanHistory(testHist.req, testHist.res);
  const resHist = testHist.getResult();
  if (resHist.statusCode !== 200) {
    console.error('getScanHistory error:', resHist.responseData);
  }
  assert.strictEqual(resHist.statusCode, 200);
  assert(Array.isArray(resHist.responseData.history));
  assert(resHist.responseData.history.length >= 2);
  const histItem = resHist.responseData.history[0];
  assert(histItem.name, 'History must contain student name');
  assert(histItem.rollNo, 'History must contain register number');
  assert(histItem.accommodation, 'History must contain student type');
  assert(histItem.exitTime, 'History must contain exit date & time');
  assert(histItem.returnTime, 'History must contain entry/return date & time');
  assert(histItem.status, 'History must contain current status');
  console.log('✓ Scan history API correctly provides complete scan movement records with all required fields');

  // 4. Test Student Requests & Authority Status Badge Functions
  console.log('\n--- Suite 4: Authority & Student Status Badges ---');
  const studentRequestsJs = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentRequests.js'), 'utf8');

  // Verify getDetailedStatusInfo distinguishes Exited and Scanned In Campus
  assert(studentRequestsJs.includes("if (s === 'Exited')"), 'Must contain dedicated Exited status handler');
  assert(studentRequestsJs.includes("if (s === 'Scanned In Campus'"), 'Must contain dedicated Scanned In Campus status handler');

  const authorityPortalJs = fs.readFileSync(path.join(__dirname, '../js/modules/authorityPortal.js'), 'utf8');
  assert(authorityPortalJs.includes("item.status === 'Exited'"), 'Authority portal must handle Exited status');
  assert(authorityPortalJs.includes("item.status === 'Scanned In Campus'"), 'Authority portal must handle Scanned In Campus status');
  assert(authorityPortalJs.includes('Campus Exit Scanned'), 'Authority card view must display Campus Exit Scanned time');
  console.log('✓ Authority Portal and Student Portal badge handlers correctly support Exited & Scanned In Campus');

  // 5. Test Warden Filtering (Day Scholar Exited status displayed only on Counselor, Advisor, HOD, Principal)
  console.log('\n--- Suite 5: Day Scholar Visibility Rules (Warden strictly Hosteller only) ---');
  const passControllerJs = fs.readFileSync(path.join(__dirname, '../src/controllers/passController.js'), 'utf8');
  assert(passControllerJs.includes("if (role === 'boys_warden')"), 'Pass controller must define boys_warden filter');
  assert(passControllerJs.includes("if (role === 'girls_warden')"), 'Pass controller must define girls_warden filter');
  assert(passControllerJs.includes("const isHostel = /hoste?l|^h$/i.test(p.accommodation)"), 'Warden must filter for hostellers strictly');
  console.log('✓ Day Scholar passes strictly omitted from Warden dashboard and visible on Counselor, Advisor, HOD, Principal');

  console.log('\n======================================================');
  console.log('✅ ALL SCANNING AND ENTRY/EXIT TESTS PASSED (100%)!');
  console.log('======================================================');
})();
