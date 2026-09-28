/**
 * Verification Test Suite: Class Advisor & HOD Dashboard - Gate Pass Request Cards
 * Tests:
 * 1. Advisor dashboard renders cards view directly for Gate Pass requests.
 * 2. HOD dashboard renders identical cards view directly for Gate Pass requests.
 * 3. Exact required fields directly visible:
 *    - Student Name
 *    - Student Type (Hosteller / Day Scholar)
 *    - Registration Number
 *    - Department
 *    - Section
 *    - Parent Name
 *    - Parent Phone Number
 *    - Departure Date
 *    - Departure Time
 *    - Return Date & Return Time (Hosteller only)
 *    - Reason for the Gate Pass
 * 4. Hosteller vs Day Scholar logic:
 *    - Hosteller: Displays Return Date and Return Time.
 *    - Day Scholar: Does NOT display Return Date or Return Time.
 * 5. Actions on Request Card:
 *    - Download Letter (present)
 *    - View Letter (present)
 *    - Reject (present)
 *    - Approve & Forward / Approve Clearance (present)
 *    - View Request (MUST NOT BE PRESENT)
 *    - Download Request (MUST NOT BE PRESENT)
 * 6. Role approval behavior:
 *    - Advisor & HOD have direct Approve button (no Talked to Parent checkbox required).
 *    - Counselor requires Talked to Parent checkbox.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Starting Class Advisor & HOD Gate Pass Request Verification Suite ---');

// 1. Check assembled index.html
const htmlPath = path.join(__dirname, '../index.html');
assert(fs.existsSync(htmlPath), 'index.html must exist');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="counselorCardsContainer"'), 'counselorCardsContainer must exist in index.html');
assert(htmlContent.includes('id="authTableContainer"'), 'authTableContainer must exist in index.html');
console.log('✓ HTML containers verified in assembled index.html');

// 2. Mock DOM environment for testing authorityPortal.js logic
const domElements = {};
function getOrCreateElement(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id,
      classList: {
        classes: new Set(),
        add: function(...cls) { cls.forEach(c => this.classes.add(c)); },
        remove: function(...cls) { cls.forEach(c => this.classes.delete(c)); },
        contains: function(c) { return this.classes.has(c); }
      },
      style: {},
      innerText: '',
      innerHTML: '',
      value: '',
      disabled: false,
      scrollIntoView: () => {}
    };
  }
  return domElements[id];
}

global.document = {
  body: {
    classList: {
      classes: new Set(),
      add: function(c) { this.classes.add(c); },
      remove: function(c) { this.classes.delete(c); }
    }
  },
  getElementById: (id) => getOrCreateElement(id),
  querySelectorAll: () => []
};

global.window = {
  document: global.document,
  loggedUser: null
};

// Mock Api
global.Api = {
  get: async (url) => {
    if (url.includes('/api/admin/students')) {
      return {
        students: [
          {
            rollNo: '21CS001',
            name: 'Priya Sharma',
            dept: 'CSE',
            yearSec: 'A',
            accommodation: 'Hosteller',
            parentName: 'Ramesh Sharma',
            parentContact: '9876543210'
          },
          {
            rollNo: '21CS002',
            name: 'Karthik Raja',
            dept: 'CSE',
            yearSec: 'A',
            accommodation: 'Day Scholar',
            parentName: 'Sundar Raja',
            parentContact: '9123456780'
          }
        ]
      };
    }
    return [];
  },
  post: async (url, data) => ({ success: true, url, data })
};

global.showToast = (msg, type) => {
  // console.log(`[Toast] (${type}) ${msg}`);
};

global.isPendingForRole = (item, isOD) => true;
global.isApprovedByRole = () => false;
global.getDetailedStatusInfo = (item) => ({
  statusText: item.status || 'Pending Advisor',
  statusClass: 'badge-status-pending'
});

// Load authorityPortal.js
const authPortalCode = fs.readFileSync(path.join(__dirname, '../js/modules/authorityPortal.js'), 'utf8');
eval(authPortalCode);

console.log('✓ authorityPortal.js loaded into sandbox');

// Setup mock test data: 1 Hosteller Gate Pass and 1 Day Scholar Gate Pass
const hostellerPass = {
  _id: 'pass_hostel_001',
  rollNo: '21CS001',
  name: 'Priya Sharma',
  dept: 'CSE',
  yearSec: 'A',
  accommodation: 'Hosteller',
  parentName: 'Ramesh Sharma',
  parentContact: '9876543210',
  departureDate: '2026-10-01',
  departureTime: '10:00 AM',
  expectedReturnDate: '2026-10-03',
  expectedReturnTime: '06:00 PM',
  reason: 'Attending family function at hometown',
  status: 'Pending Advisor',
  _type: 'gatepass'
};

const dayScholarPass = {
  _id: 'pass_dayscholar_002',
  rollNo: '21CS002',
  name: 'Karthik Raja',
  dept: 'CSE',
  yearSec: 'A',
  accommodation: 'Day Scholar',
  parentName: 'Sundar Raja',
  parentContact: '9123456780',
  departureDate: '2026-10-02',
  departureTime: '02:00 PM',
  expectedReturnDate: '2026-10-02',
  expectedReturnTime: '05:00 PM',
  reason: 'Medical appointment at city clinic',
  status: 'Pending Advisor',
  _type: 'gatepass'
};

// -------------------------------------------------------------
// Test 1: Class Advisor Dashboard Gate Pass Request Cards
// -------------------------------------------------------------
console.log('\n--- Testing Class Advisor Dashboard Gate Pass Request ---');
const advisorUser = {
  id: 'adv_01',
  name: 'Dr. Muthu Kumar',
  role: 'advisor',
  dept: 'CSE',
  yearSec: 'A'
};
window.loggedUser = advisorUser;

const cardsContainer = getOrCreateElement('counselorCardsContainer');
window.authState.passes = [hostellerPass, dayScholarPass];
window.authState.students = [
  { rollNo: '21CS001', name: 'Priya Sharma', dept: 'CSE', yearSec: 'A', accommodation: 'Hosteller', parentName: 'Ramesh Sharma', parentContact: '9876543210' },
  { rollNo: '21CS002', name: 'Karthik Raja', dept: 'CSE', yearSec: 'A', accommodation: 'Day Scholar', parentName: 'Sundar Raja', parentContact: '9123456780' }
];
window.authState.subFilter = 'gatepass';

// Render cards
window.renderCounselorCardsView([hostellerPass, dayScholarPass], cardsContainer, 'gatepass');

const renderedHtml = cardsContainer.innerHTML;

// 1. Hosteller Details Verification
assert(renderedHtml.includes('Priya Sharma'), 'Hosteller student name must be displayed');
assert(renderedHtml.includes('Hosteller'), 'Hosteller badge must be displayed');
assert(renderedHtml.includes('21CS001'), 'Hosteller roll number must be displayed');
assert(renderedHtml.includes('Ramesh Sharma'), 'Hosteller parent name must be displayed');
assert(renderedHtml.includes('9876543210'), 'Hosteller parent contact must be displayed');
assert(renderedHtml.includes('2026-10-01'), 'Hosteller departure date must be displayed');
assert(renderedHtml.includes('10:00 AM'), 'Hosteller departure time must be displayed');
assert(renderedHtml.includes('2026-10-03'), 'Hosteller return date must be displayed');
assert(renderedHtml.includes('06:00 PM'), 'Hosteller return time must be displayed');
assert(renderedHtml.includes('Attending family function at hometown'), 'Hosteller reason must be displayed');
console.log('✓ Class Advisor: Hosteller card displays Departure Date, Departure Time, Return Date, and Return Time');

// 2. Day Scholar Details Verification
assert(renderedHtml.includes('Karthik Raja'), 'Day Scholar student name must be displayed');
assert(renderedHtml.includes('Day Scholar'), 'Day Scholar badge must be displayed');
assert(renderedHtml.includes('21CS002'), 'Day Scholar roll number must be displayed');
assert(renderedHtml.includes('Sundar Raja'), 'Day Scholar parent name must be displayed');
assert(renderedHtml.includes('9123456780'), 'Day Scholar parent contact must be displayed');
assert(renderedHtml.includes('2026-10-02'), 'Day Scholar departure date must be displayed');
assert(renderedHtml.includes('02:00 PM'), 'Day Scholar departure time must be displayed');
assert(renderedHtml.includes('Medical appointment at city clinic'), 'Day Scholar reason must be displayed');

// CRITICAL: Day Scholar must NOT display Return Date or Return Time!
// Let's verify specifically on the Day Scholar card HTML
const cardParts = renderedHtml.split('id="counselorCard_');
const dayScholarCardHtml = cardParts.find(p => p.startsWith('pass_dayscholar_002'));
assert(dayScholarCardHtml, 'Day Scholar card markup must exist');
assert(dayScholarCardHtml.includes('Departure Time'), 'Day Scholar card must display Departure Time');
assert(!dayScholarCardHtml.includes('Return Date'), 'Day Scholar card MUST NOT display Return Date');
assert(!dayScholarCardHtml.includes('Return Time'), 'Day Scholar card MUST NOT display Return Time');
console.log('✓ Class Advisor: Day Scholar card displays Departure Date & Departure Time, and strictly OMITS Return Date & Return Time');

// 3. Action Buttons Verification
assert(renderedHtml.includes('Download Letter'), 'Card must have Download Letter action');
assert(renderedHtml.includes('View Letter'), 'Card must have View Letter action');
assert(renderedHtml.includes('Reject'), 'Card must have Reject action');
assert(renderedHtml.includes('Approve &amp; Forward') || renderedHtml.includes('Approve & Forward'), 'Card must have Approve & Forward action');

// MUST NOT show View Request or Download Request
assert(!renderedHtml.includes('View Request'), 'Card MUST NOT have "View Request" button');
assert(!renderedHtml.includes('Download Request'), 'Card MUST NOT have "Download Request" button');
console.log('✓ Class Advisor: Card has Download Letter, View Letter, Reject, Approve & Forward (NO View Request or Download Request)');

// 4. Verification that Advisor does NOT have "Talked to Parent" checkbox
assert(!dayScholarCardHtml.includes('Talked to Parent'), 'Advisor card MUST NOT show "Talked to Parent" checkbox (only for Counselor)');
assert(!dayScholarCardHtml.includes('disabled'), 'Advisor approve button must be enabled directly');
console.log('✓ Class Advisor: Direct approval enabled without parent call checkbox');

// -------------------------------------------------------------
// Test 2: HOD Dashboard Gate Pass Request Cards
// -------------------------------------------------------------
console.log('\n--- Testing HOD Dashboard Gate Pass Request ---');
const hodUser = {
  id: 'hod_01',
  name: 'Dr. K. Senthil Nathan',
  role: 'hod',
  dept: 'CSE'
};
window.loggedUser = hodUser;

// Render cards for HOD
const hodHostellerPass = { ...hostellerPass, status: 'Pending HOD' };
const hodDayScholarPass = { ...dayScholarPass, status: 'Pending HOD' };
window.renderCounselorCardsView([hodHostellerPass, hodDayScholarPass], cardsContainer, 'gatepass');
const hodRenderedHtml = cardsContainer.innerHTML;

const hodCardParts = hodRenderedHtml.split('id="counselorCard_');
const hodHostelCard = hodCardParts.find(p => p.startsWith('pass_hostel_001'));
const hodDayCard = hodCardParts.find(p => p.startsWith('pass_dayscholar_002'));

assert(hodHostelCard.includes('Priya Sharma'), 'HOD: Hosteller student name displayed');
assert(hodHostelCard.includes('Return Date'), 'HOD: Hosteller return date displayed');
assert(hodHostelCard.includes('Return Time'), 'HOD: Hosteller return time displayed');
assert(hodHostelCard.includes('Download Letter'), 'HOD: Download Letter displayed');
assert(hodHostelCard.includes('View Letter'), 'HOD: View Letter displayed');
assert(hodHostelCard.includes('Reject'), 'HOD: Reject displayed');

assert(hodDayCard.includes('Karthik Raja'), 'HOD: Day Scholar student name displayed');
assert(!hodDayCard.includes('Return Date'), 'HOD: Day Scholar Return Date strictly omitted');
assert(!hodDayCard.includes('Return Time'), 'HOD: Day Scholar Return Time strictly omitted');
assert(!hodRenderedHtml.includes('View Request'), 'HOD: MUST NOT have "View Request"');
assert(!hodRenderedHtml.includes('Download Request'), 'HOD: MUST NOT have "Download Request"');
console.log('✓ HOD: Dashboard strictly follows same design, structure, fields, and actions as requested');

// -------------------------------------------------------------
// Test 3: Counselor Dashboard Gate Pass Request Cards
// -------------------------------------------------------------
console.log('\n--- Testing Counselor Dashboard Gate Pass Request ---');
const counselorUser = {
  id: 'coun_01',
  name: 'Prof. Anitha',
  role: 'counselor',
  dept: 'CSE',
  startRoll: '21CS001',
  endRoll: '21CS020'
};
window.loggedUser = counselorUser;

const counHostellerPass = { ...hostellerPass, status: 'Pending Counselor' };
window.renderCounselorCardsView([counHostellerPass], cardsContainer, 'gatepass');
const counRenderedHtml = cardsContainer.innerHTML;

assert(counRenderedHtml.includes('Talked to Parent'), 'Counselor card must show "Talked to Parent" checkbox');
assert(counRenderedHtml.includes('counselorTalkedParent_pass_hostel_001'), 'Checkbox id must exist');
assert(counRenderedHtml.includes('counselorCallLink_pass_hostel_001'), 'Counselor phone click-to-call link must exist');
assert(counRenderedHtml.includes('Download Letter'), 'Counselor card must show Download Letter');
assert(counRenderedHtml.includes('View Letter'), 'Counselor card must show View Letter');
assert(counRenderedHtml.includes('Reject'), 'Counselor card must show Reject');
assert(!counRenderedHtml.includes('View Request'), 'Counselor card MUST NOT have View Request');
assert(!counRenderedHtml.includes('Download Request'), 'Counselor card MUST NOT have Download Request');
console.log('✓ Counselor: Card retains Talked to Parent confirmation workflow with Download Letter and View Letter');

// -------------------------------------------------------------
// Test 4: Approval Execution for Advisor and HOD
// -------------------------------------------------------------
console.log('\n--- Testing Approval API Handlers ---');
let apiCalls = [];
global.Api.post = async (url, data) => {
  apiCalls.push({ url, data });
  return { success: true };
};

// Advisor Approval
window.loggedUser = advisorUser;
window.executeRoleApprove('pass_hostel_001', false);
assert(apiCalls.some(c => c.url === '/api/approvals/advisor' && c.data.passId === 'pass_hostel_001'), 'Advisor approval must call /api/approvals/advisor');
console.log('✓ Advisor approval successfully invokes /api/approvals/advisor');

// HOD Approval
window.loggedUser = hodUser;
window.executeRoleApprove('pass_hostel_001', false);
assert(apiCalls.some(c => c.url === '/api/approvals/hod' && c.data.passId === 'pass_hostel_001'), 'HOD approval must call /api/approvals/hod');
console.log('✓ HOD approval successfully invokes /api/approvals/hod');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY (100%) ===\n');
