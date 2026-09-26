/**
 * Single Common Authentication & Role Detection Module
 * Campus PassPro • GRT Institute of Engineering and Technology
 * 
 * Enforces 3-State Authentication Lifecycle:
 * 1. CHECKING: Verifies active session against /api/auth/verify-session without flickering
 * 2. UNAUTHENTICATED: Institutional Login continuously visible (never blank blue screen)
 * 3. AUTHENTICATED: Seamlessly transitions to the authorized dashboard
 */

let loggedUser = null;
if (typeof window !== 'undefined') {
  window.loggedUser = null;
}

const AuthState = {
  CHECKING: 'CHECKING',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTHENTICATED: 'AUTHENTICATED'
};
let currentAuthState = AuthState.UNAUTHENTICATED;

/**
 * Normalizes role string to canonical format
 */
function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (r === 'boyswarden' || r === 'boys_warden') return 'boys_warden';
  if (r === 'girlswarden' || r === 'girls_warden') return 'girls_warden';
  if (r === 'class_advisor' || r === 'advisor') return 'advisor';
  if (r === 'class_counselor' || r === 'counselor') return 'counselor';
  if (r === 'head_of_department' || r === 'hod') return 'hod';
  return r;
}

/**
 * Manage 3-State Auth Transitions
 */
function setAuthState(state, user = null) {
  currentAuthState = state;
  const overlay = document.getElementById('authCheckingOverlay');
  const loginPortal = document.getElementById('singleLoginPortalScreen');
  const dashScreen = document.getElementById('dashScreen');

  if (state === AuthState.CHECKING) {
    if (overlay) overlay.classList.remove('hidden');
    if (loginPortal) loginPortal.classList.remove('hidden');
    if (dashScreen) dashScreen.classList.add('hidden');
  } else if (state === AuthState.UNAUTHENTICATED) {
    if (overlay) overlay.classList.add('hidden');
    if (loginPortal) loginPortal.classList.remove('hidden');
    if (dashScreen) dashScreen.classList.add('hidden');
    loggedUser = null;
    window.loggedUser = null;
  } else if (state === AuthState.AUTHENTICATED) {
    if (overlay) overlay.classList.add('hidden');

    if (!user) {
      console.warn('Authenticated state called without user');
      return;
    }

    user.role = normalizeRole(user.role);
    loggedUser = user;
    window.loggedUser = user;

    if (user.role === 'admin') {
      window.location.replace('/admin.html');
      return;
    }

    // Direct, immediate transition to authenticated dashboard
    if (loginPortal) loginPortal.classList.add('hidden');
    if (dashScreen) dashScreen.classList.remove('hidden');
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo(0, 0);
    }

    if (typeof openDashboard === 'function') {
      try {
        openDashboard(user);
      } catch (err) {
        console.error('Error initializing dashboard for authenticated user:', err);
        if (typeof showToast === 'function') {
          showToast('Dashboard loaded with notice: ' + (err.message || 'Check console'), 'warning', 3500);
        }
      }
    }
  }
}

