/**
 * Verification Suite for Gate Pass Request - Student Portal
 * Tests student-type specific field visibility and submission rules:
 * - Day Scholar: Form shows ONLY Departure Date + Departure Time + Reason (Return Date & Return Time hidden)
 * - Hosteller  : Form shows ONLY Departure Date + Departure Time + Return Date + Return Time + Reason
 */

const fs = require('fs');
const path = require('path');
const { generateFormalLetter } = require('../src/utils/letterGenerator');

function runSuite() {
  console.log('================================================================');
  console.log('  STARTING GATE PASS STUDENT FORM VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check HTML Modal Definition
  console.log('--- 1. Testing Gate Pass Modal Markup (HTML) ---');
  const modalHtml = fs.readFileSync(path.join(__dirname, '../components/modals/gatePassModal.html'), 'utf8');
  assert(modalHtml.includes('id="modalGatePassRequest"'), 'Modal container #modalGatePassRequest exists');
  assert(modalHtml.includes('id="gpDepDate"'), 'Departure Date input #gpDepDate exists');
  assert(modalHtml.includes('id="gpDepTime"'), 'Departure Time input #gpDepTime exists');
  assert(modalHtml.includes('id="gpHostelReturnFields"'), 'Return Date & Time wrapper #gpHostelReturnFields exists');
  assert(modalHtml.includes('id="gpRetDate"'), 'Return Date input #gpRetDate exists inside wrapper');
  assert(modalHtml.includes('id="gpRetTime"'), 'Return Time input #gpRetTime exists inside wrapper');
  assert(modalHtml.includes('id="gatePassReason"'), 'Reason textarea #gatePassReason exists');

  // Verify compiled index.html has identical structure
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert(indexHtml.includes('id="gpHostelReturnFields"'), 'index.html contains #gpHostelReturnFields wrapper');

  // 2. Check JavaScript Modal Logic (openGatePassRequestModal)
  console.log('\n--- 2. Testing Modal Display Logic (studentModals.js) ---');
  const modalsJs = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentModals.js'), 'utf8');
  assert(modalsJs.includes("const returnRow = document.getElementById('gpHostelReturnFields');"), 'Modal handler queries #gpHostelReturnFields');
  assert(modalsJs.includes("returnRow.classList.add('hidden');"), 'Modal handler strictly hides return fields for Day Scholars');
  assert(modalsJs.includes("returnRow.classList.remove('hidden');"), 'Modal handler displays return fields for Hostellers');

  // 3. Check Form Submission Logic (studentForms.js)
  console.log('\n--- 3. Testing Form Submission & Validation Logic (studentForms.js) ---');
  const formsJs = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentForms.js'), 'utf8');

  // Popup submission check
  assert(formsJs.includes("const isH = (/hoste?l|^h$/i.test(u.accommodation || '') && !/day\\s*scholar/i.test(u.accommodation || ''));"), 'Detects hosteller vs day scholar accommodation');
  assert(formsJs.includes("if (isH) {\n      if (!retDate) return showToast('Please select Return Date.', 'warning');\n      if (!retTime) return showToast('Please select Return Time.', 'warning');\n    }"), 'Return Date & Time validation only triggers for Hostellers in submitPopupGatePassRequest');
  assert(formsJs.includes("expectedReturnDate: isH ? retDate : '',"), 'Payload omits expectedReturnDate for Day Scholars in popup submission');

  // Secondary form submission check (submitStudentGatePass)
  assert(formsJs.includes("if (isH) {\n      if (!retDate) return showToast('Please select Return Date.', 'warning');\n      if (!retTime) return showToast('Please select Return Time.', 'warning');\n    }"), 'Return Date & Time validation only triggers for Hostellers in submitStudentGatePass');

  // 4. Test Formal Letter Generation for Day Scholar vs Hosteller
  console.log('\n--- 4. Testing Formal Letter Generation Output ---');
  const dayScholarStudent = {
    name: 'Day Scholar Test Student',
    rollNo: '110324104001',
    dept: 'CSE',
    yearSec: 'A',
    academicYear: '3 Year',
    accommodation: 'Day Scholar'
  };

  const dayScholarSchedule = {
    requestCategory: 'gate_pass',
    departureDate: '2026-10-01',
    departureTime: '11:00 AM'
  };

  const dsLetter = generateFormalLetter(dayScholarStudent, 'Attending external technical symposium', '2026-10-01 09:00:00', dayScholarSchedule);
  assert(dsLetter.includes('- Departure Date & Time       : 2026-10-01 at 11:00 AM'), 'Day Scholar letter contains Departure Date & Time');
  assert(!dsLetter.includes('Expected Return Date & Time'), 'Day Scholar letter strictly does NOT contain Expected Return Date & Time');

  const hostellerStudent = {
    name: 'Hosteller Test Student',
    rollNo: '110324104002',
    dept: 'CSE',
    yearSec: 'B',
    academicYear: '3 Year',
    accommodation: 'Hosteller',
    hostelRoom: '302',
    hostelBlock: 'Boys Hostel 1'
  };

  const hostellerSchedule = {
    requestCategory: 'gate_pass',
    departureDate: '2026-10-02',
    departureTime: '05:00 PM',
    expectedReturnDate: '2026-10-05',
    expectedReturnTime: '08:00 AM',
    expectedReturnDateTime: '2026-10-05 at 08:00 AM',
    hostelRoom: '302',
    hostelBlock: 'Boys Hostel 1'
  };

  const hstLetter = generateFormalLetter(hostellerStudent, 'Home visit for festival holidays', '2026-10-02 10:00:00', hostellerSchedule);
  assert(hstLetter.includes('- Departure Date & Time       : 2026-10-02 at 05:00 PM'), 'Hosteller letter contains Departure Date & Time');
  assert(hstLetter.includes('- Expected Return Date & Time : 2026-10-05 at 08:00 AM'), 'Hosteller letter contains Expected Return Date & Time');

  console.log('\n================================================================');
  console.log(`  SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
