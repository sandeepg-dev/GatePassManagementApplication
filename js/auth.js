/**
 * Single Common Authentication & Role Detection Module
 * Campus PassPro • GRT Institute of Engineering and Technology
 * 
 * Restored Proven Authentication Flow:
 * - Application Launch -> Institutional Login Page appears immediately
 * - User enters Login ID & Password -> Sign In
 * - Backend validates credentials -> Identifies Student / Staff Role
 * - Automatically opens corresponding authorized dashboard
 * - If no session or session invalid -> Institutional Login remains visible
 */

var loggedUser = (typeof loggedUser !== 'undefined' ? loggedUser : null);
if (typeof window !== 'undefined') {
  window.loggedUser = loggedUser;
}

const AuthState = {
  CHECKING: 'CHECKING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATED: 'AUTHENTICATED'
};
var currentAuthState = (typeof currentAuthState !== 'undefined' ? currentAuthState : AuthState.UNAUTHENTICATED);

/**
 * Normalizes role string to canonical format
 */
function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (r === 'boyswarden' || r === 'boys_warden') return 'boys_warden';
  if (r === 'girlswarden' || r === 'girls_warden') return 'girls_warden';
  if (r === 'warden' || r === 'hostel_warden') return 'warden';
  if (r === 'class_advisor' || r === 'advisor') return 'advisor';
  if (r === 'class_counselor' || r === 'counselor') return 'counselor';
  if (r === 'head_of_department' || r === 'hod') return 'hod';
  if (r === 'principal' || r === 'head') return 'principal';
  if (r === 'admin' || r === 'administrator') return 'admin';
  if (r === 'student') return 'student';
  return r;
}

/**
 * Set application UI display state
 */
function setAuthState(state, user = null) {
  currentAuthState = state;
  if (typeof window !== 'undefined') {
    window.currentAuthState = state;
  }

  const loginPortal = document.getElementById('singleLoginPortalScreen');
  const dashScreen = document.getElementById('dashScreen');

  if (state === AuthState.AUTHENTICATED && user && user.userId && user.role) {
    const role = normalizeRole(user.role);
    user.role = role;
    loggedUser = user;
    if (typeof window !== 'undefined') window.loggedUser = user;

    if (role === 'admin') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('campusAdminUser', JSON.stringify(user));
      if (typeof localStorage !== 'undefined') localStorage.setItem('campusAdminUser', JSON.stringify(user));
      window.location.replace('/admin.html');
      return;
    }

    if (typeof openDashboard === 'function') {
      try {
        const ok = openDashboard(user);
        if (ok !== false) {
          if (loginPortal) loginPortal.classList.add('hidden');
          if (dashScreen) dashScreen.classList.remove('hidden');
          if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
          return;
        }
      } catch (err) {
        console.error('Error opening dashboard:', err);
      }
    }
  }

  // Fallback / Unauthenticated state: Login page remains continuously visible
  currentAuthState = AuthState.UNAUTHENTICATED;
  if (typeof window !== 'undefined') window.currentAuthState = AuthState.UNAUTHENTICATED;
  loggedUser = null;
  if (typeof window !== 'undefined') window.loggedUser = null;
  if (typeof document !== 'undefined') {
    document.body.classList.remove('theme-student');
  }

  if (loginPortal) loginPortal.classList.remove('hidden');
  if (dashScreen) dashScreen.classList.add('hidden');
}

/**
 * Check existing session on startup or refresh
 */
async function checkInitialAuthState() {
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
  const errorAlert = document.getElementById('loginErrorAlert');
  if (errorAlert) errorAlert.classList.add('hidden');

  let saved = null;
  try {
    saved = sessionStorage.getItem('campusPassUser') || localStorage.getItem('campusPassUser');
  } catch (e) {
    console.warn('Storage read warning:', e);
  }

  if (!saved) {
    setAuthState(AuthState.UNAUTHENTICATED);
    return;
  }

  try {
    const user = JSON.parse(saved);
    if (user && user.userId && user.role) {
      user.role = normalizeRole(user.role);
      setAuthState(AuthState.AUTHENTICATED, user);
      return;
    }
  } catch (err) {
    console.warn('Corrupted saved session:', err);
  }

  // Invalid or unparseable session: clean up and ensure Login is visible
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('campusPassUser');
  if (typeof localStorage !== 'undefined') localStorage.removeItem('campusPassUser');
  setAuthState(AuthState.UNAUTHENTICATED);
}

// Auto-restore session or ensure login visibility on page load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialAuthState);
  } else {
    checkInitialAuthState();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', () => {
    if (!loggedUser && typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('campusPassUser')) {
      const idInput = document.getElementById('commonLoginId');
      const passInput = document.getElementById('commonPassword');
      if (idInput) idInput.value = '';
      if (passInput) passInput.value = '';
    }
  });
}

/**
 * Handle Common Universal Login
 */
