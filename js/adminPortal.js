/**
 * Admin Portal Management Controller & Client API Module
 * Campus PassPro • GRT Institute of Engineering and Technology
 */

let activeAdmin = null;
let currentAdminTab = 'students';

// Initialize session state on load & ensure inputs start empty
window.addEventListener('DOMContentLoaded', () => {
  const userIdInput = document.getElementById('adminUserId');
  const passInput = document.getElementById('adminPassword');
  if (userIdInput) userIdInput.value = '';
  if (passInput) passInput.value = '';

  // Ensure Administrator Control Portal always presents the separate login page on entry
  document.getElementById('adminLoginScreen')?.classList.remove('hidden');
  document.getElementById('adminDashboardScreen')?.classList.add('hidden');
});

window.addEventListener('pageshow', () => {
  const userIdInput = document.getElementById('adminUserId');
  const passInput = document.getElementById('adminPassword');
  if (userIdInput) userIdInput.value = '';
  if (passInput) passInput.value = '';
});

/**
 * Handle Admin Direct Password Login
 */
async function handleAdminLogin() {
  const userIdInput = document.getElementById('adminUserId');
  const passInput = document.getElementById('adminPassword');
  const submitBtn = document.getElementById('adminLoginBtn');
  const errorBox = document.getElementById('adminLoginError');

  if (errorBox) errorBox.classList.add('hidden');

  const userId = (userIdInput?.value || '').trim();
  const password = (passInput?.value || '').trim();

  if (!userId || !password) {
    if (errorBox) {
      errorBox.innerText = 'Please provide both Login ID and Password.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Verifying credentials...</span>`;
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (errorBox) {
        errorBox.innerText = data.message || 'Invalid Administrator credentials.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    activeAdmin = data.admin;
    sessionStorage.setItem('campusAdminUser', JSON.stringify(data.admin));
    localStorage.setItem('campusAdminUser', JSON.stringify(data.admin));

    showToast('Administrator authenticated successfully.', 'success', 2500);
    showAdminDashboard();

  } catch (err) {
    if (errorBox) {
      errorBox.innerText = 'Error connecting to admin authentication service.';
      errorBox.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Login</span>`;
    }
  }
}

/**
 * Display Dashboard and Load Initial Collections
 */
function showAdminDashboard() {
  document.getElementById('adminLoginScreen')?.classList.add('hidden');
  document.getElementById('adminDashboardScreen')?.classList.remove('hidden');
  refreshAdminData();
}

/**
 * Admin Logout
 */
function adminLogout() {
  sessionStorage.removeItem('campusAdminUser');
  localStorage.removeItem('campusAdminUser');
  activeAdmin = null;
  location.reload();
}

/**
 * Refresh All Collections & KPI Metrics
 */
function refreshAdminData() {
  loadAdminStats();
  loadAdminStudents();
  loadAdminStaff();
}

/**
 * Tab Navigation Switcher
 */
function switchAdminTab(tabName) {
  currentAdminTab = tabName;
  const tabs = ['students', 'counselors', 'advisors', 'hods', 'principal', 'wardens', 'leadership', 'staffDirectory'];

  // Handle compatibility fallback if leadership is called
  let targetTab = tabName;
  if (tabName === 'leadership') {
    targetTab = 'principal';
  }

  tabs.forEach(t => {
    const sec = document.getElementById(`adminSec_${t}`);
    const btn = document.getElementById(`adminTabBtn_${t}`);
    if (sec) {
      if (t === targetTab || (tabName === 'leadership' && (t === 'principal' || t === 'wardens'))) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    }
    if (btn) {
      const isStaffDir = t === 'staffDirectory';
      const mlClass = isStaffDir ? 'ml-auto' : '';
      if (t === targetTab) {
        btn.className = `admin-nav-tab active-admin-tab px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40 border border-red-500/50 transition-all flex items-center gap-2 ${mlClass}`;
      } else {
        btn.className = `admin-nav-tab px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/90 hover:border-slate-700 transition-all flex items-center gap-2 ${mlClass}`;
      }
    }
  });

  if (targetTab === 'students') loadAdminStudents();
  else loadAdminStaff();
}

/**
 * Load Overview Stats
 */
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || 0; };
      setTxt('kpiStudents', s.totalStudents);
      setTxt('kpiCounselors', s.counselorsCount);
      setTxt('kpiAdvisors', s.advisorsCount);
      setTxt('kpiHODs', s.hodsCount);
      setTxt('kpiWardens', s.wardensCount);
      setTxt('kpiPasses', s.totalPasses);
    }
  } catch (e) {
    console.error('Stats error:', e);
  }
}

let currentStudentsList = [];

/**
 * Load Students Roster with Filtering & Search
 */
async function loadAdminStudents(viewAll = false) {
  const tbody = document.getElementById('adminStudentsTableBody');
  const countBadge = document.getElementById('studentCountBadge');
  const search = viewAll ? '' : (document.getElementById('studentSearchInput')?.value || '');
  const academicYear = viewAll ? 'ALL' : (document.getElementById('studentYearFilter')?.value || 'ALL');
  const dept = viewAll ? 'ALL' : (document.getElementById('studentDeptFilter')?.value || 'ALL');
  const yearSec = viewAll ? 'ALL' : (document.getElementById('studentSecFilter')?.value || 'ALL');
  const accommodation = viewAll ? 'ALL' : (document.getElementById('studentAccomFilter')?.value || 'ALL');

  try {
    const q = new URLSearchParams({
      search,
      academicYear,
      dept,
      yearSec,
      accommodation,
      all: viewAll ? 'true' : 'false',
      limit: viewAll ? 5000 : 200
    });
    const res = await fetch(`/api/admin/students?${q.toString()}`);
    const data = await res.json();

    if (!data.success || !data.students || data.students.length === 0) {
      currentStudentsList = [];
      if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-slate-500 font-mono">No matching student records found.</td></tr>`;
      if (countBadge) countBadge.innerText = '0 students';
      return;
    }

    currentStudentsList = data.students;
    if (countBadge) countBadge.innerText = `${data.total || data.students.length} students`;

    if (tbody) {
      tbody.innerHTML = data.students.map(s => `
        <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/60">
          <td class="px-4 py-3 font-mono font-bold text-red-400">${escapeHtml(s.rollNo)}</td>
          <td class="px-4 py-3 font-semibold text-white">${escapeHtml(s.name)}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              ${escapeHtml(s.academicYear || '3rd Year')}
            </span>
          </td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
              ${escapeHtml(s.dept)}
            </span>
          </td>
          <td class="px-4 py-3 font-mono text-indigo-300 font-bold">Sec ${escapeHtml(s.yearSec)}</td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
              /^female$/i.test(s.gender || '') ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }">${escapeHtml(s.gender || 'Male')}</span>
          </td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
              (/hoste?l|^h$/i.test(s.accommodation) && !/day/i.test(s.accommodation)) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
            }">${escapeHtml(s.accommodation)}</span>
          </td>
          <td class="px-4 py-3 text-emerald-400 font-semibold">${escapeHtml(s.counselorName || '-')}</td>
          <td class="px-4 py-3 text-slate-200">${escapeHtml(s.parentName || '-')}</td>
          <td class="px-4 py-3 font-mono text-slate-300">${escapeHtml(s.parentContact || '-')}</td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="openEditStudentModal('${s._id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition border border-slate-700 shadow-sm" title="Edit Student">Edit</button>
              <button onclick="openResetPasswordModal('${s._id}', '${escapeAttr(s.name)}', '${escapeAttr(s.rollNo)}', 'student')" class="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition border border-amber-500/30 shadow-sm" title="Reset Password">Password</button>
              <button onclick="confirmDeleteStudent('${s._id}', '${escapeAttr(s.name)}', '${escapeAttr(s.rollNo)}')" class="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold transition border border-rose-500/30 shadow-sm" title="Delete Student">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-rose-400">Failed to load student registry.</td></tr>`;
  }
}

/**
 * Clear All Student Data Confirmation & Execution
 */
function confirmAndClearAllStudents() {
  showConfirmModal({
    title: 'Permanently Clear All Student Data?',
    message: 'Are you sure you want to permanently delete all student data? This action will remove all student records, registration credentials, and login accounts from the database. This action cannot be undone.',
    confirmText: 'Yes, Delete All Student Data',
    confirmColor: 'rose',
    onConfirm: async () => {
      try {
        const res = await fetch('/api/admin/students/clear-all', {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          showToast(data.message || 'All student data cleared successfully.', 'success', 3500);
          currentStudentsList = [];
          refreshAdminData();
        } else {
          showToast(data.message || 'Failed to clear student data.', 'error', 3500);
        }
      } catch (err) {
        showToast('Network error while clearing student data.', 'error', 3500);
      }
    }
  });
}

/**
 * Load All Staff & Categorized Views
 */
async function loadAdminStaff() {
  try {
    const res = await fetch('/api/admin/staff');
    const data = await res.json();
    if (!data.success || !data.staff) return;

    const staff = data.staff;

    // 1. Counselors
    const counselors = staff.filter(s => s.role === 'counselor');
    const counselorBody = document.getElementById('adminCounselorsTableBody');
    if (counselorBody) {
      if (counselors.length === 0) {
        counselorBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500 font-mono">No counselors assigned yet. Click "+ Assign New Counselor" above.</td></tr>`;
      } else {
        counselorBody.innerHTML = counselors.map(c => `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="px-4 py-3 font-semibold text-white">${escapeHtml(c.name)}</td>
            <td class="px-4 py-3 font-mono text-emerald-400 font-bold">${escapeHtml(c.userId)}</td>
            <td class="px-4 py-3 font-mono">
              <div class="inline-flex items-center gap-1.5 font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                <span>${escapeHtml(c.startRoll || 'Start')} – ${escapeHtml(c.endRoll || 'End')}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-300">${escapeHtml(c.dept || 'CSE')}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openResetPasswordModal('${c._id}', '${escapeAttr(c.name)}', '${escapeAttr(c.userId)}', 'staff')" class="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition">Reset Pass</button>
                <button onclick="confirmDeleteStaff('${c._id}', '${escapeAttr(c.name)}', '${escapeAttr(c.userId)}')" class="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold transition">Remove</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 2. Class Advisors
    const advisors = staff.filter(s => s.role === 'advisor');
    const advisorBody = document.getElementById('adminAdvisorsTableBody');
    if (advisorBody) {
      if (advisors.length === 0) {
        advisorBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 font-mono">No class advisors assigned yet. Click "+ Assign Class Advisor" above.</td></tr>`;
      } else {
        advisorBody.innerHTML = advisors.map(a => `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="px-4 py-3 font-semibold text-white">${escapeHtml(a.name)}</td>
            <td class="px-4 py-3 font-mono text-indigo-400 font-bold">${escapeHtml(a.userId)}</td>
            <td class="px-4 py-3 text-slate-300 font-bold">${escapeHtml(a.dept)}</td>
            <td class="px-4 py-3 text-indigo-300 font-bold font-mono">Section ${escapeHtml(a.yearSec || 'A')}</td>
            <td class="px-4 py-3 text-slate-400 font-mono">${escapeHtml(a.academicYear || '3 Year')}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openResetPasswordModal('${a._id}', '${escapeAttr(a.name)}', '${escapeAttr(a.userId)}', 'staff')" class="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition">Reset Pass</button>
                <button onclick="confirmDeleteStaff('${a._id}', '${escapeAttr(a.name)}', '${escapeAttr(a.userId)}')" class="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold transition">Remove</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 3. HODs
    const hods = staff.filter(s => s.role === 'hod');
    const hodBody = document.getElementById('adminHodsTableBody');
    if (hodBody) {
      if (hods.length === 0) {
        hodBody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-500 font-mono">No department HODs assigned yet. Click "+ Assign Department HOD" above.</td></tr>`;
      } else {
        hodBody.innerHTML = hods.map(h => `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="px-4 py-3 font-semibold text-white">${escapeHtml(h.name)}</td>
            <td class="px-4 py-3 font-mono text-purple-400 font-bold">${escapeHtml(h.userId)}</td>
            <td class="px-4 py-3 text-purple-300 font-bold font-mono">Department of ${escapeHtml(h.dept)}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openResetPasswordModal('${h._id}', '${escapeAttr(h.name)}', '${escapeAttr(h.userId)}', 'staff')" class="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition">Reset Pass</button>
                <button onclick="confirmDeleteStaff('${h._id}', '${escapeAttr(h.name)}', '${escapeAttr(h.userId)}')" class="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold transition">Remove</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }

    // 4. Principal
    const principal = staff.find(s => s.role === 'principal');
    const principalCard = document.getElementById('adminPrincipalCard');
    if (principalCard) {
      if (principal) {
        principalCard.innerHTML = `
          <div>
            <div class="text-sm font-bold text-white flex items-center gap-2">
              <span>${escapeHtml(principal.name)}</span>
              <span class="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full uppercase font-mono">Active Principal</span>
            </div>
            <div class="text-xs text-slate-400 font-mono mt-0.5">Staff ID: <span class="text-red-400 font-bold">${escapeHtml(principal.userId)}</span></div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openResetPasswordModal('${principal._id}', '${escapeAttr(principal.name)}', '${escapeAttr(principal.userId)}', 'staff')" class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition">Reset Password</button>
            <button onclick="confirmDeleteStaff('${principal._id}', '${escapeAttr(principal.name)}', '${escapeAttr(principal.userId)}')" class="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition">Remove</button>
          </div>
        `;
      } else {
        principalCard.innerHTML = `
          <div class="text-xs text-slate-400">No Principal assigned currently. Click "Set / Update Principal" above.</div>
        `;
      }
    }

    // 5. Wardens
    const boysWarden = staff.find(s => s.role === 'boys_warden' || s.role === 'boys warden');
    const girlsWarden = staff.find(s => s.role === 'girls_warden' || s.role === 'girls warden');
    const bwCard = document.getElementById('adminBoysWardenCard');
    const gwCard = document.getElementById('adminGirlsWardenCard');

    if (bwCard) {
      if (boysWarden) {
        bwCard.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-teal-400 uppercase font-mono">Boys Hostel Warden</span>
            <span class="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono font-bold">Active</span>
          </div>
          <div class="text-sm font-bold text-white">${escapeHtml(boysWarden.name)}</div>
          <div class="text-xs text-slate-400 font-mono">Staff ID: <span class="text-teal-400 font-bold">${escapeHtml(boysWarden.userId)}</span></div>
          <div class="pt-2 flex gap-2">
            <button onclick="openAssignWardenModal('boys_warden')" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold transition border border-teal-500/30">Reassign</button>
            <button onclick="openResetPasswordModal('${boysWarden._id}', '${escapeAttr(boysWarden.name)}', '${escapeAttr(boysWarden.userId)}', 'staff')" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition">Password</button>
            <button onclick="confirmDeleteStaff('${boysWarden._id}', '${escapeAttr(boysWarden.name)}', '${escapeAttr(boysWarden.userId)}')" class="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition">Delete</button>
          </div>
        `;
      } else {
        bwCard.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-teal-400 uppercase font-mono">Boys Hostel Warden</span>
            <span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">Unassigned</span>
          </div>
          <div class="text-xs text-slate-400">Not assigned yet.</div>
          <div class="pt-2">
            <button onclick="openAssignWardenModal('boys_warden')" class="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-900/20">
              + Assign Boys Hostel Warden
            </button>
          </div>
        `;
      }
    }

    if (gwCard) {
      if (girlsWarden) {
        gwCard.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-400 uppercase font-mono">Girls Hostel Warden</span>
            <span class="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono font-bold">Active</span>
          </div>
          <div class="text-sm font-bold text-white">${escapeHtml(girlsWarden.name)}</div>
          <div class="text-xs text-slate-400 font-mono">Staff ID: <span class="text-rose-400 font-bold">${escapeHtml(girlsWarden.userId)}</span></div>
          <div class="pt-2 flex gap-2">
            <button onclick="openAssignWardenModal('girls_warden')" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-semibold transition border border-rose-500/30">Reassign</button>
            <button onclick="openResetPasswordModal('${girlsWarden._id}', '${escapeAttr(girlsWarden.name)}', '${escapeAttr(girlsWarden.userId)}', 'staff')" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition">Password</button>
            <button onclick="confirmDeleteStaff('${girlsWarden._id}', '${escapeAttr(girlsWarden.name)}', '${escapeAttr(girlsWarden.userId)}')" class="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition">Delete</button>
          </div>
        `;
      } else {
        gwCard.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-400 uppercase font-mono">Girls Hostel Warden</span>
            <span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">Unassigned</span>
          </div>
          <div class="text-xs text-slate-400">Not assigned yet.</div>
          <div class="pt-2">
            <button onclick="openAssignWardenModal('girls_warden')" class="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-900/20">
              + Assign Girls Hostel Warden
            </button>
          </div>
        `;
      }
    }

    // 6. Consolidated Staff Directory
    const allStaffBody = document.getElementById('adminAllStaffTableBody');
    if (allStaffBody) {
      allStaffBody.innerHTML = staff.map(s => {
        let details = '-';
        if (s.role === 'counselor') details = `Roll Range: <span class="font-mono text-amber-300 font-bold">${escapeHtml(s.startRoll || '')} - ${escapeHtml(s.endRoll || '')}</span>`;
        else if (s.role === 'advisor') details = `Dept: ${escapeHtml(s.dept)} - Sec ${escapeHtml(s.yearSec)} (${escapeHtml(s.academicYear || '')})`;
        else if (s.role === 'hod') details = `Dept: ${escapeHtml(s.dept)} Head`;
        else if (s.role === 'principal') details = `College-Wide Executive Directorate`;
        else if (s.role.includes('warden')) details = `Hostel Clearance Authority`;

        return `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="px-4 py-3 font-semibold text-white">${escapeHtml(s.name)}</td>
            <td class="px-4 py-3 font-mono text-emerald-400 font-bold">${escapeHtml(s.userId)}</td>
            <td class="px-4 py-3">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                s.role === 'principal' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                s.role === 'hod' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                s.role === 'advisor' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                s.role === 'counselor' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-teal-500/20 text-teal-400 border border-teal-500/30'
              }">${escapeHtml(s.role.replace('_', ' '))}</span>
            </td>
            <td class="px-4 py-3 text-slate-300 text-xs">${details}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openResetPasswordModal('${s._id}', '${escapeAttr(s.name)}', '${escapeAttr(s.userId)}', 'staff')" class="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition">Reset Pass</button>
                <button onclick="confirmDeleteStaff('${s._id}', '${escapeAttr(s.name)}', '${escapeAttr(s.userId)}')" class="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold transition">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

  } catch (err) {
    console.error('Staff loading error:', err);
  }
}

/**
 * Universal Modal Helper Functions
 */
function openAdminModal(htmlContent) {
  const overlay = document.getElementById('adminModalOverlay');
  const content = document.getElementById('adminModalContent');
  if (overlay && content) {
    content.innerHTML = htmlContent;
    overlay.classList.remove('hidden');
  }
}

function closeAdminModal() {
  const overlay = document.getElementById('adminModalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

/**
 * ADD STUDENT MODAL
 */
function openAddStudentModal() {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Add Student Profile</h3>
          <p class="text-[11px] text-slate-400">Create new student record and login account</p>
        </div>
      </div>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitAddStudent();" class="space-y-3.5 text-xs">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Student Registration Number *</label>
          <input type="text" id="addStuRoll" required placeholder="Enter Registration Number" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500 focus:outline-none transition">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Student Name *</label>
          <input type="text" id="addStuName" required placeholder="Enter Student Full Name" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Academic Year *</label>
          <select id="addStuYear" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year" selected>3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Department *</label>
          <select id="addStuDept" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
            <option value="CSE">CSE</option>
            <option value="AIDS">AIDS</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="IT">IT</option>
            <option value="CIVIL">CIVIL</option>
            <option value="EEE">EEE</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Section *</label>
          <select id="addStuSec" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Gender *</label>
          <select id="addStuGender" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
            <option value="Male" selected>Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Accommodation *</label>
          <select id="addStuAccom" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
            <option value="Days Scholar">Days Scholar</option>
            <option value="Hosteller">Hosteller</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1 flex items-center justify-between">
          <span>Assign Counsellor</span>
          <span class="text-[10px] text-slate-500 font-normal">Type Counsellor Name</span>
        </label>
        <input type="text" id="addStuCounselor" placeholder="Enter Counsellor Name (optional)" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Father's / Parent's Name *</label>
          <input type="text" id="addStuParentName" required placeholder="Enter Father's / Parent Full Name" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500 focus:outline-none transition">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Parent Phone Number *</label>
          <input type="text" id="addStuParent" required placeholder="Enter Parent Phone Number" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500 focus:outline-none transition">
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Assigned Login Password *</label>
        <input type="password" id="addStuPass" required placeholder="Enter student login password" value="" autocomplete="new-password" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500 focus:outline-none transition">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold transition shadow-md shadow-red-900/30">Save Student</button>
      </div>
    </form>
  `);
}

async function submitAddStudent() {
  const body = {
    name: document.getElementById('addStuName')?.value?.trim(),
    rollNo: document.getElementById('addStuRoll')?.value?.trim(),
    dept: document.getElementById('addStuDept')?.value,
    academicYear: document.getElementById('addStuYear')?.value || '3rd Year',
    yearSec: document.getElementById('addStuSec')?.value,
    accommodation: document.getElementById('addStuAccom')?.value,
    gender: document.getElementById('addStuGender')?.value || 'Male',
    counselorName: document.getElementById('addStuCounselor')?.value?.trim() || '-',
    parentName: document.getElementById('addStuParentName')?.value?.trim() || '-',
    parentContact: document.getElementById('addStuParent')?.value?.trim(),
    password: document.getElementById('addStuPass')?.value
  };

  try {
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Failed to create student.', 'error', 3500);
    }
  } catch (err) {
    showToast('Network error while saving student.', 'error', 3500);
  }
}

/**
 * EDIT STUDENT MODAL
 */
async function openEditStudentModal(id) {
  let student = currentStudentsList.find(s => String(s._id) === String(id));

  if (!student) {
    try {
      const res = await fetch(`/api/admin/students?search=${id}`);
      const data = await res.json();
      if (data.success && data.students && data.students.length > 0) {
        student = data.students[0];
      }
    } catch (e) {
      console.error('Fetch student error:', e);
    }
  }

  if (!student) {
    showToast('Student record not found.', 'error');
    return;
  }

  const stuYear = student.academicYear || '3rd Year';

  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Edit Student Information</h3>
          <p class="text-[11px] text-slate-400">Modify student record, academic standing, and update database</p>
        </div>
      </div>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitEditStudent('${student._id}');" class="space-y-3.5 text-xs">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Student Registration Number</label>
          <input type="text" id="editStuRoll" readonly value="${escapeAttr(student.rollNo)}" class="w-full p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-red-400 font-mono font-bold cursor-not-allowed">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Student Name *</label>
          <input type="text" id="editStuName" required value="${escapeAttr(student.name)}" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Academic Year *</label>
          <select id="editStuYear" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
            <option value="1st Year" ${/1/i.test(stuYear) ? 'selected' : ''}>1st Year</option>
            <option value="2nd Year" ${/2/i.test(stuYear) ? 'selected' : ''}>2nd Year</option>
            <option value="3rd Year" ${/3/i.test(stuYear) ? 'selected' : ''}>3rd Year</option>
            <option value="4th Year" ${/4/i.test(stuYear) ? 'selected' : ''}>4th Year</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Department *</label>
          <select id="editStuDept" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
            <option value="CSE" ${student.dept === 'CSE' ? 'selected' : ''}>CSE</option>
            <option value="AIDS" ${student.dept === 'AIDS' || student.dept === 'AI&DS' ? 'selected' : ''}>AIDS</option>
            <option value="ECE" ${student.dept === 'ECE' ? 'selected' : ''}>ECE</option>
            <option value="MECH" ${student.dept === 'MECH' ? 'selected' : ''}>MECH</option>
            <option value="IT" ${student.dept === 'IT' ? 'selected' : ''}>IT</option>
            <option value="CIVIL" ${student.dept === 'CIVIL' ? 'selected' : ''}>CIVIL</option>
            <option value="EEE" ${student.dept === 'EEE' ? 'selected' : ''}>EEE</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Section *</label>
          <select id="editStuSec" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
            <option value="A" ${student.yearSec === 'A' ? 'selected' : ''}>Section A</option>
            <option value="B" ${student.yearSec === 'B' ? 'selected' : ''}>Section B</option>
            <option value="C" ${student.yearSec === 'C' ? 'selected' : ''}>Section C</option>
            <option value="D" ${student.yearSec === 'D' ? 'selected' : ''}>Section D</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Gender *</label>
          <select id="editStuGender" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
            <option value="Male" ${/^m/i.test(student.gender || '') ? 'selected' : ''}>Male</option>
            <option value="Female" ${/^f/i.test(student.gender || '') ? 'selected' : ''}>Female</option>
            <option value="Other" ${student.gender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Accommodation *</label>
          <select id="editStuAccom" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
            <option value="Days Scholar" ${!(/hoste?l|^h$/i.test(student.accommodation) && !/day/i.test(student.accommodation)) ? 'selected' : ''}>Days Scholar</option>
            <option value="Hosteller" ${(/hoste?l|^h$/i.test(student.accommodation) && !/day/i.test(student.accommodation)) ? 'selected' : ''}>Hosteller</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1 flex items-center justify-between">
          <span>Assign Counsellor</span>
          <span class="text-[10px] text-slate-500 font-normal">Type Counsellor Name</span>
        </label>
        <input type="text" id="editStuCounselor" value="${escapeAttr(student.counselorName || '')}" placeholder="Enter Counsellor Name" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Father's / Parent's Name *</label>
          <input type="text" id="editStuParentName" required value="${escapeAttr(student.parentName || '')}" placeholder="Enter Father's / Parent Name" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:outline-none transition">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Parent Phone Number *</label>
          <input type="text" id="editStuParent" required value="${escapeAttr(student.parentContact || '')}" placeholder="Enter Parent Phone Number" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-500 focus:outline-none transition">
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition shadow-md shadow-amber-900/30">Save Changes</button>
      </div>
    </form>
  `);
}

async function submitEditStudent(id) {
  const body = {
    name: document.getElementById('editStuName')?.value?.trim(),
    academicYear: document.getElementById('editStuYear')?.value,
    dept: document.getElementById('editStuDept')?.value,
    yearSec: document.getElementById('editStuSec')?.value,
    accommodation: document.getElementById('editStuAccom')?.value,
    gender: document.getElementById('editStuGender')?.value || 'Male',
    counselorName: document.getElementById('editStuCounselor')?.value?.trim() || '-',
    parentName: document.getElementById('editStuParentName')?.value?.trim() || '-',
    parentContact: document.getElementById('editStuParent')?.value?.trim()
  };

  try {
    const res = await fetch(`/api/admin/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Student updated successfully!', 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Failed to update student.', 'error', 3500);
    }
  } catch (err) {
    showToast('Network error while updating student.', 'error', 3500);
  }
}

/**
 * IMPORT EXCEL MODAL
 */
const DEPARTMENT_SECTIONS = {
  'CSE': ['A', 'B'],
  'AIDS': ['A', 'B'],
  'AI&DS': ['A', 'B'],
  'ECE': ['A', 'B'],
  'MECH': ['A', 'B'],
  'IT': ['A', 'B'],
  'CIVIL': ['A', 'B'],
  'EEE': ['A', 'B']
};

/**
 * Handle Department change to dynamically update available sections
 */
function handleImportDeptChange(deptVal) {
  const secSelect = document.getElementById('importSection');
  const errorBox = document.getElementById('bulkUploadError');
  if (errorBox) errorBox.classList.add('hidden');
  if (!secSelect) return;

  if (!deptVal) {
    secSelect.disabled = true;
    secSelect.innerHTML = '<option value="" disabled selected>-- Select Department First --</option>';
    return;
  }

  const sections = DEPARTMENT_SECTIONS[deptVal] || ['A', 'B'];
  secSelect.disabled = false;
  secSelect.innerHTML = `
    <option value="" disabled selected>-- Select Section --</option>
    ${sections.map(s => `<option value="${s}">Section ${s}</option>`).join('')}
  `;
}

/**
 * Handle File selection preview & extension validation
 */
function handleImportFileChange(input) {
  const file = input && input.files ? input.files[0] : null;
  const nameDisplay = document.getElementById('selectedFileName');
  const sizeDisplay = document.getElementById('selectedFileSize');
  const badge = document.getElementById('fileStatusBadge');
  const errorBox = document.getElementById('bulkUploadError');
  if (errorBox) errorBox.classList.add('hidden');

  if (!file) {
    if (nameDisplay) nameDisplay.innerText = 'No file chosen yet';
    if (sizeDisplay) sizeDisplay.innerText = '';
    if (badge) badge.classList.add('hidden');
    return;
  }

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    showBulkUploadError(`Unsupported file format (.${ext}). Please select an Excel (.xlsx, .xls) or CSV (.csv) file.`);
    input.value = '';
    if (nameDisplay) nameDisplay.innerText = 'No file chosen yet';
    if (sizeDisplay) sizeDisplay.innerText = '';
    if (badge) badge.classList.add('hidden');
    return;
  }

  const sizeKb = (file.size / 1024).toFixed(1);
  if (nameDisplay) nameDisplay.innerText = file.name;
  if (sizeDisplay) sizeDisplay.innerText = `(${sizeKb} KB)`;
  if (badge) {
    badge.innerText = `.${ext.toUpperCase()} READY`;
    badge.classList.remove('hidden');
  }
}

function showBulkUploadError(msg) {
  const errorBox = document.getElementById('bulkUploadError');
  if (errorBox) {
    errorBox.innerText = msg;
    errorBox.classList.remove('hidden');
  } else {
    showToast(msg, 'warning', 3500);
  }
}

/**
 * BULK STUDENT DATA UPLOAD MODAL
 */
function openImportExcelModal() {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-white">Bulk Student Data Upload</h3>
          <p class="text-[11px] text-slate-400">Import student roster and assign Year, Department & Section</p>
        </div>
      </div>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <!-- Error Alert Box -->
    <div id="bulkUploadError" class="hidden p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold leading-relaxed"></div>

    <form onsubmit="event.preventDefault(); submitImportExcel(event);" class="space-y-4 text-xs">
      
      <!-- Academic Year Selection -->
      <div>
        <label for="importAcademicYear" class="block font-bold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>1. Academic Year *</span>
          <span class="text-[10px] text-slate-500 font-normal">Select student batch year</span>
        </label>
        <select
          id="importAcademicYear"
          required
          class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
        >
          <option value="" disabled selected>-- Select Academic Year --</option>
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
        </select>
      </div>

      <!-- Department & Dynamic Section Selection -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="importDepartment" class="block font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>2. Department *</span>
            <span class="text-[10px] text-slate-500 font-normal">Engineering Branch</span>
          </label>
          <select
            id="importDepartment"
            required
            onchange="handleImportDeptChange(this.value)"
            class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          >
            <option value="" disabled selected>-- Select Department --</option>
            <option value="CSE">CSE (Computer Science)</option>
            <option value="AIDS">AIDS (AI & Data Science)</option>
            <option value="ECE">ECE (Electronics & Comm.)</option>
            <option value="MECH">MECH (Mechanical)</option>
            <option value="IT">IT (Information Technology)</option>
            <option value="CIVIL">CIVIL (Civil Engineering)</option>
            <option value="EEE">EEE (Electrical & Electronics)</option>
          </select>
        </div>

        <div>
          <label for="importSection" class="block font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>3. Section *</span>
            <span class="text-[10px] text-slate-500 font-normal">Based on Dept</span>
          </label>
          <select
            id="importSection"
            required
            disabled
            class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <option value="" disabled selected>-- Select Department First --</option>
          </select>
        </div>
      </div>

      <!-- File Upload Card -->
      <div>
        <label class="block font-bold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>4. Choose Student Data File (.xlsx, .xls, .csv) *</span>
          <span class="text-[10px] text-slate-500 font-normal">Max 10 MB</span>
        </label>
        <div class="p-3.5 bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl transition space-y-2.5">
          <input
            type="file"
            id="importFileInput"
            required
            accept=".xlsx, .xls, .csv"
            onchange="handleImportFileChange(this)"
            class="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600/20 file:text-emerald-400 hover:file:bg-emerald-600/30 file:cursor-pointer cursor-pointer"
          >
          <div class="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            <div class="flex items-center gap-1.5 truncate">
              <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span id="selectedFileName" class="text-white font-medium truncate">No file chosen yet</span>
              <span id="selectedFileSize" class="text-slate-500 text-[10px]"></span>
            </div>
            <span id="fileStatusBadge" class="hidden px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[9px] font-bold shrink-0">
              READY
            </span>
          </div>
        </div>
      </div>

      <!-- Initial Password for New Accounts -->
      <div>
        <label class="block text-slate-300 font-bold mb-1">Default Password for Created Accounts</label>
        <input
          type="text"
          id="importDefaultPass"
          value="Student@123"
          class="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
        <p class="text-[10px] text-slate-500 mt-1">Students can change this password upon their first login.</p>
      </div>

      <!-- Submit Buttons -->
      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onclick="closeAdminModal()"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          id="importSubmitBtn"
          class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/30 active:scale-95"
        >
          <span>Upload & Import Records</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    </form>
  `);
}

async function submitImportExcel(e) {
  if (e && e.preventDefault) e.preventDefault();

  const errorBox = document.getElementById('bulkUploadError');
  if (errorBox) errorBox.classList.add('hidden');

  const yearSelect = document.getElementById('importAcademicYear');
  const deptSelect = document.getElementById('importDepartment');
  const secSelect = document.getElementById('importSection');
  const fileInput = document.getElementById('importFileInput');
  const defaultPass = (document.getElementById('importDefaultPass')?.value || '').trim() || 'Student@123';
  const btn = document.getElementById('importSubmitBtn');

  const academicYear = yearSelect?.value;
  const dept = deptSelect?.value;
  const yearSec = secSelect?.value;

  // Validation
  if (!academicYear) {
    showBulkUploadError('Please select an Academic Year (e.g. 1st Year, 2nd Year, 3rd Year, 4th Year).');
    yearSelect?.focus();
    return;
  }

  if (!dept) {
    showBulkUploadError('Please select a Department from the dropdown.');
    deptSelect?.focus();
    return;
  }

  if (!yearSec) {
    showBulkUploadError('Please select a Section (e.g. Section A, Section B).');
    secSelect?.focus();
    return;
  }

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showBulkUploadError('Please choose a student data file (.xlsx, .xls, .csv) to upload.');
    fileInput?.focus();
    return;
  }

  const file = fileInput.files[0];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    showBulkUploadError(`Invalid file type (.${ext}). Please select an Excel (.xlsx, .xls) or CSV (.csv) file.`);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('academicYear', academicYear);
  formData.append('dept', dept);
  formData.append('yearSec', yearSec);
  formData.append('defaultPassword', defaultPass);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Processing ${escapeHtml(dept)} Sec ${escapeHtml(yearSec)}...</span>
    `;
  }

  try {
    const res = await fetch('/api/admin/students/import', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      showBulkUploadError(data.message || 'Upload and import failed. Please check spreadsheet format.');
      return;
    }

    showToast(data.message || `Imported ${data.importedCount} students successfully!`, 'success', 4500);
    closeAdminModal();
    refreshAdminData();

  } catch (err) {
    console.error('Import error:', err);
    showBulkUploadError('Network or server error occurred while uploading spreadsheet.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>Upload & Import Records</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
    }
  }
}

/**
 * ASSIGN COUNSELOR MODAL
 */
function openAssignCounselorModal() {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>Assign Counselor to Student Roll Range</span>
      </h3>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitAssignCounselor();" autocomplete="off" class="space-y-3.5 text-xs">
      <!-- Decoy inputs to prevent browser autofill -->
      <input type="text" name="prevent_autofill_cns_user" style="display:none" tabindex="-1">
      <input type="password" name="prevent_autofill_cns_pwd" style="display:none" tabindex="-1">

      <div>
        <label class="block font-bold text-slate-300 mb-1">Counselor Faculty Name *</label>
        <input type="text" id="cnsName" required placeholder="Enter Faculty Name" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Faculty ID / Login ID *</label>
          <input type="text" id="cnsUserId" required placeholder="Enter Faculty ID / Login ID" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-emerald-500">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Department</label>
          <select id="cnsDept" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-emerald-500">
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="IT">IT</option>
            <option value="AI&DS">AI&DS</option>
          </select>
        </div>
      </div>

      <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
        <label class="block font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
          Student Roll Number Range Assignment
        </label>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Starting Roll Number *</label>
            <input type="text" id="cnsStartRoll" required placeholder="Enter Starting Roll No" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none transition">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Ending Roll Number *</label>
            <input type="text" id="cnsEndRoll" required placeholder="Enter Ending Roll No" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none transition">
          </div>
        </div>

        <p class="text-[10px] text-slate-400">All students within this roll number range will be assigned to this Counselor.</p>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Assign Login Password *</label>
        <input type="password" id="cnsPass" required placeholder="Enter Login Password" autocomplete="new-password" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-emerald-500">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-md shadow-emerald-900/30">Assign & Create Account</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    ['cnsName', 'cnsUserId', 'cnsStartRoll', 'cnsEndRoll', 'cnsPass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 50);
}

async function submitAssignCounselor() {
  const body = {
    name: document.getElementById('cnsName')?.value?.trim(),
    userId: document.getElementById('cnsUserId')?.value?.trim(),
    dept: document.getElementById('cnsDept')?.value,
    startRoll: document.getElementById('cnsStartRoll')?.value?.trim(),
    endRoll: document.getElementById('cnsEndRoll')?.value?.trim(),
    password: document.getElementById('cnsPass')?.value
  };

  try {
    const res = await fetch('/api/admin/staff/counselor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Assignment failed.', 'error', 3500);
    }
  } catch (err) {
    showToast('Failed to assign counselor.', 'error', 3500);
  }
}

/**
 * ASSIGN CLASS ADVISOR MODAL
 */
function openAssignAdvisorModal() {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>Assign Class Advisor</span>
      </h3>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitAssignAdvisor();" autocomplete="off" class="space-y-3.5 text-xs">
      <!-- Decoy inputs to prevent browser autofill -->
      <input type="text" name="prevent_autofill_adv_user" style="display:none" tabindex="-1">
      <input type="password" name="prevent_autofill_adv_pwd" style="display:none" tabindex="-1">

      <div>
        <label class="block font-bold text-slate-300 mb-1">Faculty Full Name *</label>
        <input type="text" id="advName" required placeholder="Enter Faculty Name" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500">
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Faculty ID / Login ID *</label>
        <input type="text" id="advUserId" required placeholder="Enter Faculty ID / Login ID" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-indigo-500">
      </div>

      <div class="grid grid-cols-3 gap-2.5">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Department *</label>
          <select id="advDept" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500">
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="IT">IT</option>
            <option value="AI&DS">AI&DS</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Section *</label>
          <select id="advSec" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500">
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Academic Year</label>
          <select id="advYear" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500">
            <option value="I Year">I Year</option>
            <option value="II Year">II Year</option>
            <option value="III Year" selected>III Year</option>
            <option value="IV Year">IV Year</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Assign Login Password *</label>
        <input type="password" id="advPass" required placeholder="Enter Login Password" autocomplete="new-password" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-indigo-500">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition">Assign Class Advisor</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    ['advName', 'advUserId', 'advPass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 50);
}

async function submitAssignAdvisor() {
  const body = {
    name: document.getElementById('advName')?.value?.trim(),
    userId: document.getElementById('advUserId')?.value?.trim(),
    dept: document.getElementById('advDept')?.value,
    yearSec: document.getElementById('advSec')?.value,
    academicYear: document.getElementById('advYear')?.value,
    password: document.getElementById('advPass')?.value
  };

  try {
    const res = await fetch('/api/admin/staff/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Assignment failed.', 'error', 3500);
    }
  } catch (err) {
    showToast('Failed to assign advisor.', 'error', 3500);
  }
}

/**
 * ASSIGN HOD MODAL
 */
function openAssignHodModal() {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>Assign Department Head (HOD)</span>
      </h3>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitAssignHod();" autocomplete="off" class="space-y-3.5 text-xs">
      <!-- Decoy inputs to prevent browser autofill -->
      <input type="text" name="prevent_autofill_hod_user" style="display:none" tabindex="-1">
      <input type="password" name="prevent_autofill_hod_pwd" style="display:none" tabindex="-1">

      <div>
        <label class="block font-bold text-slate-300 mb-1">HOD Faculty Full Name *</label>
        <input type="text" id="hodName" required placeholder="Enter Faculty Name" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-purple-500">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Faculty ID / Login ID *</label>
          <input type="text" id="hodUserId" required placeholder="Enter Faculty ID / Login ID" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-purple-500">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Department *</label>
          <select id="hodDept" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-purple-500">
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="IT">IT</option>
            <option value="AI&DS">AI&DS</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Assign Login Password *</label>
        <input type="password" id="hodPass" required placeholder="Enter Login Password" autocomplete="new-password" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-purple-500">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition">Assign HOD</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    ['hodName', 'hodUserId', 'hodPass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 50);
}

async function submitAssignHod() {
  const body = {
    name: document.getElementById('hodName')?.value?.trim(),
    userId: document.getElementById('hodUserId')?.value?.trim(),
    dept: document.getElementById('hodDept')?.value,
    password: document.getElementById('hodPass')?.value
  };

  try {
    const res = await fetch('/api/admin/staff/hod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Assignment failed.', 'error', 3500);
    }
  } catch (err) {
    showToast('Failed to assign HOD.', 'error', 3500);
  }
}

/**
 * ASSIGN PRINCIPAL MODAL
 */
function openAssignPrincipalModal() {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>Assign Principal Directorate</span>
      </h3>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitAssignPrincipal();" autocomplete="off" class="space-y-3.5 text-xs">
      <!-- Decoy inputs to prevent browser autofill -->
      <input type="text" name="prevent_autofill_prin_user" style="display:none" tabindex="-1">
      <input type="password" name="prevent_autofill_prin_pwd" style="display:none" tabindex="-1">

      <div>
        <label class="block font-bold text-slate-300 mb-1">Principal Full Name *</label>
        <input type="text" id="prinName" required placeholder="Enter Principal Full Name" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-red-500">
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Faculty ID / Login ID *</label>
        <input type="text" id="prinUserId" required placeholder="Enter Faculty ID / Login ID" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500">
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Assign Login Password *</label>
        <input type="password" id="prinPass" required placeholder="Enter Login Password" autocomplete="new-password" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-red-500">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition">Assign Principal Account</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    ['prinName', 'prinUserId', 'prinPass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 50);
}

async function submitAssignPrincipal() {
  const body = {
    name: document.getElementById('prinName')?.value?.trim(),
    userId: document.getElementById('prinUserId')?.value?.trim(),
    password: document.getElementById('prinPass')?.value
  };

  try {
    const res = await fetch('/api/admin/staff/principal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Assignment failed.', 'error', 3500);
    }
  } catch (err) {
    showToast('Failed to assign Principal.', 'error', 3500);
  }
}

/**
 * ASSIGN WARDEN MODAL (SEPARATE BOYS & GIRLS WARDEN)
 */
function openAssignWardenModal(defaultType = 'boys_warden') {
  const isGirls = defaultType === 'girls_warden';
  const modalTitle = isGirls ? 'Assign Girls Hostel Warden' : 'Assign Boys Hostel Warden';
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span id="wardenModalTitle">${modalTitle}</span>
      </h3>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitAssignWarden();" autocomplete="off" class="space-y-3.5 text-xs">
      <!-- Decoy inputs to prevent browser autofill -->
      <input type="text" name="prevent_autofill_wdn_user" style="display:none" tabindex="-1">
      <input type="password" name="prevent_autofill_wdn_pwd" style="display:none" tabindex="-1">

      <div>
        <label class="block font-bold text-slate-300 mb-1">Warden Full Name *</label>
        <input type="text" id="wdnName" required placeholder="Enter Warden Full Name" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-teal-500">
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-slate-300 mb-1">Faculty ID / Login ID *</label>
          <input type="text" id="wdnUserId" required placeholder="Enter Faculty ID / Login ID" autocomplete="off" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-teal-500">
        </div>
        <div>
          <label class="block font-bold text-slate-300 mb-1">Hostel Jurisdiction *</label>
          <select id="wdnType" onchange="updateWardenModalTitle(this.value)" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-teal-500">
            <option value="boys_warden" ${!isGirls ? 'selected' : ''}>Boys Hostel Warden</option>
            <option value="girls_warden" ${isGirls ? 'selected' : ''}>Girls Hostel Warden</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1">Assign Login Password *</label>
        <input type="password" id="wdnPass" required placeholder="Enter Login Password" autocomplete="new-password" value="" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-teal-500">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition">Assign Warden Account</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    ['wdnName', 'wdnUserId', 'wdnPass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 50);
}

function updateWardenModalTitle(type) {
  const titleEl = document.getElementById('wardenModalTitle');
  if (titleEl) {
    titleEl.textContent = type === 'girls_warden' ? 'Assign Girls Hostel Warden' : 'Assign Boys Hostel Warden';
  }
}

async function submitAssignWarden() {
  const body = {
    name: document.getElementById('wdnName')?.value,
    userId: document.getElementById('wdnUserId')?.value,
    wardenType: document.getElementById('wdnType')?.value,
    password: document.getElementById('wdnPass')?.value
  };

  try {
    const res = await fetch('/api/admin/staff/warden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
      refreshAdminData();
    } else {
      showToast(data.message || 'Assignment failed.', 'error', 3500);
    }
  } catch (err) {
    showToast('Failed to assign warden.', 'error', 3500);
  }
}

/**
 * RESET PASSWORD MODAL (UNIVERSAL FOR STUDENT & STAFF)
 */
function openResetPasswordModal(id, name, identifier, type = 'student') {
  openAdminModal(`
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span>Reset Password</span>
      </h3>
      <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition" aria-label="Close dialog"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
    </div>

    <form onsubmit="event.preventDefault(); submitResetPassword('${id}', '${type}');" class="space-y-4 text-xs">
      <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl">
        <div class="text-slate-400">Target User: <span class="text-white font-bold">${escapeHtml(name)}</span></div>
        <div class="text-slate-400">ID / Register No: <span class="text-red-400 font-mono font-bold">${escapeHtml(identifier)}</span></div>
      </div>

      <div>
        <label class="block font-bold text-slate-300 mb-1.5">New Password *</label>
        <input type="password" id="newResetPass" required placeholder="Enter new password (min 4 chars)" class="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-500">
      </div>

      <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
        <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition">Update Password</button>
      </div>
    </form>
  `);
}

async function submitResetPassword(id, type) {
  const newPassword = document.getElementById('newResetPass')?.value;
  if (!newPassword) return;

  const url = type === 'student' ? `/api/admin/students/${id}/reset-password` : `/api/admin/staff/${id}/reset-password`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success', 3500);
      closeAdminModal();
    } else {
      showToast(data.message || 'Password reset failed.', 'error', 3500);
    }
  } catch (err) {
    showToast('Failed to reset password.', 'error', 3500);
  }
}

/**
 * DELETE CONFIRMATIONS
 */
function confirmDeleteStudent(id, name, rollNo) {
  showConfirmModal({
    title: 'Delete Student Record?',
    message: `Are you sure you want to delete student ${name} (${rollNo}) and their login credentials from the database? This action cannot be undone.`,
    confirmText: 'Delete Student',
    confirmColor: 'rose',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success', 3000);
          refreshAdminData();
        } else {
          showToast(data.message || 'Failed to delete student.', 'error', 3500);
        }
      } catch (err) {
        showToast('Error deleting student.', 'error', 3500);
      }
    }
  });
}

function confirmDeleteStaff(id, name, userId) {
  showConfirmModal({
    title: 'Remove Staff Account?',
    message: `Are you sure you want to deactivate and remove staff member ${name} (${userId})?`,
    confirmText: 'Remove Staff',
    confirmColor: 'rose',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success', 3000);
          refreshAdminData();
        } else {
          showToast(data.message || 'Failed to remove staff.', 'error', 3500);
        }
      } catch (err) {
        showToast('Error removing staff account.', 'error', 3500);
      }
    }
  });
}

// Global window bindings
window.handleAdminLogin = handleAdminLogin;
window.adminLogout = adminLogout;
window.switchAdminTab = switchAdminTab;
window.refreshAdminData = refreshAdminData;
window.loadAdminStudents = loadAdminStudents;
window.confirmAndClearAllStudents = confirmAndClearAllStudents;
window.openAddStudentModal = openAddStudentModal;
window.submitAddStudent = submitAddStudent;
window.openEditStudentModal = openEditStudentModal;
window.submitEditStudent = submitEditStudent;
window.openImportExcelModal = openImportExcelModal;
window.handleImportDeptChange = handleImportDeptChange;
window.handleImportFileChange = handleImportFileChange;
window.submitImportExcel = submitImportExcel;
window.openAssignCounselorModal = openAssignCounselorModal;
window.submitAssignCounselor = submitAssignCounselor;
window.openAssignAdvisorModal = openAssignAdvisorModal;
window.submitAssignAdvisor = submitAssignAdvisor;
window.openAssignHodModal = openAssignHodModal;
window.submitAssignHod = submitAssignHod;
window.openAssignPrincipalModal = openAssignPrincipalModal;
window.submitAssignPrincipal = submitAssignPrincipal;
window.openAssignWardenModal = openAssignWardenModal;
window.submitAssignWarden = submitAssignWarden;
window.openResetPasswordModal = openResetPasswordModal;
window.submitResetPassword = submitResetPassword;
window.confirmDeleteStudent = confirmDeleteStudent;
window.confirmDeleteStaff = confirmDeleteStaff;
window.closeAdminModal = closeAdminModal;
