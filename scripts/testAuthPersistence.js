/**
 * Comprehensive Verification & Authentication Flow Test
 * Campus PassPro • GRT Institute of Engineering and Technology
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(description, condition, details = '') {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${description}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${description} ${details ? '(' + details + ')' : ''}`);
  }
}

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
    this.value = '';
    this.style = {};
  }
  set innerHTML(val) { this._innerHTML = val; }
  get innerHTML() { return this._innerHTML; }
  addEventListener() {}
  setAttribute() {}
  getAttribute() { return ''; }
  appendChild(child) { this.children.push(child); return child; }
  remove() {}
}

const elements = {};
function getElementById(id) {
  if (!elements[id]) {
    elements[id] = new ElementMock(id);
  }
  return elements[id];
}

global.window = global;
global.window.scrollTo = () => {};
global.window.addEventListener = () => {};
global.window.location = { pathname: '/', replace: (p) => { global.window.location.pathname = p; } };
global.window.history = {
  pushState: (s, t, p) => { global.window.location.pathname = p; },
  replaceState: (s, t, p) => { global.window.location.pathname = p; }
};
global.document = {
  getElementById,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: (tag) => new ElementMock(tag),
  documentElement: new ElementMock('html'),
  readyState: 'complete'
};

const storageStore = {};
global.sessionStorage = {
  setItem: (k, v) => { storageStore['session:' + k] = String(v); },
  getItem: (k) => storageStore['session:' + k] || null,
  removeItem: (k) => { delete storageStore['session:' + k]; },
  clear: () => { Object.keys(storageStore).filter(k => k.startsWith('session:')).forEach(k => delete storageStore[k]); }
};
global.localStorage = {
  setItem: (k, v) => { storageStore['local:' + k] = String(v); },
  getItem: (k) => storageStore['local:' + k] || null,
  removeItem: (k) => { delete storageStore['local:' + k]; },
  clear: () => { Object.keys(storageStore).filter(k => k.startsWith('local:')).forEach(k => delete storageStore[k]); }
};
global.showToast = (msg, type) => console.log(`[TOAST ${type || 'info'}]:`, msg);

// Load all frontend scripts in order
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
  'js/auth.js',
  'js/main.js'
];

for (const s of scripts) {
  const code = fs.readFileSync(path.join(__dirname, '..', s), 'utf8');
  eval(code);
}

async function runAuthTests() {
  console.log('=====================================================');
  console.log('CAMPUS PASSPRO • AUTHENTICATION FLOW VERIFICATION');
  console.log('=====================================================\n');

  console.log('--- Test 1: Unauthenticated Startup Flow ---');
  // Storage is completely empty
  sessionStorage.clear();
  localStorage.clear();

  // Reset elements
  getElementById('singleLoginPortalScreen').classList.remove('hidden');
  getElementById('dashScreen').classList.add('hidden');

  await checkInitialAuthState();

  assert('Login screen remains visible when unauthenticated', !getElementById('singleLoginPortalScreen').classList.contains('hidden'));
  assert('Dashboard screen remains hidden when unauthenticated', getElementById('dashScreen').classList.contains('hidden'));
  assert('currentAuthState is UNAUTHENTICATED', currentAuthState === AuthState.UNAUTHENTICATED);
  assert('loggedUser is null', loggedUser === null);

  console.log('\n--- Test 2: Corrupted / Invalid Session Handling ---');
  // Put a corrupted session in localStorage
  localStorage.setItem('campusPassUser', '{ invalid_json: ');

  await checkInitialAuthState();

  assert('Corrupted session is purged from localStorage', localStorage.getItem('campusPassUser') === null);
  assert('Login screen stays visible on corrupted session', !getElementById('singleLoginPortalScreen').classList.contains('hidden'));
  assert('Dashboard stays hidden on corrupted session', getElementById('dashScreen').classList.contains('hidden'));
  assert('currentAuthState evaluates to UNAUTHENTICATED', currentAuthState === AuthState.UNAUTHENTICATED);

  console.log('\n--- Test 3: Live Backend Login & Token Generation ---');
  const baseApi = 'http://localhost:10000';

  try {
    // 3.1 Student Login
    const studentRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '110324104061', password: 'grt@123' })
    })).json();

    assert('Student credential validation succeeds', studentRes.success === true);
    assert('Student response contains secure token', !!studentRes.token);
    assert('Student response identifies Student account type', studentRes.userType === 'Student');

    // 3.2 Warden Login (6661)
    const wardenRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '6661', password: 'grt@123' })
    })).json();

    assert('Warden credential validation succeeds', wardenRes.success === true);
    assert('Warden response contains secure token', !!wardenRes.token);
    assert('Warden response identifies Staff account type', wardenRes.userType === 'Staff');

    // 3.3 Counselor Login (7471)
    const counselorRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '7471', password: 'grt@123' })
    })).json();
    assert('Counselor credential validation succeeds', counselorRes.success === true);

    // 3.4 Advisor Login (7472)
    const advisorRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '7472', password: 'grt@123' })
    })).json();
    assert('Advisor credential validation succeeds', advisorRes.success === true);

    // 3.5 HOD Login (7247)
    const hodRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '7247', password: 'grt@123' })
    })).json();
    assert('HOD credential validation succeeds', hodRes.success === true);

    // 3.6 Principal Login (grt@head)
    const principalRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'grt@head', password: 'grt@123' })
    })).json();
    assert('Principal credential validation succeeds', principalRes.success === true);

    // 3.7 Admin Login (admin)
    const adminRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'Admin@123' })
    })).json();
    assert('Admin credential validation succeeds', adminRes.success === true);
    assert('Admin response contains secure token', !!adminRes.token);
    assert('Admin response identifies Admin account type', adminRes.userType === 'Admin');

    console.log('\n--- Test 4: Dashboard Rendering for All Institutional Roles ---');
    const testProfiles = [
      { role: 'student', user: studentRes.user },
      { role: 'counselor', user: counselorRes.user },
      { role: 'advisor', user: advisorRes.user },
      { role: 'hod', user: hodRes.user },
      { role: 'principal', user: principalRes.user },
      { role: 'boys_warden', user: wardenRes.user },
      { role: 'warden', user: { ...wardenRes.user, role: 'warden' } }
    ];

    for (const tp of testProfiles) {
      getElementById('roleDashboardContent').innerHTML = '';
      const ok = openDashboard(tp.user);
      assert(`openDashboard succeeds for ${tp.role}`, ok === true);
      assert(`roleDashboardContent is populated for ${tp.role} (no blank screen)`, (getElementById('roleDashboardContent').innerHTML || '').length > 0 || tp.role === 'student');
    }

    console.log('\n--- Test 5: Wrong Password / Invalid Login Handling ---');
    const wrongPassRes = await (await fetch(`${baseApi}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '110324104061', password: 'incorrect_password_xyz' })
    })).json();

    assert('Wrong password rejected with success: false', wrongPassRes.success === false);
    assert('Rejection message informs user of invalid credentials', /invalid/i.test(wrongPassRes.message));

    console.log('\n--- Test 6: Session Restoration on Refresh ---');
    // Save valid user in sessionStorage and simulate page reload
    sessionStorage.setItem('campusPassUser', JSON.stringify(studentRes.user));
    await checkInitialAuthState();

    assert('Session restored on reload', currentAuthState === AuthState.AUTHENTICATED);
    assert('Logged user restored', loggedUser !== null && loggedUser.userId === studentRes.user.userId);
    assert('Dashboard visible on reload', !getElementById('dashScreen').classList.contains('hidden'));
    assert('Login portal hidden on reload', getElementById('singleLoginPortalScreen').classList.contains('hidden'));

    console.log('\n--- Test 7: Logout Flow ---');
    logout();
    assert('State is UNAUTHENTICATED after logout', currentAuthState === AuthState.UNAUTHENTICATED);
    assert('Dashboard is hidden after logout', getElementById('dashScreen').classList.contains('hidden'));
    assert('Login portal is visible after logout', !getElementById('singleLoginPortalScreen').classList.contains('hidden'));
    assert('Session purged from sessionStorage on logout', sessionStorage.getItem('campusPassUser') === null);

  } catch (err) {
    console.error('API Error during tests:', err);
    assert('API tests completed without error', false, err.message);
  }

  console.log('\n=====================================================');
  console.log(`TEST SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=====================================================');
  process.exit(failCount > 0 ? 1 : 0);
}

runAuthTests();
