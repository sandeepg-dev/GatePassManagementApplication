/**
 * Test Suite for Campus PassPro Authority Portal Redesign
 * Validates role-specific dashboards, dynamic welcome name, lack of mock data,
 * workflow actions, and exclusion of forbidden elements.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify HTML DOM Structure in index.html
console.log('\n--- 1. VERIFYING INDEX.HTML AUTHORITY PORTAL DOM ---');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Required Elements
const requiredIds = [
  'authorityDashboardLayout',
  'authAvatarInitials',
  'authProfileName',
  'authProfileRole',
  'authBellBadge',
  'authTopNav_dashboard',
  'authTopNav_pass',
  'authTopNav_leave',
  'authTopNav_onduty',
  'authTopNav_roster',
  'authTopNav_reports',
  'authSidebarRoleTitle',
  'authSidebarJurisdictionBadge',
  'authSidebarRosterLabel',
  'authSideBtn_verification',
  'authSideBtn_roster',
  'authSideBtn_gatepass',
  'authSideBtn_leave',
  'authSideBtn_onduty',
  'authSideBtn_approved',
  'authSideBtn_reports',
  'authWelcomeHeading',
  'authWelcomeSubtitle',
  'authWelcomeBadge',
  'authSection_requests',
  'authTabBtn_gatepass',
  'authTabBtn_leave',
  'authTabBtn_onduty',
  'authTabBtn_all',
  'authCountBadge_gatepass',
  'authCountBadge_leave',
  'authCountBadge_onduty',
  'authCountBadge_all',
  'authSearchInput',
  'authTableHeadingTitle',
  'authTableHeadingSubtitle',
  'authRequestsTableBody',
  'authTablePaginationInfo',
  'authSection_roster',
  'authRosterTableBody',
  'authRosterTotalCount',
  'authSection_reports',
  'authDetailModal',
  'authModalStudentName',
  'authModalRollNo',
  'authModalClass',
  'authModalAccom',
  'authModalParentName',
  'authModalParentPhone',
  'authModalDates',
  'authModalReason',
  'authModalViewLetterBtn',
  'authModalActionButtons'
];

requiredIds.forEach(id => {
  assert(indexHtml.includes(`id="${id}"`), `Missing required element ID: ${id}`);
});
console.log(`✓ All ${requiredIds.length} required Authority Portal DOM IDs verified in index.html.`);

// Forbidden Elements in Main Dashboard Area
const forbiddenSnippets = [
  'Verification Workflow',
  'Parent Verification',
  'Document Check',
  'Review & Confirm',
  'Add Leave Request',
  'Education Empowers',
  'Welcome Student'
];

// Check inside authorityDashboardLayout
const authLayoutStart = indexHtml.indexOf('id="authorityDashboardLayout"');
const authLayoutEnd = indexHtml.indexOf('<!-- AUTHORITY REQUEST DETAIL & DECISION MODAL -->');
const authLayoutContent = indexHtml.slice(authLayoutStart, authLayoutEnd);

forbiddenSnippets.forEach(snip => {
  assert(!authLayoutContent.includes(snip), `Forbidden snippet found in authority layout: "${snip}"`);
});
console.log('✓ All forbidden elements (Verification Workflow, Parent Verification, Document Check, Add Leave Request, etc.) correctly absent from Authority Portal layout.');

// 2. Test Dynamic Role Dashboard Logic with JSDOM-like Mock
console.log('\n--- 2. VERIFYING DYNAMIC AUTHORITY PORTAL LOGIC ---');

class MockElement {
  constructor(id) {
    this.id = id;
    this.classList = {
      classes: new Set(),
      add: (...c) => c.forEach(x => this.classList.classes.add(x)),
      remove: (...c) => c.forEach(x => this.classList.classes.delete(x)),
      contains: (x) => this.classList.classes.has(x)
    };
    this.children = [];
    this.innerText = '';
    this._innerHTML = '';
    this.value = '';
    this.style = {};
  }
  set innerHTML(v) { this._innerHTML = v; }
  get innerHTML() { return this._innerHTML; }
  setAttribute() {}
  getAttribute() { return ''; }
}

const mockDom = {};
function getMockEl(id) {
  if (!mockDom[id]) mockDom[id] = new MockElement(id);
  return mockDom[id];
}

global.window = global;
global.document = {
  getElementById: getMockEl,
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: new MockElement('body')
};
global.sessionStorage = { setItem: () => {}, getItem: () => null, removeItem: () => {}, clear: () => {} };
global.localStorage = { setItem: () => {}, getItem: () => null, removeItem: () => {}, clear: () => {} };
global.Api = {
  get: async () => [],
  post: async () => ({ success: true })
};
global.escapeHtml = (s) => String(s || '');
global.escapeAttr = (s) => String(s || '');
global.showToast = () => {};

// Load authorityPortal.js
const authPortalCode = fs.readFileSync('js/modules/authorityPortal.js', 'utf8');
eval(authPortalCode);

// Load dashboard.js
const dashCode = fs.readFileSync('js/dashboard.js', 'utf8');
eval(dashCode);

// Test A: Counselor Login with name "Shanmugam"
console.log('\nTesting Counselor: Shanmugam (Ward: 110324104001 - 110324104030)');
const counselorShanmugam = {
  userId: 'c_shan',
  name: 'Shanmugam',
  role: 'counselor',
  startRoll: '110324104001',
  endRoll: '110324104030'
};
openDashboard(counselorShanmugam);
assert.strictEqual(getMockEl('authWelcomeHeading').innerText, 'Welcome, Shanmugam', 'Counselor welcome heading must be "Welcome, Shanmugam"');
assert.strictEqual(getMockEl('authProfileName').innerText, 'Shanmugam', 'Profile name must be Shanmugam');
assert.strictEqual(getMockEl('authProfileRole').innerText, 'Class Counselor', 'Profile role must be Class Counselor');
assert(getMockEl('authSidebarJurisdictionBadge').innerText.includes('110324104001'), 'Sidebar jurisdiction must show ward start');
console.log('✓ Counselor Shanmugam correctly initialized with dynamic name and ward jurisdiction.');

// Test B: Different Counselor Login with name "Mrs shanmugavalli"
console.log('\nTesting Counselor: Mrs shanmugavalli (Ward: 110324104081 - 110324104100)');
const counselorShanmuga = {
  userId: '7471',
  name: 'Mrs shanmugavalli',
  role: 'counselor',
  startRoll: '110324104081',
  endRoll: '110324104100'
};
openDashboard(counselorShanmuga);
assert.strictEqual(getMockEl('authWelcomeHeading').innerText, 'Welcome, Mrs shanmugavalli', 'Welcome heading must update dynamically to Mrs shanmugavalli');
assert(getMockEl('authSidebarJurisdictionBadge').innerText.includes('110324104081'), 'Sidebar jurisdiction must reflect new ward');
console.log('✓ Dynamic name update confirmed for Mrs shanmugavalli without hardcoding.');

// Test C: Class Advisor Login
console.log('\nTesting Class Advisor: shanmugavalli (CSE - Sec B)');
const advisorUser = {
  userId: '7472',
  name: 'shanmugavalli',
  role: 'advisor',
  dept: 'CSE',
  yearSec: 'B',
  academicYear: '3 Year'
};
openDashboard(advisorUser);
assert.strictEqual(getMockEl('authWelcomeHeading').innerText, 'Welcome, shanmugavalli');
assert.strictEqual(getMockEl('authProfileRole').innerText, 'Class Advisor');
assert(getMockEl('authSidebarJurisdictionBadge').innerText.includes('Sec B'), 'Advisor jurisdiction must show Sec B');
assert.strictEqual(getMockEl('authSidebarRosterLabel').innerText, 'Class Student List', 'Advisor roster label must be Class Student List');
console.log('✓ Class Advisor correctly customized with class jurisdiction.');

// Test D: HOD Login
console.log('\nTesting HOD: Dr kamal (CSE)');
const hodUser = {
  userId: '7247',
  name: 'Dr kamal',
  role: 'hod',
  dept: 'CSE'
};
openDashboard(hodUser);
assert.strictEqual(getMockEl('authWelcomeHeading').innerText, 'Welcome, Dr kamal');
assert.strictEqual(getMockEl('authProfileRole').innerText, 'Head of Department');
assert(getMockEl('authSidebarJurisdictionBadge').innerText.includes('Department of CSE'), 'HOD jurisdiction must show Department of CSE');
assert.strictEqual(getMockEl('authSidebarRosterLabel').innerText, 'Department Student Roster', 'HOD roster label must be Department Student Roster');
console.log('✓ Head of Department correctly initialized with department clearance context.');

// Test E: Principal Login
console.log('\nTesting Principal: Dr Arumugam (Directorate)');
const principalUser = {
  userId: 'grt@head',
  name: 'Dr Arumugam',
  role: 'principal'
};
openDashboard(principalUser);
assert.strictEqual(getMockEl('authWelcomeHeading').innerText, 'Welcome, Dr Arumugam');
assert.strictEqual(getMockEl('authProfileRole').innerText, 'Principal Directorate');
assert.strictEqual(getMockEl('authSidebarRosterLabel').innerText, 'Institutional Directory');
console.log('✓ Principal Directorate correctly customized.');

// Test F: Warden Login
console.log('\nTesting Boys Warden: Mr Arul Prasad');
const wardenUser = {
  userId: '6661',
  name: 'Mr Arul Prasad',
  role: 'boys_warden'
};
openDashboard(wardenUser);
assert.strictEqual(getMockEl('authWelcomeHeading').innerText, 'Welcome, Mr Arul Prasad');
assert.strictEqual(getMockEl('authProfileRole').innerText, 'Boys Hostel Warden');
assert.strictEqual(getMockEl('authSidebarRosterLabel').innerText, 'Hostel Resident Roster');
console.log('✓ Hostel Warden correctly customized.');

// Test G: Verify Tab Switching
console.log('\nTesting Tab Switching...');
switchAuthorityMainTab('roster');
assert.strictEqual(authState.activeTab, 'roster');
assert(!getMockEl('authSection_roster').classList.contains('hidden'));
assert(getMockEl('authSection_requests').classList.contains('hidden'));

switchAuthorityMainTab('reports');
assert.strictEqual(authState.activeTab, 'reports');
assert(!getMockEl('authSection_reports').classList.contains('hidden'));

switchAuthorityMainTab('verification');
assert.strictEqual(authState.activeTab, 'verification');
assert(!getMockEl('authSection_requests').classList.contains('hidden'));
console.log('✓ Tab switching works seamlessly.');

// Test H: Verify Sub-Filter Switching
console.log('\nTesting Sub-Filter Switching...');
setAuthoritySubFilter('gatepass');
assert.strictEqual(authState.subFilter, 'gatepass');
setAuthoritySubFilter('onduty');
assert.strictEqual(authState.subFilter, 'onduty');
setAuthoritySubFilter('leave');
assert.strictEqual(authState.subFilter, 'leave');
console.log('✓ Filter tab switching works seamlessly.');

console.log('\n========================================');
console.log('ALL AUTHORITY PORTAL TESTS PASSED (100%)');
console.log('========================================\n');
process.exit(0);
