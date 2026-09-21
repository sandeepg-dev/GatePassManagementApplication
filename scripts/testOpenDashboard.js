const fs = require('fs');
const path = require('path');

// Read all scripts
const scripts = [
  'js/utils.js',
  'js/api.js',
  'js/modules/studentPortal.js',
  'js/modules/onDutyPortal.js',
  'js/modules/counselorQueue.js',
  'js/modules/advisorQueue.js',
  'js/modules/hodQueue.js',
  'js/modules/principalQueue.js',
  'js/modules/wardenQueue.js',
  'js/modules/auditLogs.js',
  'js/dashboard.js',
  'js/main.js'
];

// Simple DOM Mock
class ElementMock {
  constructor(id) {
    this.id = id;
    this.classList = {
      classes: new Set(),
      add: (...c) => c.forEach(x => this.classList.classes.add(x)),
      remove: (...c) => c.forEach(x => this.classList.classes.delete(x)),
      contains: (x) => this.classList.classes.has(x)
    };
    this.children = [];
    this._innerHTML = '';
    this.innerText = '';
    this.style = {};
  }
  set innerHTML(val) {
    this._innerHTML = val;
  }
  get innerHTML() {
    return this._innerHTML;
  }
  addEventListener() {}
  setAttribute() {}
  getAttribute() { return ''; }
}

const elements = {};
function getElementById(id) {
  if (!elements[id]) {
    elements[id] = new ElementMock(id);
  }
  return elements[id];
}

// Global environment
global.window = global;
global.window.addEventListener = () => {};
global.document = {
  getElementById,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: (tag) => new ElementMock(tag)
};
global.sessionStorage = { setItem: () => {}, getItem: () => null, removeItem: () => {}, clear: () => {} };
global.localStorage = { setItem: () => {}, getItem: () => null, removeItem: () => {}, clear: () => {} };
global.showToast = (msg) => console.log('[TOAST]:', msg);

// Execute scripts
for (const s of scripts) {
  const code = fs.readFileSync(s, 'utf8');
  try {
    eval(code);
    console.log('Loaded:', s);
  } catch (err) {
    console.error('ERROR LOADING:', s, err);
  }
}

console.log('\n--- TESTING STUDENT LOGIN ---');
try {
  const student = { userId: '110324104061', role: 'student', name: 'NAVEEN K R', dept: 'CSE', yearSec: 'A', accommodation: 'Day Scholar' };
  global.loggedUser = student;
  global.window.loggedUser = student;
  openDashboard(student);
  console.log('Student openDashboard succeeded! roleDashboardContent length:', elements['roleDashboardContent']?.innerHTML?.length);
  console.log('studentPersonalView visible:', !elements['studentPersonalView']?.classList?.contains('hidden'));
} catch (err) {
  console.error('ERROR IN STUDENT openDashboard:', err);
}

console.log('\n--- TESTING COUNSELOR LOGIN ---');
try {
  const counselor = { userId: '7471', role: 'counselor', name: 'Mrs shanmugavalli', dept: 'CSE', startRoll: '110324104001', endRoll: '110324104030' };
  global.loggedUser = counselor;
  global.window.loggedUser = counselor;
  openDashboard(counselor);
  console.log('Counselor openDashboard succeeded! roleDashboardContent length:', elements['roleDashboardContent']?.innerHTML?.length);
} catch (err) {
  console.error('ERROR IN COUNSELOR openDashboard:', err);
}

console.log('\n--- TESTING ADVISOR LOGIN ---');
try {
  const advisor = { userId: '7472', role: 'advisor', name: 'shanmugavalli', dept: 'CSE', yearSec: 'A', academicYear: '3 Year' };
  global.loggedUser = advisor;
  global.window.loggedUser = advisor;
  openDashboard(advisor);
  console.log('Advisor openDashboard succeeded! roleDashboardContent length:', elements['roleDashboardContent']?.innerHTML?.length);
} catch (err) {
  console.error('ERROR IN ADVISOR openDashboard:', err);
}

console.log('\n--- TESTING HOD LOGIN ---');
try {
  const hod = { userId: '7247', role: 'hod', name: 'Dr kamal', dept: 'CSE' };
  global.loggedUser = hod;
  global.window.loggedUser = hod;
  openDashboard(hod);
  console.log('HOD openDashboard succeeded! roleDashboardContent length:', elements['roleDashboardContent']?.innerHTML?.length);
} catch (err) {
  console.error('ERROR IN HOD openDashboard:', err);
}

console.log('\n--- TESTING PRINCIPAL LOGIN ---');
try {
  const principal = { userId: 'grt@head', role: 'principal', name: 'Dr Arumugam', dept: 'COLLEGE' };
  global.loggedUser = principal;
  global.window.loggedUser = principal;
  openDashboard(principal);
  console.log('Principal openDashboard succeeded! roleDashboardContent length:', elements['roleDashboardContent']?.innerHTML?.length);
} catch (err) {
  console.error('ERROR IN PRINCIPAL openDashboard:', err);
}

console.log('\n--- TESTING WARDEN LOGIN ---');
try {
  const warden = { userId: '6661', role: 'boys_warden', name: 'Mr Arul Prasad', dept: 'CSE' };
  global.loggedUser = warden;
  global.window.loggedUser = warden;
  openDashboard(warden);
  console.log('Warden openDashboard succeeded! roleDashboardContent length:', elements['roleDashboardContent']?.innerHTML?.length);
} catch (err) {
  console.error('ERROR IN WARDEN openDashboard:', err);
}

process.exit(0);
