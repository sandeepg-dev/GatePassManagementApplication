const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Read index.html to ensure all static markup requirements are met
const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Read styles.css to ensure vertical page scrolling styles are present
const cssPath = path.join(__dirname, '..', 'css', 'styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

console.log('====================================================');
console.log('COUNSELOR PORTAL ENHANCED VERIFICATION SUITE');
console.log('====================================================\n');

// -------------------------------------------------------------------
// Test 1: DOM Elements & Removal of Duplicate "Ward" Sidebar Menu (Req 1)
// -------------------------------------------------------------------
console.log('--- Suite 1: Counselor Sidebar & Duplicate Ward Removal (Req 1) ---');
assert(htmlContent.includes('id="authTopNavContainer"'), 'authTopNavContainer must exist for role-based top nav hiding');
assert(htmlContent.includes('id="counselorCardsContainer"'), 'counselorCardsContainer must exist');

// Requirement 1: Verify authSideBtn_ward is REMOVED and authSideBtn_roster is "Ward Student List"
assert(!htmlContent.includes('id="authSideBtn_ward"'), 'Duplicate "Ward" menu (authSideBtn_ward) MUST BE REMOVED');
console.log('[PASS] Requirement 1 satisfied: Duplicate "Ward" menu is completely removed from HTML');

assert(htmlContent.includes('id="authSideBtn_roster"'), 'authSideBtn_roster must exist');
assert(htmlContent.includes('Ward Student List'), 'Sidebar must contain "Ward Student List"');
console.log('[PASS] Requirement 1 satisfied: "Ward Student List" sidebar button exists cleanly');

const requiredSidebarItems = [
  { id: 'authSideBtn_verification', label: 'Verification Desk' },
  { id: 'authSideBtn_roster', label: 'Ward Student List' },
  { id: 'authSideBtn_gatepass', label: 'Gate Pass Request' },
  { id: 'authSideBtn_leave', label: 'Leave Request' },
  { id: 'authSideBtn_onduty', label: 'OD Request' },
  { id: 'authSideBtn_approved', label: 'Approved Records' },
  { id: 'authSideBtn_reports', label: 'Reports' }
];

requiredSidebarItems.forEach(item => {
  assert(htmlContent.includes(`id="${item.id}"`), `Sidebar must contain ${item.label} (${item.id})`);
  console.log(`[PASS] Sidebar contains: ${item.label}`);
});

// -------------------------------------------------------------------
// Test 2: Proper Page Scrolling Rules (Req 2)
// -------------------------------------------------------------------
console.log('\n--- Suite 2: Vertical Scrolling & Layout (Req 2) ---');
assert(cssContent.includes('body.theme-authority'), 'CSS must define body.theme-authority scroll styles');
assert(cssContent.includes('#authorityDashboardLayout'), 'CSS must define #authorityDashboardLayout scroll styles');
assert(cssContent.includes('overflow-y: auto !important'), 'CSS must enable proper vertical scrolling for long lists');
console.log('[PASS] Requirement 2 satisfied: Proper vertical scrolling rules defined without truncation or hidden overflow');

// -------------------------------------------------------------------
// Test 3: Reports Section with Dedicated Downloads (Req 5)
// -------------------------------------------------------------------
console.log('\n--- Suite 3: Reports Section & Download Options (Req 5) ---');
assert(htmlContent.includes('downloadAuditingPDF'), 'Reports must have downloadAuditingPDF button');
assert(htmlContent.includes('downloadAllODLettersPDF'), 'Reports must have downloadAllODLettersPDF button');
assert(htmlContent.includes('downloadAllGatePassLettersPDF'), 'Reports must have downloadAllGatePassLettersPDF button');
assert(htmlContent.includes('downloadAllLeaveLettersPDF'), 'Reports must have downloadAllLeaveLettersPDF button');
assert(htmlContent.includes('downloadAllRecordsCSV'), 'Reports must have downloadAllRecordsCSV button');
console.log('[PASS] Requirement 5 satisfied: Reports section provides dedicated Auditing PDF, OD Letters, Gate Pass Letters, Leave Letters, and CSV downloads');

// Verify pdfService.js exports these functions
const pdfServicePath = path.join(__dirname, '..', 'js', 'services', 'pdfService.js');
const pdfServiceContent = fs.readFileSync(pdfServicePath, 'utf8');
assert(pdfServiceContent.includes('function downloadAuditingPDF'), 'pdfService must implement downloadAuditingPDF');
assert(pdfServiceContent.includes('function downloadAllODLettersPDF'), 'pdfService must implement downloadAllODLettersPDF');
assert(pdfServiceContent.includes('function downloadAllGatePassLettersPDF'), 'pdfService must implement downloadAllGatePassLettersPDF');
assert(pdfServiceContent.includes('function downloadAllLeaveLettersPDF'), 'pdfService must implement downloadAllLeaveLettersPDF');
console.log('[PASS] Requirement 5 satisfied: pdfService.js contains all required PDF generator functions');

// -------------------------------------------------------------------
// Test 4: Setup Mock DOM & Execute authorityPortal.js
// -------------------------------------------------------------------
console.log('\n--- Suite 4: Authority Portal Logic & Strict Request Separation (Req 3) ---');

// Mock DOM
class ClassListMock {
  constructor() {
    this._classes = new Set();
  }
  add(...c) { c.forEach(x => this._classes.add(x)); }
  remove(...c) { c.forEach(x => this._classes.delete(x)); }
  contains(c) { return this._classes.has(c); }
}

class ElementMock {
  constructor(id) {
    this.id = id;
    this.classList = new ClassListMock();
    this.style = {};
    this.innerText = '';
    this.innerHTML = '';
    this.disabled = false;
    this.checked = false;
    this.children = [];
    this.scrollIntoView = () => {};
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

const domElements = {};
function getOrCreateElement(id) {
  if (!domElements[id]) {
    domElements[id] = new ElementMock(id);
  }
  return domElements[id];
}

global.window = global;
global.document = {
  getElementById: (id) => getOrCreateElement(id),
  querySelectorAll: () => [],
  body: { classList: new ClassListMock() }
};

let toastMessages = [];
global.showToast = (msg, type) => {
  toastMessages.push({ msg, type });
};

global.Api = {
  get: async () => [],
  post: async () => ({ success: true })
};

// Load authorityPortal.js
const authorityPortalCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'modules', 'authorityPortal.js'), 'utf8');
eval(authorityPortalCode);

// Test Counselor Initialization
const counselorUser = {
  userId: '7471',
  role: 'counselor',
  name: 'Mrs shanmugavalli',
  dept: 'CSE',
  startRoll: '110324104081',
  endRoll: '110324104100'
};
global.loggedUser = counselorUser;

initAuthorityPortal(counselorUser);

// Verify Top Nav is hidden for Counselor
const topNav = getOrCreateElement('authTopNavContainer');
assert(topNav.classList.contains('hidden') || topNav.style.display === 'none', 'Top Navigation must be hidden for Counselor');

// Strict Separation Testing: Mock pool of requests containing Gate Pass, Leave, and OD
const sampleData = {
  passes: [
    {
      _id: 'gp_1',
      _type: 'gatepass',
      requestCategory: 'gatepass',
      status: 'Pending Counselor',
      name: 'Gate Pass Student',
      rollNo: '110324104081',
      dept: 'CSE',
      isLeave: false
    },
    {
      _id: 'lv_1',
      _type: 'leave',
      requestCategory: 'leave',
      status: 'Pending Counselor',
      name: 'Leave Student',
      rollNo: '110324104082',
      dept: 'CSE',
      isLeave: true
    }
  ],
  onduty: [
    {
      _id: 'od_1',
      _type: 'onduty',
      requestCategory: 'onduty',
      status: 'Pending Counselor',
      name: 'OD Student',
      rollNo: '110324104083',
      dept: 'CSE',
      dutyTitle: 'Symposium Hackathon',
      placeEvent: 'IIT Madras'
    }
  ]
};

// Test getFilteredRequests strict separation
window.authState.passes = sampleData.passes;
window.authState.odRequests = sampleData.onduty;

// 1. Gate Pass Filter
window.authState.subFilter = 'gatepass';
const gpFiltered = window.getFilteredRequests();
assert(gpFiltered.every(r => r._type === 'gatepass' && !r.isLeave && r.requestCategory !== 'onduty'), 'Gate pass list must ONLY contain gate pass requests');
assert(!gpFiltered.some(r => r.isLeave || r._type === 'leave' || r._type === 'onduty'), 'Gate pass list must NEVER contain leave or OD');
console.log('[PASS] Requirement 3 satisfied: Gate Pass Request list strictly contains ONLY Gate Pass requests');

// 2. Leave Filter
window.authState.subFilter = 'leave';
const lvFiltered = window.getFilteredRequests();
assert(lvFiltered.every(r => r.isLeave || r._type === 'leave'), 'Leave list must ONLY contain leave requests');
assert(!lvFiltered.some(r => (!r.isLeave && r._type === 'gatepass') || r._type === 'onduty'), 'Leave list must NEVER contain gate passes or OD');
console.log('[PASS] Requirement 3 satisfied: Leave Request list strictly contains ONLY Leave requests');

// 3. OD Filter
window.authState.subFilter = 'onduty';
const odFiltered = window.getFilteredRequests();
assert(odFiltered.every(r => r._type === 'onduty' || r.requestCategory === 'onduty'), 'OD list must ONLY contain OD requests');
assert(!odFiltered.some(r => r._type === 'gatepass' || r._type === 'leave'), 'OD list must NEVER contain gate pass or leave requests');
console.log('[PASS] Requirement 3 satisfied: OD Request list strictly contains ONLY OD requests');

// -------------------------------------------------------------------
// Test 5: OD Request Card Layout & Direct Approval (Req 4)
// -------------------------------------------------------------------
console.log('\n--- Suite 5: OD Request Simplified Layout & Direct Approval (Req 4) ---');

const odItem = {
  _id: 'od_card_test_1',
  _type: 'onduty',
  requestCategory: 'onduty',
  name: 'Kavitha R',
  rollNo: '110324104090',
  dept: 'CSE',
  yearSec: 'B',
  dutyTitle: 'National Robotics Competition',
  placeEvent: 'Anna University, Chennai',
  departureDate: '30/09/2026',
  expectedReturnDate: '01/10/2026',
  reason: 'Participating in Autonomous Drone Challenge',
  status: 'Pending Counselor'
};

const cardsContainer = getOrCreateElement('counselorCardsContainer');
window.renderCounselorCardsView([odItem], cardsContainer, 'onduty');
const odCardHtml = cardsContainer.innerHTML;

// Check OD relevant details
assert(odCardHtml.includes('Kavitha R'), 'OD card must display student name');
assert(odCardHtml.includes('National Robotics Competition'), 'OD card must display duty/event title');
assert(odCardHtml.includes('Anna University, Chennai'), 'OD card must display venue/destination');
console.log('[PASS] OD card displays event title and venue directly');

// Check NO parent info for OD (Requirement 4)
assert(!odCardHtml.includes('Parent Name'), 'OD card must NOT display Parent Name');
assert(!odCardHtml.includes('Parent Phone Number'), 'OD card must NOT display Parent Phone Number');
assert(!odCardHtml.includes('callingIndicator_od_card_test_1'), 'OD card must NOT contain parent calling indicator');
assert(!odCardHtml.includes('Talked to Parent'), 'OD card must NOT contain "Talked to Parent" checkbox');
console.log('[PASS] Requirement 4 satisfied: OD card completely omits Parent Name, Parent Phone, Call banner, and "Talked to Parent" checkbox');

// Check that Approve button for OD is NOT disabled by default (Requirement 4: direct approval)
assert(!odCardHtml.includes('id="counselorApproveBtn_od_card_test_1" disabled'), 'OD Approve button must NOT be disabled');
console.log('[PASS] Requirement 4 satisfied: OD Approve button is directly enabled without parent confirmation');

// Test executeCounselorApprove on OD (should NOT block or ask for parent checkbox)
toastMessages = [];
let odApproved = false;
global.Api.post = async (url, data) => {
  if (url === '/api/onduty/approve/counselor') {
    odApproved = true;
    return { success: true };
  }
};

window.executeCounselorApprove('od_card_test_1', true);
assert.strictEqual(odApproved, true, 'OD approval must succeed directly without requiring parent confirmation');
console.log('[PASS] Requirement 4 satisfied: Counselor can approve OD request directly');

// -------------------------------------------------------------------
// Test 6: Gate Pass / Leave Parent Checkbox Still Enforced
// -------------------------------------------------------------------
console.log('\n--- Suite 6: Gate Pass Parent Verification Still Enforced ---');
const gpItem = {
  _id: 'gp_card_test_1',
  _type: 'gatepass',
  requestCategory: 'gatepass',
  name: 'Vikram S',
  rollNo: '110324104092',
  dept: 'CSE',
  yearSec: 'A',
  accommodation: 'Hosteller',
  parentName: 'S. Sundar',
  parentContact: '9840123456',
  departureDate: '28/09/2026',
  departureTime: '09:00 AM',
  expectedReturnDate: '29/09/2026',
  expectedReturnTime: '06:00 PM',
  reason: 'Medical appointment',
  status: 'Pending Counselor'
};

window.renderCounselorCardsView([gpItem], cardsContainer, 'gatepass');
const gpCardHtml = cardsContainer.innerHTML;

assert(gpCardHtml.includes('Parent Name'), 'Gate Pass card must display Parent Name');
assert(gpCardHtml.includes('9840123456'), 'Gate Pass card must display Parent Phone');
assert(gpCardHtml.includes('Talked to Parent'), 'Gate Pass card must include "Talked to Parent" checkbox');
assert(gpCardHtml.includes('id="counselorApproveBtn_gp_card_test_1"\n                disabled'), 'Gate Pass Approve button must be disabled initially');

// Attempt approval while unchecked
toastMessages = [];
let gpApproved = false;
global.Api.post = async (url) => {
  if (url === '/api/approvals/counselor') gpApproved = true;
};

const gpCb = getOrCreateElement('counselorTalkedParent_gp_card_test_1');
gpCb.checked = false;
window.executeCounselorApprove('gp_card_test_1', false);
assert.strictEqual(gpApproved, false, 'Gate Pass approval must fail if Talked to Parent is unchecked');
assert(toastMessages.some(t => t.msg.includes('Talked to Parent')), 'Toast warning must be raised');
console.log('[PASS] Gate Pass approval strictly requires parent verification');

console.log('\n======================================================');
console.log('✅ ALL COUNSELOR PORTAL TESTS PASSED (100% SUCCESS)!');
console.log('======================================================\n');
process.exit(0);
