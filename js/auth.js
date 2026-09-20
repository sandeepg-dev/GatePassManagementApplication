/**
 * Single Common Authentication & Role Detection Module
 * Campus PassPro • GRT Institute of Engineering and Technology
 */

let loggedUser = null;

// Ensure login fields are completely empty by default on every page load
window.addEventListener('DOMContentLoaded', () => {
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
  const errorAlert = document.getElementById('loginErrorAlert');
  if (errorAlert) errorAlert.classList.add('hidden');
});

window.addEventListener('pageshow', () => {
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
});

/**
 * Handle Common Universal Login
 */
async function handleCommonLogin(e) {
  if (e && e.preventDefault) e.preventDefault();

  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  const submitBtn = document.getElementById('commonLoginBtn');
  const errorAlert = document.getElementById('loginErrorAlert');

  if (errorAlert) errorAlert.classList.add('hidden');

  const userId = (idInput?.value || '').trim();
  const password = (passInput?.value || '').trim();

  if (!userId || !password) {
    if (errorAlert) {
      errorAlert.innerText = 'Please enter both your Login ID / Register Number and Password.';
      errorAlert.classList.remove('hidden');
    } else {
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
      } else {
        showToast(errMsg, 'error', 3500);
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In to Dashboard</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
      }
      return;
    }

    const user = data.user;
    loggedUser = user;
    sessionStorage.setItem('campusPassUser', JSON.stringify(user));
    localStorage.setItem('campusPassUser', JSON.stringify(user));

    showToast(`Welcome back, ${user.name}!`, 'success', 2500);

    // If Admin logged in from common screen, redirect to Admin Portal
    if (user.role === 'admin') {
      window.location.href = '/admin.html';
      return;
    }

    // Hide common login and open respective dashboard
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    if (loginPortal) loginPortal.classList.add('hidden');

    openDashboard(user);

  } catch (err) {
    console.error('Login error:', err);
    if (errorAlert) {
      errorAlert.innerText = 'Unable to connect to the authentication server. Please check your network connection.';
      errorAlert.classList.remove('hidden');
    } else {
      showToast('Authentication server error. Please try again.', 'error', 3500);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In to Dashboard</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
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
  sessionStorage.removeItem('campusPassUser');
  localStorage.removeItem('campusPassUser');
  sessionStorage.clear();

  // Clear inputs
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';

  // Switch display
  document.getElementById('dashScreen')?.classList.add('hidden');
  document.getElementById('singleLoginPortalScreen')?.classList.remove('hidden');

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', '/');
  }
  window.location.replace('/');
}

// Global window bindings
window.handleCommonLogin = handleCommonLogin;
window.togglePasswordVisibility = togglePasswordVisibility;
window.logout = logout;