async function handleCommonLogin(e) {
  if (e && e.preventDefault) e.preventDefault();

  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  const submitBtn = document.getElementById('commonLoginBtn');
  const errorAlert = document.getElementById('loginErrorAlert');
  const loginCard = document.getElementById('loginCard');

  if (errorAlert) {
    errorAlert.classList.add('hidden');
    errorAlert.classList.remove('animate-shake');
  }

  const userId = (idInput?.value || '').trim();
  const password = (passInput?.value || '').trim();

  if (!userId || !password) {
    const msg = 'Please enter both Login ID and Password.';
    if (errorAlert) {
      errorAlert.innerText = msg;
      errorAlert.classList.remove('hidden');
      errorAlert.classList.add('animate-shake');
      setTimeout(() => errorAlert.classList.remove('animate-shake'), 450);
    }
    return;
  }

  // Subtle professional loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    submitBtn.innerHTML = `
      <svg class="animate-spin h-4 w-4 text-white inline-block" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="tracking-wider text-xs">SIGNING IN...</span>
    `;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errMsg = data.message || 'Invalid Roll Number / Staff ID or Password.';
      if (errorAlert) {
        errorAlert.innerText = errMsg;
        errorAlert.classList.remove('hidden');
        errorAlert.classList.add('animate-shake');
        setTimeout(() => errorAlert.classList.remove('animate-shake'), 450);
      }
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.classList.add('animate-shake');
        setTimeout(() => submitBtn.classList.remove('animate-shake'), 450);
      }
      setAuthState(AuthState.UNAUTHENTICATED);
      return;
    }

    const user = data.user;
    if (!user || !user.role) {
      const roleErr = 'Unable to determine your account role. Please contact the administrator.';
      if (errorAlert) {
        errorAlert.innerText = roleErr;
        errorAlert.classList.remove('hidden');
      }
      setAuthState(AuthState.UNAUTHENTICATED);
      return;
    }

    user.role = normalizeRole(user.role || data.role);
    user.userType = data.userType || (user.role === 'student' ? 'Student' : (user.role === 'admin' ? 'Admin' : 'Staff'));
    if (data.token) {
      user.token = data.token;
    }

    // Persist active session
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('campusPassUser', JSON.stringify(user));
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('campusPassUser', JSON.stringify(user));
    }

    if (user.role === 'admin') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('campusAdminUser', JSON.stringify(user));
      if (typeof localStorage !== 'undefined') localStorage.setItem('campusAdminUser', JSON.stringify(user));
    }

    // Subtle professional success animation on button
    if (submitBtn) {
      submitBtn.classList.remove('is-loading');
      submitBtn.classList.add('is-success');
      submitBtn.innerHTML = `
        <svg class="w-4 h-4 text-white animate-scale-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        <span class="tracking-wider text-xs">SUCCESS</span>
      `;
    }

    if (loginCard) {
      loginCard.style.opacity = '0.92';
      loginCard.style.transform = 'scale(0.99)';
    }

    // Brief smooth transition timing
    await new Promise(r => setTimeout(r, 260));

    // Open corresponding authorized dashboard immediately
    setAuthState(AuthState.AUTHENTICATED, user);

  } catch (err) {
    console.error('Login error:', err);
    const failMsg = 'Unable to connect to the authentication server. Please check your network connection.';
    if (errorAlert) {
      errorAlert.innerText = failMsg;
      errorAlert.classList.remove('hidden');
    }
    setAuthState(AuthState.UNAUTHENTICATED);
  } finally {
    if (submitBtn && currentAuthState !== AuthState.AUTHENTICATED) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading', 'is-success');
      submitBtn.innerHTML = `
        <span id="loginBtnContent" class="flex items-center justify-center gap-2">
          <span>SIGN IN</span>
        </span>
      `;
    }
    if (loginCard && currentAuthState !== AuthState.AUTHENTICATED) {
      loginCard.style.opacity = '1';
      loginCard.style.transform = 'none';
    }
  }
}

/**
 * Toggle password reveal
 */
function togglePasswordVisibility(inputId = 'commonPassword', iconId = 'passwordEyeIcon') {
  const passField = document.getElementById(inputId);
  const eyeIcon = document.getElementById(iconId);
  if (!passField) return;

  if (passField.type === 'password') {
    passField.type = 'text';
    if (eyeIcon) eyeIcon.innerHTML = `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>`;
  } else {
    passField.type = 'password';
    if (eyeIcon) eyeIcon.innerHTML = `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
  }
}

/**
 * Universal Logout Handler
 */
function logout() {
  if (typeof wardenAutoRefreshTimer !== 'undefined' && wardenAutoRefreshTimer) {
    clearInterval(wardenAutoRefreshTimer);
    wardenAutoRefreshTimer = null;
  }

  // Clear all storage tokens and user cache
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('campusPassUser');
    sessionStorage.removeItem('campusAdminUser');
    sessionStorage.clear();
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('campusPassUser');
    localStorage.removeItem('campusAdminUser');
  }

  // Reset form inputs & button states
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  const submitBtn = document.getElementById('commonLoginBtn');
  const loginCard = document.getElementById('loginCard');

  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('is-loading', 'is-success');
    submitBtn.innerHTML = `
      <span id="loginBtnContent" class="flex items-center justify-center gap-2">
        <span>SIGN IN</span>
      </span>
    `;
  }
  if (loginCard) {
    loginCard.style.opacity = '1';
    loginCard.style.transform = 'none';
  }

  if (typeof document !== 'undefined') {
    document.body.classList.remove('theme-student');
  }

  // Switch display back to Institutional Login
  setAuthState(AuthState.UNAUTHENTICATED);

  if (typeof showToast === 'function') {
    showToast('Signed out successfully.', 'info', 2500);
  }
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.AuthState = AuthState;
  window.currentAuthState = currentAuthState;
  window.loggedUser = loggedUser;
  window.normalizeRole = normalizeRole;
  window.setAuthState = setAuthState;
  window.checkInitialAuthState = checkInitialAuthState;
  window.handleCommonLogin = handleCommonLogin;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.logout = logout;
}