/**
 * Check authentication session on application launch
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
  } catch (err) {
    console.warn('Storage access warning:', err);
  }

  // 1. If NO saved user session:
  // Immediately UNAUTHENTICATED. Keep Institutional Login permanently visible.
  if (!saved) {
    setAuthState(AuthState.UNAUTHENTICATED);
    return;
  }

  // 2. Parse session
  let user = null;
  try {
    user = JSON.parse(saved);
  } catch (err) {
    console.warn('Invalid saved session JSON:', err);
    sessionStorage.removeItem('campusPassUser');
    localStorage.removeItem('campusPassUser');
    setAuthState(AuthState.UNAUTHENTICATED);
    return;
  }

  if (!user || !user.userId || !user.role) {
    sessionStorage.removeItem('campusPassUser');
    localStorage.removeItem('campusPassUser');
    setAuthState(AuthState.UNAUTHENTICATED);
    return;
  }

  // 3. Stored session present: CHECKING state with institutional backend validation
  setAuthState(AuthState.CHECKING);

  try {
    const res = await fetch('/api/auth/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.userId, role: user.role })
    });

    const data = await res.json();

    if (res.ok && data && data.success && data.user) {
      const verifiedUser = data.user;
      verifiedUser.role = normalizeRole(verifiedUser.role || data.role);
      loggedUser = verifiedUser;
      window.loggedUser = verifiedUser;
      sessionStorage.setItem('campusPassUser', JSON.stringify(verifiedUser));
      if (localStorage.getItem('campusPassUser')) {
        localStorage.setItem('campusPassUser', JSON.stringify(verifiedUser));
      }
      setAuthState(AuthState.AUTHENTICATED, verifiedUser);
    } else {
      console.warn('Session verification rejected by server:', data?.message);
      sessionStorage.removeItem('campusPassUser');
      localStorage.removeItem('campusPassUser');
      setAuthState(AuthState.UNAUTHENTICATED);
    }
  } catch (err) {
    console.warn('Session verification network error:', err);
    sessionStorage.removeItem('campusPassUser');
    localStorage.removeItem('campusPassUser');
    setAuthState(AuthState.UNAUTHENTICATED);
  }
}

// Auto-restore session or ensure persistent login on page load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialAuthState);
  } else {
    checkInitialAuthState();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', () => {
    if (!loggedUser && !sessionStorage.getItem('campusPassUser')) {
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
  const rememberCheckbox = document.getElementById('rememberMe');

  if (errorAlert) errorAlert.classList.add('hidden');

  const userId = (idInput?.value || '').trim();
  const password = (passInput?.value || '').trim();

  if (!userId || !password) {
    if (errorAlert) {
      errorAlert.innerText = 'Please enter both your Login ID / Register Number and Password.';
      errorAlert.classList.remove('hidden');
    } else if (typeof showToast === 'function') {
      showToast('Please enter both Login ID and Password.', 'warning', 3000);
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Authenticating...</span>
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
      } else if (typeof showToast === 'function') {
        showToast(errMsg, 'error', 3500);
      }
      setAuthState(AuthState.UNAUTHENTICATED);
      return;
    }

    const user = data.user;
    user.role = normalizeRole(user.role || data.role);
    loggedUser = user;
    window.loggedUser = user;

    sessionStorage.setItem('campusPassUser', JSON.stringify(user));
    if (rememberCheckbox && rememberCheckbox.checked) {
      localStorage.setItem('campusPassUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('campusPassUser');
    }

    if (typeof showToast === 'function') {
      showToast(`Welcome back, ${user.name}!`, 'success', 2500);
    }

    // Direct, immediate transition to authenticated dashboard
    setAuthState(AuthState.AUTHENTICATED, user);

  } catch (err) {
    console.error('Login error:', err);
    if (errorAlert) {
      errorAlert.innerText = 'Unable to connect to the authentication server. Please check your network connection.';
      errorAlert.classList.remove('hidden');
    } else if (typeof showToast === 'function') {
      showToast('Authentication server error. Please try again.', 'error', 3500);
    }
    setAuthState(AuthState.UNAUTHENTICATED);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In to Institutional Portal</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
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
  loggedUser = null;
  window.loggedUser = null;
  sessionStorage.removeItem('campusPassUser');
  localStorage.removeItem('campusPassUser');
  sessionStorage.clear();

  // Reset inputs
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';

  // Transition to UNAUTHENTICATED
  setAuthState(AuthState.UNAUTHENTICATED);

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', '/');
  }
  window.location.replace('/');
}

// Global window bindings
window.AuthState = AuthState;
window.normalizeRole = normalizeRole;
window.setAuthState = setAuthState;
window.checkInitialAuthState = checkInitialAuthState;
window.handleCommonLogin = handleCommonLogin;
window.togglePasswordVisibility = togglePasswordVisibility;
window.logout = logout;
